import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { erzeugeHolzTextur, erzeugeStoffTextur, erzeugeBodenTextur, erzeugeUmgebungsTextur } from './texturen'
import { baueTrennwaende } from './scene/trennwaende'
import { baueWandElement } from './scene/wandelemente'
import { baueMoebel } from './scene/moebel'
import { rechteckPolygon } from './raumPolygon'
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

    const raumBreite = (room?.breite || 6)
    const raumTiefe  = (room?.tiefe  || 5)
    const wandHoehe = raumHoehe || 2.5
    const eckpunkte = room?.eckpunkte || rechteckPolygon(raumBreite, raumTiefe)

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

    // === BODEN ===
    const bodenGeo = new THREE.PlaneGeometry(raumBreite, raumTiefe)
    const bodenMat = new THREE.MeshStandardMaterial({ map: erzeugeBodenTextur(room?.boden, raumBreite, raumTiefe), roughness: 0.8, metalness: 0.0 })
    const boden = new THREE.Mesh(bodenGeo, bodenMat)
    boden.rotation.x = -Math.PI / 2
    boden.receiveShadow = true
    scene.add(boden)


    // === WÄNDE (alle 4, Transparenz wird dynamisch gesetzt, jede Wand einzeln einfärbbar) ===
    const wandFarbeFuer = (seite) => room?.wandfarben?.[seite] || room?.wandfarbe || '#FFFFFF'
    const wandMatFuer = (seite) => new THREE.MeshStandardMaterial({ color: wandFarbeFuer(seite), roughness: 0.9, metalness: 0.0, transparent: true, opacity: 1 })

    // Wand hinten / Nord (Z-)
    const wandHintenGeo = new THREE.PlaneGeometry(raumBreite, wandHoehe)
    const wandHinten = new THREE.Mesh(wandHintenGeo, wandMatFuer('nord'))
    wandHinten.position.set(0, wandHoehe / 2, -raumTiefe / 2)
    wandHinten.receiveShadow = true
    scene.add(wandHinten)

    // Wand vorne / Süd (Z+)
    const wandVorneGeo = new THREE.PlaneGeometry(raumBreite, wandHoehe)
    const wandVorne = new THREE.Mesh(wandVorneGeo, wandMatFuer('sued'))
    wandVorne.position.set(0, wandHoehe / 2, raumTiefe / 2)
    wandVorne.rotation.y = Math.PI
    wandVorne.receiveShadow = true
    scene.add(wandVorne)

    // Wand links / West (X-)
    const wandLinksGeo = new THREE.PlaneGeometry(raumTiefe, wandHoehe)
    const wandLinks = new THREE.Mesh(wandLinksGeo, wandMatFuer('west'))
    wandLinks.position.set(-raumBreite / 2, wandHoehe / 2, 0)
    wandLinks.rotation.y = Math.PI / 2
    wandLinks.receiveShadow = true
    scene.add(wandLinks)

    // Wand rechts / Ost (X+)
    const wandRechtsGeo = new THREE.PlaneGeometry(raumTiefe, wandHoehe)
    const wandRechts = new THREE.Mesh(wandRechtsGeo, wandMatFuer('ost'))
    wandRechts.position.set(raumBreite / 2, wandHoehe / 2, 0)
    wandRechts.rotation.y = -Math.PI / 2
    wandRechts.receiveShadow = true
    scene.add(wandRechts)

    // Decke
    const deckeGeo = new THREE.PlaneGeometry(raumBreite, raumTiefe)
    const deckeMat = new THREE.MeshStandardMaterial({ color: '#F0EDE8', roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide, transparent: true, opacity: 1 })
    const decke = new THREE.Mesh(deckeGeo, deckeMat)
    decke.rotation.x = Math.PI / 2
    decke.position.y = wandHoehe
    scene.add(decke)

    // Sockelleisten
    if (fussleiste) {
      const sockelMat = new THREE.MeshLambertMaterial({ color: fussleisteFarbe || '#E0DDD8' })
      // Alle 4 Wände
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(raumBreite, 0.08, 0.04), sockelMat)
      s1.position.set(0, 0.04, -raumTiefe / 2 + 0.02)
      scene.add(s1)
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(raumBreite, 0.08, 0.04), sockelMat)
      s2.position.set(0, 0.04, raumTiefe / 2 - 0.02)
      scene.add(s2)
      const s3 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, raumTiefe), sockelMat)
      s3.position.set(-raumBreite / 2 + 0.02, 0.04, 0)
      scene.add(s3)
      const s4 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, raumTiefe), sockelMat)
      s4.position.set(raumBreite / 2 - 0.02, 0.04, 0)
      scene.add(s4)
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

      // Wände dynamisch ein/ausblenden je nach Kameraposition
      const camX = camera.position.x
      const camZ = camera.position.z

      // Wenn Kamera von vorne kommt → Vorderwand ausblenden
      wandVorne.material.opacity  = camZ > 0 ? 0 : 1
      wandVorne.material.transparent = camZ > 0

      // Wenn Kamera von hinten kommt → Hinterwand ausblenden
      wandHinten.material.opacity = camZ < 0 ? 0 : 1
      wandHinten.material.transparent = camZ < 0

      // Wenn Kamera von rechts kommt → Rechte Wand ausblenden
      wandRechts.material.opacity = camX > 0 ? 0 : 1
      wandRechts.material.transparent = camX > 0

      // Wenn Kamera von links kommt → Linke Wand ausblenden
      wandLinks.material.opacity  = camX < 0 ? 0 : 1
      wandLinks.material.transparent = camX < 0
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

