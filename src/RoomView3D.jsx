import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { erzeugeHolzTextur, erzeugeStoffTextur, erzeugeBodenTextur, erzeugeUmgebungsTextur, erzeugeWandputzTextur } from './texturen'
import { baueTrennwaende } from './scene/trennwaende'
import { baueWandElement } from './scene/wandelemente'
import { baueMoebel } from './scene/moebel'
import { baueBeleuchtung } from './scene/beleuchtung'
import { rechteckPolygon, boundingBox, wandSegmente, punktInPolygon, versetztesPolygon, punktSicherImPolygon } from './raumPolygon'
import { useRooms } from './context/RoomsContext'
import { useFurniture } from './context/FurnitureContext'
import { useDesign } from './context/DesignContext'

export default function RoomView3D() {
  const { activeRoom: room } = useRooms()
  const { furniture } = useFurniture()
  const { fussleiste, fussleisteFarbe, raumHoehe, tageszeit } = useDesign()
  const mountRef = useRef(null)

  // Kameramodus + Rundgang-Position leben unabhängig vom schweren Szenen-Effekt unten (der bei
  // jeder room/furniture/... Änderung die komplette Szene neu aufbaut) — ein Moduswechsel per
  // Button soll keinen Neuaufbau auslösen. kameraModusRef ist die von den Event-Handlern im
  // Effekt gelesene "Quelle der Wahrheit", kameraModus (State) dient nur der Button-Optik.
  const kameraModusRef = useRef('rundumblick')
  const [kameraModus, setKameraModus] = useState('rundumblick')
  const rundgangRef = useRef(null)
  const updateCameraRef = useRef(() => {})

  const waehleKameraModus = (modus) => {
    if (modus === kameraModusRef.current) return
    kameraModusRef.current = modus
    setKameraModus(modus)
    updateCameraRef.current()
  }

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
    const wandputzTextur = erzeugeWandputzTextur()
    scene.environment = erzeugeUmgebungsTextur()

    // === BELEUCHTUNG ===
    baueBeleuchtung(scene, eckpunkte, mitteX, mitteZ, raumBreite, raumTiefe, wandHoehe, tageszeit)

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
    // map + color: MeshStandardMaterial multipliziert beide miteinander, die Putzstruktur bleibt
    // dadurch mit jeder der 27 Wandfarben einfärbbar, ohne dass die Farbwahl selbst hier angefasst
    // werden muss.
    const wandMatFuer = (index) => new THREE.MeshStandardMaterial({ color: wandFarbeFuer(index), map: wandputzTextur, roughness: 0.9, metalness: 0.0, transparent: true, opacity: 1 })

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
        baueWandElement(scene, item, raumBreite, raumTiefe, wandHoehe, eckpunkte, holzTextur)
      } else {
        baueMoebel(scene, item, furniture, raumBreite, raumTiefe, wandHoehe, stoffTextur, holzTextur)
      }
    })

    // === KAMERA STEUERUNG ===
    // Zwei Modi: "rundumblick" (bestehende Orbit-Kamera, Standard) und "rundgang" (freie Kamera
    // auf Augenhöhe). Der aktuelle Modus wird bei jedem Handler-Aufruf frisch aus kameraModusRef
    // gelesen (siehe Komponentenkopf) statt hier als Dependency zu landen — ein Moduswechsel per
    // Button darf keinen Neuaufbau dieses (teuren) Effekts auslösen.
    const AUGENHOEHE = 1.65
    const RUNDGANG_SICHERHEITSABSTAND = 0.3
    const PITCH_LIMIT = 1.4

    // Nach innen versetztes Polygon als Lauf-Grenze (Sicherheitsabstand zu den Wänden). Kann bei
    // einem zu schmalen L-/U-Form-Schenkel werfen (siehe versetztesPolygon) — dann ohne
    // Sicherheitsabstand gegen die reine Raumkontur prüfen, statt das Laufen ganz zu blockieren.
    let sicherheitsPolygon = eckpunkte
    try {
      sicherheitsPolygon = versetztesPolygon(eckpunkte, RUNDGANG_SICHERHEITSABSTAND)
    } catch {
      sicherheitsPolygon = eckpunkte
    }

    // Startpunkt für den Rundgang-Modus: derselbe "garantiert im Raum liegende Punkt" wie bei der
    // Default-Möbelplatzierung (punktSicherImPolygon), Blickrichtung von dort zum 3D-Ursprung
    // (Raummitte der Bounding-Box).
    const berechneRundgangStart = () => {
      const punkt = punktSicherImPolygon(eckpunkte)
      const startX = punkt.x - mitteX
      const startZ = mitteZ - punkt.y
      const laenge = Math.hypot(startX, startZ) || 1
      const yaw = Math.atan2(-startX / laenge, -startZ / laenge)
      return { x: startX, z: startZ, yaw, pitch: 0 }
    }

    // rundgangRef lebt außerhalb dieses Effekts (siehe Komponentenkopf) und überlebt damit einen
    // Szenen-Neuaufbau (room/furniture-Änderung während eines laufenden Rundgangs). Nur wenn die
    // gespeicherte Position in der (evtl. neuen) Raumform nicht mehr gültig ist, neu berechnen.
    if (!rundgangRef.current) {
      rundgangRef.current = berechneRundgangStart()
    } else {
      const raumPunktAktuell = { x: rundgangRef.current.x + mitteX, y: mitteZ - rundgangRef.current.z }
      if (!punktInPolygon(raumPunktAktuell, sicherheitsPolygon)) {
        Object.assign(rundgangRef.current, berechneRundgangStart())
      }
    }
    const rundgang = rundgangRef.current

    let isDragging = false
    let previousMouse = { x: 0, y: 0 }
    let spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 18 }

    const updateOrbitCamera = () => {
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

    // Kamera steht innerhalb des Raums — die Ausblend-Logik der Orbit-Kamera (für eine Kamera
    // außerhalb des Raums gedacht) passt hier nicht: Wände und Decke bleiben immer voll sichtbar.
    const updateRundgangCamera = () => {
      camera.position.set(rundgang.x, AUGENHOEHE, rundgang.z)
      const zielX = rundgang.x + Math.sin(rundgang.yaw) * Math.cos(rundgang.pitch)
      const zielY = AUGENHOEHE + Math.sin(rundgang.pitch)
      const zielZ = rundgang.z + Math.cos(rundgang.yaw) * Math.cos(rundgang.pitch)
      camera.lookAt(zielX, zielY, zielZ)

      decke.material.opacity = 1
      decke.material.transparent = false
      wandMeshe.forEach(({ mesh }) => {
        mesh.material.opacity = 1
        mesh.material.transparent = false
      })
    }

    const updateCamera = () => {
      if (kameraModusRef.current === 'rundgang') updateRundgangCamera()
      else updateOrbitCamera()
    }
    updateCamera()
    updateCameraRef.current = updateCamera

    // Boden + Wände als gemeinsame Raycast-Ziele fürs Laufen: trifft der Klick-Strahl zuerst eine
    // Wand statt den Boden, wurde auf/durch eine Wand geklickt — kein Laufbefehl, sonst könnte die
    // Kamera durch eine Wand "hindurchlaufen" (siehe versucheLaufenZu).
    const laufZiele = [boden, ...wandMeshe.map(w => w.mesh)]
    const raycaster = new THREE.Raycaster()
    const zeigerNDC = new THREE.Vector2()

    let laufAnimation = null // { startX, startZ, zielX, zielZ, startZeit, dauer }
    const easeOut = (t) => 1 - Math.pow(1 - t, 3)

    const versucheLaufenZu = (clientX, clientY) => {
      const rect = mount.getBoundingClientRect()
      zeigerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
      zeigerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(zeigerNDC, camera)
      const treffer = raycaster.intersectObjects(laufZiele, false)
      if (treffer.length === 0 || treffer[0].object !== boden) return
      const punkt = treffer[0].point
      const raumPunkt = { x: punkt.x + mitteX, y: mitteZ - punkt.z }
      if (!punktInPolygon(raumPunkt, sicherheitsPolygon)) return
      laufAnimation = { startX: rundgang.x, startZ: rundgang.z, zielX: punkt.x, zielZ: punkt.z, startZeit: performance.now(), dauer: 700 }
    }

    // Klick/Tap-vs-Drag-Unterscheidung im Rundgang-Modus (analog zum Muster aus Kartenanwendungen):
    // kaum Bewegung + kurze Zeit zwischen Down- und Up-Event = Laufbefehl, sonst nur Umsehen.
    const KLICK_MAX_BEWEGUNG_PX = 6
    const KLICK_MAX_DAUER_MS = 400
    let rundgangZeiger = null // { startX, startY, letzteX, letzteY, bewegung, startZeit }

    const onMouseDown = (e) => {
      if (kameraModusRef.current === 'rundgang') {
        rundgangZeiger = { startX: e.clientX, startY: e.clientY, letzteX: e.clientX, letzteY: e.clientY, bewegung: 0, startZeit: performance.now() }
        return
      }
      isDragging = true
      previousMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => {
      if (kameraModusRef.current === 'rundgang') {
        if (rundgangZeiger) {
          const dauer = performance.now() - rundgangZeiger.startZeit
          if (rundgangZeiger.bewegung < KLICK_MAX_BEWEGUNG_PX && dauer < KLICK_MAX_DAUER_MS) {
            versucheLaufenZu(rundgangZeiger.startX, rundgangZeiger.startY)
          }
        }
        rundgangZeiger = null
        return
      }
      isDragging = false
    }
    const onMouseMove = (e) => {
      if (kameraModusRef.current === 'rundgang') {
        if (!rundgangZeiger) return
        const dx = e.clientX - rundgangZeiger.letzteX
        const dy = e.clientY - rundgangZeiger.letzteY
        rundgangZeiger.bewegung += Math.abs(dx) + Math.abs(dy)
        rundgang.yaw -= dx * 0.01
        rundgang.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, rundgang.pitch - dy * 0.01))
        rundgangZeiger.letzteX = e.clientX
        rundgangZeiger.letzteY = e.clientY
        updateCamera()
        return
      }
      if (!isDragging) return
      const dx = e.clientX - previousMouse.x
      const dy = e.clientY - previousMouse.y
      spherical.theta -= dx * 0.01
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.2, spherical.phi + dy * 0.01))
      previousMouse = { x: e.clientX, y: e.clientY }
      updateCamera()
    }
    const onWheel = (e) => {
      if (kameraModusRef.current === 'rundgang') return
      spherical.radius = Math.max(4, Math.min(30, spherical.radius + e.deltaY * 0.05))
      updateCamera()
    }

    let lastTouch = null
    const onTouchStart = (e) => {
      if (kameraModusRef.current === 'rundgang') {
        const t = e.touches[0]
        rundgangZeiger = { startX: t.clientX, startY: t.clientY, letzteX: t.clientX, letzteY: t.clientY, bewegung: 0, startZeit: performance.now() }
        return
      }
      lastTouch = e.touches[0]; isDragging = true
    }
    const onTouchMove  = (e) => {
      if (kameraModusRef.current === 'rundgang') {
        if (!rundgangZeiger) return
        const t = e.touches[0]
        const dx = t.clientX - rundgangZeiger.letzteX
        const dy = t.clientY - rundgangZeiger.letzteY
        rundgangZeiger.bewegung += Math.abs(dx) + Math.abs(dy)
        rundgang.yaw -= dx * 0.01
        rundgang.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, rundgang.pitch - dy * 0.01))
        rundgangZeiger.letzteX = t.clientX
        rundgangZeiger.letzteY = t.clientY
        updateCamera()
        return
      }
      if (!isDragging || !lastTouch) return
      const dx = e.touches[0].clientX - lastTouch.clientX
      const dy = e.touches[0].clientY - lastTouch.clientY
      spherical.theta -= dx * 0.01
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.2, spherical.phi + dy * 0.01))
      lastTouch = e.touches[0]
      updateCamera()
    }
    const onTouchEnd = () => {
      if (kameraModusRef.current === 'rundgang') {
        if (rundgangZeiger) {
          const dauer = performance.now() - rundgangZeiger.startZeit
          if (rundgangZeiger.bewegung < KLICK_MAX_BEWEGUNG_PX && dauer < KLICK_MAX_DAUER_MS) {
            versucheLaufenZu(rundgangZeiger.startX, rundgangZeiger.startY)
          }
        }
        rundgangZeiger = null
        return
      }
      isDragging = false; lastTouch = null
    }

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
  if (laufAnimation) {
    const t = Math.min(1, (performance.now() - laufAnimation.startZeit) / laufAnimation.dauer)
    const fortschritt = easeOut(t)
    rundgang.x = laufAnimation.startX + (laufAnimation.zielX - laufAnimation.startX) * fortschritt
    rundgang.z = laufAnimation.startZ + (laufAnimation.zielZ - laufAnimation.startZ) * fortschritt
    updateCamera()
    if (t >= 1) laufAnimation = null
  }
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
  // Foto-Texturen (texturen.js, ladeFotoTextur) sind davon ausgenommen (userData.persistenteTextur)
  // — die leben im modulweiten Cache über diesen Neuaufbau hinaus, ein hier ausgelöstes dispose()
  // würde beim nächsten Szenenaufbau eine bereits GPU-seitig freigegebene (leere) Textur liefern.
  scene.environment?.dispose()
  scene.traverse(obj => {
    obj.geometry?.dispose()
    const materials = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : [])
    materials.forEach(mat => {
      Object.values(mat).forEach(wert => { if (wert?.isTexture && !wert.userData?.persistenteTextur) wert.dispose() })
      mat.dispose()
    })
  })

  mount.removeChild(renderer.domElement)
  renderer.dispose()
}
  }, [room, furniture, fussleiste, fussleisteFarbe, raumHoehe, tageszeit])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, display: 'flex', border: '1px solid #E8E6E0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {[
          { key: 'rundumblick', label: 'Rundumblick' },
          { key: 'rundgang', label: 'Rundgang' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => waehleKameraModus(key)} style={{
            padding: '6px 14px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
            background: kameraModus === key ? '#2F4B39' : 'white', color: kameraModus === key ? 'white' : '#888780',
            border: 'none', cursor: 'pointer', fontWeight: kameraModus === key ? '500' : '400',
          }}>{label}</button>
        ))}
      </div>
    </div>
  )
}

