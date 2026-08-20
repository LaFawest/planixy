import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { erzeugeHolzTextur, erzeugeStoffTextur, erzeugeBodenTextur, erzeugeUmgebungsTextur } from './texturen'
import { baueTrennwaende } from './scene/trennwaende'
import { baueWandElement } from './scene/wandelemente'
import { baueMoebel } from './scene/moebel'
import { rechteckPolygon, boundingBox, wandSegmente } from './raumPolygon'
import { useRooms } from './context/RoomsContext'
import { useFurniture } from './context/FurnitureContext'
import { useDesign } from './context/DesignContext'

export default function RoomView3D() {
  const { activeRoom: room } = useRooms()
  const { furniture } = useFurniture()
  const { fussleiste, fussleisteFarbe, raumHoehe } = useDesign()
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#F5F4F0')
    scene.fog = new THREE.Fog('#F5F4F0', 20, 40)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(8, 10, 12)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.VSMShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const wandHoehe = raumHoehe || 2.5
    const eckpunkte = room?.eckpunkte || rechteckPolygon(room?.breite || 6, room?.tiefe || 5)
    // Breite/Tiefe und der 3D-Nullpunkt (Raummitte) kommen aus der Bounding-Box der Eckpunkte,
    // nicht mehr aus room.breite/tiefe direkt — für ein Rechteck deckungsgleich, aber robust
    // falls diese Felder bei einer L-Form (Schritt 9) nicht mehr die tatsächliche Ausdehnung
    // abbilden. wandelemente.js/trennwaende.js bekommen raumBreite/raumTiefe weiterhin als
    // Parameter durchgereicht und bleiben unverändert, da mitteX/mitteZ für Rechtecke exakt
    // raumBreite/2, raumTiefe/2 entsprechen.
    const box = boundingBox(eckpunkte)
    const raumBreite = box.breite
    const raumTiefe = box.tiefe
    const mitteX = box.minX + raumBreite / 2
    const mitteZ = box.minY + raumTiefe / 2

    // === TEXTUREN (einmal pro Szene erzeugt, mehrfach verwendet) ===
    const holzTextur = erzeugeHolzTextur()
    const stoffTextur = erzeugeStoffTextur()
    scene.environment = erzeugeUmgebungsTextur()

    // === BELEUCHTUNG ===
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.6)
    scene.add(ambientLight)

    // Schatten-Frustum an die tatsächliche Raumgröße anpassen (statt fixer ±10 Einheiten) –
    // so bleibt die Schattenkarte bei kleinen Räumen scharf und bei großen Räumen vollständig
    const schattenReichweite = Math.max(raumBreite, raumTiefe) / 2 + 2

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2)
    sunLight.position.set(raumBreite * 0.8, 8, raumTiefe * 0.8)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 4096
    sunLight.shadow.mapSize.height = 4096
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = schattenReichweite * 2 + 20
    sunLight.shadow.camera.left = -schattenReichweite
    sunLight.shadow.camera.right = schattenReichweite
    sunLight.shadow.camera.top = schattenReichweite
    sunLight.shadow.camera.bottom = -schattenReichweite
    sunLight.shadow.bias = -0.001
    sunLight.shadow.radius = 4
    sunLight.shadow.camera.updateProjectionMatrix()
    scene.add(sunLight)

    const windowLight = new THREE.DirectionalLight(0xc8e8ff, 0.6)
    windowLight.position.set(-raumBreite, 4, 0)
    scene.add(windowLight)

    const ceilingLight = new THREE.PointLight(0xfff8e6, 1.5, raumBreite * 3)
    ceilingLight.position.set(0, wandHoehe - 0.2, 0)
    ceilingLight.castShadow = true
    ceilingLight.shadow.mapSize.width = 1024
    ceilingLight.shadow.mapSize.height = 1024
    ceilingLight.shadow.bias = -0.002
    ceilingLight.shadow.radius = 3
    ceilingLight.shadow.camera.near = 0.1
    ceilingLight.shadow.camera.far = wandHoehe + Math.max(raumBreite, raumTiefe)
    scene.add(ceilingLight)

    const lampGeo = new THREE.SphereGeometry(0.12, 16, 16)
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffde0 })
    const lamp = new THREE.Mesh(lampGeo, lampMat)
    lamp.position.set(0, wandHoehe - 0.1, 0)
    scene.add(lamp)

    const fillLight = new THREE.HemisphereLight(0xffffff, 0xC8A97A, 0.3)
    scene.add(fillLight)

    // === BODEN & DECKE (aus dem Randpolygon, statt fester Rechteck-Ebenen) ===
    // THREE.Shape mit ShapeGeometry statt ExtrudeGeometry: Boden/Decke bleiben masselose
    // Flächen (keine Dicke), ShapeGeometry trianguliert per Ear-Clipping — das behandelt
    // konkave Ränder (L-/U-Form) automatisch korrekt, ohne Sonderfall.
    // Die Punkte werden mit gespiegeltem Y aufgebaut (mitteZ - p.y statt p.y - mitteZ): nur so
    // ergibt die anschließende Rotation um X dieselbe nach oben zeigende Normale wie die
    // bisherige PlaneGeometry (siehe Analyse Schritt 7). UV-Koordinaten normalisiert
    // ShapeGeometry automatisch auf die Bounding-Box der Form — für ein Rechteck deckungsgleich
    // mit PlaneGeometry, texture.repeat in erzeugeBodenTextur bleibt unverändert korrekt.
    const flaechenShape = new THREE.Shape(eckpunkte.map(p => new THREE.Vector2(p.x - mitteX, mitteZ - p.y)))
    const flaechenGeo = new THREE.ShapeGeometry(flaechenShape)

    const bodenMat = new THREE.MeshStandardMaterial({ map: erzeugeBodenTextur(room?.boden, raumBreite, raumTiefe), roughness: 0.8, metalness: 0.0 })
    const boden = new THREE.Mesh(flaechenGeo, bodenMat)
    boden.rotation.x = -Math.PI / 2
    boden.receiveShadow = true
    scene.add(boden)

    // Dieselbe Rotation wie boden, nicht ihr Gegenstück (+90°): eine Drehung um die X-Achse
    // spiegelt bei entgegengesetztem Vorzeichen zusätzlich die Z-Koordinate der Kontur (bei
    // -90° wird Punkt.y zu +Z, bei +90° zu -Z) — für ein zum Mittelpunkt symmetrisches Rechteck
    // unsichtbar, bei einer L-/U-Form landet die Decke dadurch spiegelverkehrt über der
    // Aussparung statt über der echten Bodenfläche. decke braucht die entgegengesetzte
    // Blickrichtung nicht durch eine eigene Rotation, weil ihr Material bereits DoubleSide ist —
    // Three.js beleuchtet die von unten sichtbare Rückseite dann automatisch korrekt.
    const deckeMat = new THREE.MeshStandardMaterial({ color: '#F0EDE8', roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide, transparent: true, opacity: 1 })
    const decke = new THREE.Mesh(flaechenGeo, deckeMat)
    decke.rotation.x = -Math.PI / 2
    decke.position.y = wandHoehe
    scene.add(decke)

    // === WÄNDE (eine je Wandsegment, Transparenz wird dynamisch gesetzt, jede Wand einzeln
    // einfärbbar) ===
    // Wandfarbe: room.wandfarben ist seit Schritt 9a nach Segmentindex geschlüsselt (statt nach
    // Himmelsrichtung) — funktioniert damit für jede Segmentanzahl/-form, nicht nur für die vier
    // festen Rechteckwände.
    const wandFarbeFuer = (index) => room?.wandfarben?.[index] || room?.wandfarbe || '#FFFFFF'
    const wandMatFuer = (index) => new THREE.MeshStandardMaterial({ color: wandFarbeFuer(index), roughness: 0.9, metalness: 0.0, transparent: true, opacity: 1 })

    const segmente = wandSegmente(eckpunkte)
    // Für updateCamera unten: pro Wand Mesh + 3D-Normale (2D-Normale direkt auf X/Z übernommen,
    // wie schon bei allen anderen Konvertierungen in dieser Datei/trennwaende.js/wandelemente.js).
    const wandMeshe = segmente.map(segment => {
      const x1 = segment.start.x - mitteX, z1 = segment.start.y - mitteZ
      const x2 = segment.ende.x - mitteX, z2 = segment.ende.y - mitteZ
      const wandGeo = new THREE.PlaneGeometry(segment.laenge, wandHoehe)
      const wand = new THREE.Mesh(wandGeo, wandMatFuer(segment.index))
      wand.position.set((x1 + x2) / 2, wandHoehe / 2, (z1 + z2) / 2)
      wand.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
      wand.receiveShadow = true
      scene.add(wand)
      return { mesh: wand, normale: { x: segment.normale.x, z: segment.normale.y } }
    })

    // Sockelleisten — eine Leiste je Wandsegment, volle Segmentlänge, nach innen versetzt um die
    // halbe Dicke entlang der Segment-Normale (ersetzt die 4 festen ±0.02-Offsets). An Außenecken
    // überlappen sich zwei Leisten geringfügig, wie schon bei den bisherigen 4 Leisten — siehe
    // Notiz zu einspringenden Ecken für Schritt 9.
    if (fussleiste) {
      const sockelMat = new THREE.MeshLambertMaterial({ color: fussleisteFarbe || '#E0DDD8' })
      segmente.forEach(segment => {
        const x1 = segment.start.x - mitteX, z1 = segment.start.y - mitteZ
        const x2 = segment.ende.x - mitteX, z2 = segment.ende.y - mitteZ
        const sockel = new THREE.Mesh(new THREE.BoxGeometry(segment.laenge, 0.08, 0.04), sockelMat)
        sockel.position.set(
          (x1 + x2) / 2 - segment.normale.x * 0.02,
          0.04,
          (z1 + z2) / 2 - segment.normale.y * 0.02,
        )
        sockel.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
        scene.add(sockel)
      })
    }

    // === TRENNWÄNDE, WANDELEMENTE & MÖBEL ===
    baueTrennwaende(scene, room, raumBreite, raumTiefe, wandHoehe)

    furniture.forEach(item => {
      if (item.istWandElement) {
        baueWandElement(scene, item, raumBreite, raumTiefe, wandHoehe, eckpunkte)
      } else {
        baueMoebel(scene, item, furniture, raumBreite, raumTiefe, wandHoehe, stoffTextur, holzTextur)
      }
    })

    // === KAMERA STEUERUNG ===
    let isDragging = false
    let previousMouse = { x: 0, y: 0 }
    let spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 18 }

    const updateCamera = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta)
      camera.position.y = spherical.radius * Math.cos(spherical.phi)
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta)
      camera.lookAt(0, 0, 0)

      // Decke ausblenden wenn Kamera von oben schaut (phi < 30°)
      const phiGrad = spherical.phi * 180 / Math.PI
      decke.material.opacity = phiGrad < 30 ? Math.max(0, phiGrad / 30) : 1
      decke.material.transparent = phiGrad < 30

      // Wände dynamisch ein/ausblenden je nach Kameraposition: eine Wand wird ausgeblendet,
      // sobald ihre nach außen zeigende Normale zur Kamera zeigt (Kamera steht "vor" ihrer
      // Außenseite). Für ein Rechteck reduziert sich das exakt auf die bisherigen 4 Sonderfälle
      // camX/camZ ></< 0 — siehe Analyse Schritt 7 zu Innenecken (dieselbe Vereinfachung wie
      // heute schon bei einer Diagonalansicht, keine echte Verdeckungsberechnung).
      wandMeshe.forEach(({ mesh, normale }) => {
        const versteckt = camera.position.x * normale.x + camera.position.z * normale.z > 0
        mesh.material.opacity = versteckt ? 0 : 1
        mesh.material.transparent = versteckt
      })
    }
    updateCamera()

    const onMouseDown = (e) => { isDragging = true; previousMouse = { x: e.clientX, y: e.clientY } }
    const onMouseUp   = () => { isDragging = false }
    const onMouseMove = (e) => {
      if (!isDragging) return
      const dx = e.clientX - previousMouse.x
      const dy = e.clientY - previousMouse.y
      spherical.theta -= dx * 0.01
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.2, spherical.phi + dy * 0.01))
      previousMouse = { x: e.clientX, y: e.clientY }
      updateCamera()
    }
    const onWheel = (e) => {
      spherical.radius = Math.max(4, Math.min(30, spherical.radius + e.deltaY * 0.05))
      updateCamera()
    }

    let lastTouch = null
    const onTouchStart = (e) => { lastTouch = e.touches[0]; isDragging = true }
    const onTouchMove  = (e) => {
      if (!isDragging || !lastTouch) return
      const dx = e.touches[0].clientX - lastTouch.clientX
      const dy = e.touches[0].clientY - lastTouch.clientY
      spherical.theta -= dx * 0.01
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.2, spherical.phi + dy * 0.01))
      lastTouch = e.touches[0]
      updateCamera()
    }
    const onTouchEnd = () => { isDragging = false; lastTouch = null }

mount.addEventListener('mousedown', onMouseDown)
mount.addEventListener('touchstart', onTouchStart)
mount.addEventListener('touchmove', onTouchMove)
mount.addEventListener('touchend', onTouchEnd)
window.addEventListener('mouseup', onMouseUp)
window.addEventListener('mousemove', onMouseMove)
mount.addEventListener('wheel', onWheel)

// Rendergröße an Container anpassen (Fenster-Resize, Panel ein-/ausblenden, Mobile-Rotation)
const onResize = () => {
  const neueBreite = mount.clientWidth
  const neueHoehe = mount.clientHeight
  if (neueBreite === 0 || neueHoehe === 0) return
  camera.aspect = neueBreite / neueHoehe
  camera.updateProjectionMatrix()
  renderer.setSize(neueBreite, neueHoehe)
}
const resizeObserver = new ResizeObserver(onResize)
resizeObserver.observe(mount)

let frameId
const animate = () => {
  frameId = requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
animate()

return () => {
  cancelAnimationFrame(frameId)
  mount.removeEventListener('mousedown', onMouseDown)
  mount.removeEventListener('touchstart', onTouchStart)
  mount.removeEventListener('touchmove', onTouchMove)
  mount.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('mousemove', onMouseMove)
  mount.removeEventListener('wheel', onWheel)
  resizeObserver.disconnect()

  // Die baue*-Helfer (Trennwände, Wandelemente, Möbel) legen ihre eigenen Geometrien/
  // Materialien/Texturen direkt in `scene` ab, ohne Referenzen nach außen zu geben — bei
  // jeder Änderung von room/furniture baut dieser Effekt die komplette Szene neu auf, daher
  // hier eine vollständige Traversierung statt einzeln benannter Handles.
  scene.environment?.dispose()
  scene.traverse(obj => {
    obj.geometry?.dispose()
    const materials = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : [])
    materials.forEach(mat => {
      Object.values(mat).forEach(wert => { if (wert?.isTexture) wert.dispose() })
      mat.dispose()
    })
  })

  mount.removeChild(renderer.domElement)
  renderer.dispose()
}
  }, [room, furniture, fussleiste, fussleisteFarbe, raumHoehe])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
  )
}

