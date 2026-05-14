import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function RoomView3D({ room, furniture, fussleiste, fussleisteFarbe, raumHoehe }) {
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
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)

    const raumBreite = (room?.breite || 6)
    const raumTiefe  = (room?.tiefe  || 5)
    const wandHoehe = raumHoehe || 2.5

    // === BELEUCHTUNG ===
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.4)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2)
    sunLight.position.set(raumBreite * 0.8, 8, raumTiefe * 0.8)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 4096
    sunLight.shadow.mapSize.height = 4096
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 50
    sunLight.shadow.camera.left = -10
    sunLight.shadow.camera.right = 10
    sunLight.shadow.camera.top = 10
    sunLight.shadow.camera.bottom = -10
    sunLight.shadow.bias = -0.001
    sunLight.shadow.radius = 4
    scene.add(sunLight)

    const windowLight = new THREE.DirectionalLight(0xc8e8ff, 0.6)
    windowLight.position.set(-raumBreite, 4, 0)
    scene.add(windowLight)

    const ceilingLight = new THREE.PointLight(0xfff8e6, 1.5, raumBreite * 3)
    ceilingLight.position.set(0, wandHoehe - 0.2, 0)
    ceilingLight.castShadow = true
    scene.add(ceilingLight)

    const lampGeo = new THREE.SphereGeometry(0.12, 16, 16)
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffde0 })
    const lamp = new THREE.Mesh(lampGeo, lampMat)
    lamp.position.set(0, wandHoehe - 0.1, 0)
    scene.add(lamp)

    const fillLight = new THREE.HemisphereLight(0xffffff, 0xC8A97A, 0.3)
    scene.add(fillLight)

    // === BODEN ===
    const bodenFarbe = getBodenFarbe(room?.boden)
    const bodenGeo = new THREE.PlaneGeometry(raumBreite, raumTiefe)
    const bodenMat = new THREE.MeshLambertMaterial({ color: bodenFarbe })
    const boden = new THREE.Mesh(bodenGeo, bodenMat)
    boden.rotation.x = -Math.PI / 2
    boden.receiveShadow = true
    scene.add(boden)

    if (room?.boden && room.boden !== 'boden-standard') {
      const gridHelper = new THREE.GridHelper(
        Math.max(raumBreite, raumTiefe),
        room.boden === 'boden-fliesen' ? 6 : 12,
        0x00000020, 0x00000020
      )
      gridHelper.position.y = 0.01
      scene.add(gridHelper)
    }

    // === WÄNDE (alle 4, Transparenz wird dynamisch gesetzt) ===
    const wandFarbe = room?.wandfarbe || '#FFFFFF'
    const wandMat = new THREE.MeshLambertMaterial({ color: wandFarbe, transparent: true, opacity: 1 })

    // Wand hinten (Z-)
    const wandHintenGeo = new THREE.PlaneGeometry(raumBreite, wandHoehe)
    const wandHinten = new THREE.Mesh(wandHintenGeo, wandMat.clone())
    wandHinten.position.set(0, wandHoehe / 2, -raumTiefe / 2)
    wandHinten.receiveShadow = true
    scene.add(wandHinten)

    // Wand vorne (Z+)
    const wandVorneGeo = new THREE.PlaneGeometry(raumBreite, wandHoehe)
    const wandVorne = new THREE.Mesh(wandVorneGeo, wandMat.clone())
    wandVorne.position.set(0, wandHoehe / 2, raumTiefe / 2)
    wandVorne.rotation.y = Math.PI
    wandVorne.receiveShadow = true
    scene.add(wandVorne)

    // Wand links (X-)
    const wandLinksGeo = new THREE.PlaneGeometry(raumTiefe, wandHoehe)
    const wandLinks = new THREE.Mesh(wandLinksGeo, wandMat.clone())
    wandLinks.position.set(-raumBreite / 2, wandHoehe / 2, 0)
    wandLinks.rotation.y = Math.PI / 2
    wandLinks.receiveShadow = true
    scene.add(wandLinks)

    // Wand rechts (X+)
    const wandRechtsGeo = new THREE.PlaneGeometry(raumTiefe, wandHoehe)
    const wandRechts = new THREE.Mesh(wandRechtsGeo, wandMat.clone())
    wandRechts.position.set(raumBreite / 2, wandHoehe / 2, 0)
    wandRechts.rotation.y = -Math.PI / 2
    wandRechts.receiveShadow = true
    scene.add(wandRechts)

    // Decke
    const deckeGeo = new THREE.PlaneGeometry(raumBreite, raumTiefe)
    const deckeMat = new THREE.MeshLambertMaterial({ color: '#F0EDE8', side: THREE.DoubleSide, transparent: true, opacity: 1 })
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

    // === MÖBEL & WAND-ELEMENTE ===
    furniture.forEach(item => {
      const moebelBreite = item.width  / 60
      const moebelTiefe  = item.height / 60

      // Position korrekt berechnen
      const scaleFactor = 1 / 60
      const fussOffset = (fussleiste ? -0.08 : 0)
      const x = (item.left / 60) - raumBreite / 2 + moebelBreite / 2 + fussOffset
      const z = (item.top  / 60) - raumTiefe  / 2 + moebelTiefe  / 2 + fussOffset
      const rotation = -(item.rotation || 0) * Math.PI / 180

      if (item.istWandElement) {
        // Fenster & Türen
        const elBreite = item.width  / 60
        const elHoehe  = item.typ === 'fenster' ? 1.2 : 2.1
        const elTiefe  = 0.08

        if (item.typ === 'fenster') {
          // Fensterrahmen
          const rahmenMat = new THREE.MeshLambertMaterial({ color: '#FFFFFF' })
          const rahmen = new THREE.Mesh(new THREE.BoxGeometry(elBreite, elHoehe, elTiefe), rahmenMat)
          rahmen.position.set(x, 1.2, z)
          rahmen.rotation.y = rotation
          rahmen.castShadow = true
          scene.add(rahmen)

          // Glasscheibe
          const glasMat = new THREE.MeshLambertMaterial({ color: '#C8E8FF', transparent: true, opacity: 0.4 })
          const glas = new THREE.Mesh(new THREE.BoxGeometry(elBreite - 0.1, elHoehe - 0.1, 0.02), glasMat)
          glas.position.set(x, 1.2, z)
          glas.rotation.y = rotation
          scene.add(glas)
        } else {
          // Tür
          const tuerMat = new THREE.MeshLambertMaterial({ color: '#D4B896' })
          const tuer = new THREE.Mesh(new THREE.BoxGeometry(elBreite, elHoehe, elTiefe), tuerMat)
          tuer.position.set(x, elHoehe / 2, z)
          tuer.rotation.y = rotation
          tuer.castShadow = true
          scene.add(tuer)

          // Türknauf
          const knaufMat = new THREE.MeshLambertMaterial({ color: '#BA7517' })
          const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), knaufMat)
          knauf.position.set(x + 0.3, 1.0, z + 0.05)
          scene.add(knauf)
        }
      } else {
        const moebelBreite = item.width  / 60
        const moebelTiefe  = item.height / 60
        const moebelHoehe  = getMoebelHoehe(item.name)
        const x = (item.left * scaleFactor) - (raumBreite / 2) + (moebelBreite / 2) + fussOffset
        const z = (item.top  * scaleFactor) - (raumTiefe  / 2) + (moebelTiefe  / 2) + fussOffset
        const rotation = -(item.rotation || 0) * Math.PI / 180
        const gruppe = new THREE.Group()
        gruppe.position.set(x, 0, z)
        gruppe.rotation.y = rotation

        const mat = new THREE.MeshLambertMaterial({ color: item.color })
        const borderMat = new THREE.MeshLambertMaterial({ color: item.border })

        const name = item.name.toLowerCase()

        if (name.includes('sofa') || name.includes('sessel')) {
          // Sitzfläche
          const sitz = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.2, moebelTiefe * 0.7), mat)
          sitz.position.set(0, 0.2, moebelTiefe * 0.1)
          sitz.castShadow = true
          gruppe.add(sitz)
          // Rückenlehne
          const lehne = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.5, moebelTiefe * 0.15), mat)
          lehne.position.set(0, 0.55, -moebelTiefe * 0.4)
          lehne.castShadow = true
          gruppe.add(lehne)
          // Armlehnen
          const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, moebelTiefe * 0.7), mat)
          armL.position.set(-moebelBreite / 2 + 0.05, 0.35, moebelTiefe * 0.1)
          gruppe.add(armL)
          const armR = armL.clone()
          armR.position.x = moebelBreite / 2 - 0.05
          gruppe.add(armR)
          // Beine
          const beinGeo = new THREE.BoxGeometry(0.06, 0.15, 0.06)
          const beinMat = new THREE.MeshLambertMaterial({ color: '#8B6914' })
          const positionen = [
            [-moebelBreite/2+0.08, 0.075, moebelTiefe*0.35],
            [ moebelBreite/2-0.08, 0.075, moebelTiefe*0.35],
            [-moebelBreite/2+0.08, 0.075, -moebelTiefe*0.35],
            [ moebelBreite/2-0.08, 0.075, -moebelTiefe*0.35],
          ]
          positionen.forEach(p => {
            const bein = new THREE.Mesh(beinGeo, beinMat)
            bein.position.set(...p)
            gruppe.add(bein)
          })

        } else if (name.includes('bett') || name.includes('einzelbett') || name.includes('doppelbett')) {
          // Matratze
          const matratze = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite - 0.1, 0.25, moebelTiefe * 0.8), mat)
          matratze.position.set(0, 0.3, moebelTiefe * 0.05)
          matratze.castShadow = true
          gruppe.add(matratze)
          // Bettrahmen
          const rahmen = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.15, moebelTiefe), borderMat)
          rahmen.position.set(0, 0.075, 0)
          rahmen.castShadow = true
          gruppe.add(rahmen)
          // Kopfteil
          const kopf = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.6, 0.1), borderMat)
          kopf.position.set(0, 0.45, -moebelTiefe / 2 + 0.05)
          kopf.castShadow = true
          gruppe.add(kopf)
          // Kissen
          const kissenMat = new THREE.MeshLambertMaterial({ color: '#FFFFFF' })
          const kissenBreite = name.includes('doppel') ? moebelBreite / 2 - 0.1 : moebelBreite - 0.2
          const kissen1 = new THREE.Mesh(new THREE.BoxGeometry(kissenBreite, 0.1, 0.3), kissenMat)
          kissen1.position.set(name.includes('doppel') ? -moebelBreite/4 : 0, 0.48, -moebelTiefe * 0.3)
          gruppe.add(kissen1)
          if (name.includes('doppel')) {
            const kissen2 = kissen1.clone()
            kissen2.position.x = moebelBreite / 4
            gruppe.add(kissen2)
          }

        } else if (name.includes('tisch') || name.includes('schreibtisch') || name.includes('esstisch')) {
          // Tischplatte
          const platte = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.06, moebelTiefe), mat)
          platte.position.set(0, moebelHoehe - 0.03, 0)
          platte.castShadow = true
          gruppe.add(platte)
          // Beine
          const beinGeo = new THREE.BoxGeometry(0.06, moebelHoehe - 0.06, 0.06)
          const beinMat = new THREE.MeshLambertMaterial({ color: item.border })
          const beinPos = [
            [-moebelBreite/2+0.06, (moebelHoehe-0.06)/2,  moebelTiefe/2-0.06],
            [ moebelBreite/2-0.06, (moebelHoehe-0.06)/2,  moebelTiefe/2-0.06],
            [-moebelBreite/2+0.06, (moebelHoehe-0.06)/2, -moebelTiefe/2+0.06],
            [ moebelBreite/2-0.06, (moebelHoehe-0.06)/2, -moebelTiefe/2+0.06],
          ]
          beinPos.forEach(p => {
            const bein = new THREE.Mesh(beinGeo, beinMat)
            bein.position.set(...p)
            gruppe.add(bein)
          })

        } else if (name.includes('stuhl') || name.includes('hocker') || name.includes('sessel')) {
          // Sitzfläche
          const sitz = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.08, moebelTiefe), mat)
          sitz.position.set(0, 0.45, 0)
          sitz.castShadow = true
          gruppe.add(sitz)
          // Rückenlehne
          if (!name.includes('hocker')) {
            const lehne = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.4, 0.06), mat)
            lehne.position.set(0, 0.7, -moebelTiefe/2 + 0.03)
            lehne.castShadow = true
            gruppe.add(lehne)
          }
          // Beine
          const beinGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8)
          const beinMat = new THREE.MeshLambertMaterial({ color: item.border })
          const beinPos = [
            [-moebelBreite/2+0.05, 0.225,  moebelTiefe/2-0.05],
            [ moebelBreite/2-0.05, 0.225,  moebelTiefe/2-0.05],
            [-moebelBreite/2+0.05, 0.225, -moebelTiefe/2+0.05],
            [ moebelBreite/2-0.05, 0.225, -moebelTiefe/2+0.05],
          ]
          beinPos.forEach(p => {
            const bein = new THREE.Mesh(beinGeo, beinMat)
            bein.position.set(...p)
            gruppe.add(bein)
          })

        } else if (name.includes('schrank') || name.includes('regal') || name.includes('sideboard') || name.includes('kommode') || name.includes('vitrine')) {
          // Korpus
          const korpus = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe), mat)
          korpus.position.set(0, moebelHoehe / 2, 0)
          korpus.castShadow = true
          gruppe.add(korpus)
          // Türen/Schubladen Linien
          const linienMat = new THREE.LineBasicMaterial({ color: item.border })
          const anzahlTueren = Math.round(moebelBreite / 0.5)
          for (let i = 1; i < anzahlTueren; i++) {
            const x = -moebelBreite/2 + (moebelBreite/anzahlTueren) * i
            const points = [
              new THREE.Vector3(x, 0.05, moebelTiefe/2 + 0.01),
              new THREE.Vector3(x, moebelHoehe - 0.05, moebelTiefe/2 + 0.01),
            ]
            const geo = new THREE.BufferGeometry().setFromPoints(points)
            gruppe.add(new THREE.Line(geo, linienMat))
          }
          // Griffe
          const griffMat = new THREE.MeshLambertMaterial({ color: '#C0A060' })
          for (let i = 0; i < anzahlTueren; i++) {
            const gx = -moebelBreite/2 + (moebelBreite/anzahlTueren) * i + (moebelBreite/anzahlTueren/2)
            const griff = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), griffMat)
            griff.rotation.z = Math.PI / 2
            griff.position.set(gx, moebelHoehe * 0.5, moebelTiefe/2 + 0.03)
            gruppe.add(griff)
          }

        } else if (name.includes('tv') && !name.includes('board')) {
          // TV Bildschirm
          const screen = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe * 8, 0.08), new THREE.MeshLambertMaterial({ color: '#111111' }))
          screen.position.set(0, moebelHoehe * 4, 0)
          screen.castShadow = true
          gruppe.add(screen)
          // Bildschirm Rand
          const rand = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite + 0.04, moebelHoehe * 8 + 0.04, 0.04), new THREE.MeshLambertMaterial({ color: '#222222' }))
          rand.position.set(0, moebelHoehe * 4, -0.02)
          gruppe.add(rand)
          // Standfuß
          const fuss = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.15), new THREE.MeshLambertMaterial({ color: '#333333' }))
          fuss.position.set(0, 0.075, 0)
          gruppe.add(fuss)

        } else {
          // Standard Box für alle anderen
          const geo = new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe)
          const mesh = new THREE.Mesh(geo, mat)
          mesh.position.set(0, moebelHoehe / 2, 0)
          mesh.castShadow = true
          mesh.receiveShadow = true
          const edges = new THREE.EdgesGeometry(geo)
          const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: item.border }))
          line.position.copy(mesh.position)
          gruppe.add(mesh)
          gruppe.add(line)
        }

       gruppe.castShadow = true
        scene.add(gruppe)
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

    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      mount.removeEventListener('mousedown', onMouseDown)
      mount.removeEventListener('touchstart', onTouchStart)
      mount.removeEventListener('touchmove', onTouchMove)
      mount.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      mount.removeEventListener('wheel', onWheel)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [room, furniture])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
  )
}

function getBodenFarbe(boden) {
  const farben = {
    'boden-parkett':  '#C8A97A',
    'boden-laminat':  '#D4B896',
    'boden-fliesen':  '#E8E4DC',
    'boden-teppich':  '#C4B8D4',
    'boden-beton':    '#B8B8B4',
    'boden-standard': '#F5F4F0',
  }
  return farben[boden] || '#F5F4F0'
}

function getMoebelHoehe(name) {
  const hoehen = {
    'Sofa': 0.85, 'Sessel': 0.85, 'Einzelbett': 0.6,
    'Doppelbett': 0.6, 'Esstisch': 0.75, 'Couchtisch': 0.45,
    'Schreibtisch': 0.75, 'TV-Board': 0.5, 'Sideboard': 0.8,
    'Kleiderschrank': 2.1, 'Regal': 1.8, 'Bücherregal': 1.8,
    'Kühlschrank': 1.8, 'Herd': 0.9, 'Spüle': 0.9,
    'WC': 0.8, 'Badewanne': 0.6, 'Dusche': 2.0,
    'Waschmaschine': 0.85, 'Pflanze': 1.2, 'Großpflanze': 1.8,
    'Lampe': 1.5, 'Stehlampe': 1.7, 'TV': 0.1,
  }
  return hoehen[name] || 0.75
}
