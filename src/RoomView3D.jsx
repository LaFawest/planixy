import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

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

    // === MÖBEL & WAND-ELEMENTE ===
    const wandDicke = 8
    const innenBpx = raumBreite * 60 - wandDicke * 2
    const innenTpx = raumTiefe  * 60 - wandDicke * 2

    // === TRENNWÄNDE (frei gezeichnete Innenwände) ===
    ;(room?.trennwaende || []).forEach(wand => {
      const x1 = -raumBreite / 2 + (wand.x1 / innenBpx) * raumBreite
      const z1 = -raumTiefe  / 2 + (wand.y1 / innenTpx) * raumTiefe
      const x2 = -raumBreite / 2 + (wand.x2 / innenBpx) * raumBreite
      const z2 = -raumTiefe  / 2 + (wand.y2 / innenTpx) * raumTiefe
      const laenge = Math.hypot(x2 - x1, z2 - z1)
      if (laenge < 0.05) return
      const trennwandDicke = (wand.dicke || 10) / 60
      const trennwandMat = new THREE.MeshStandardMaterial({ color: wand.farbe || '#B4B2A9', roughness: 0.9, metalness: 0.0 })
      const trennwandMesh = new THREE.Mesh(new THREE.BoxGeometry(laenge, wandHoehe, trennwandDicke), trennwandMat)
      trennwandMesh.position.set((x1 + x2) / 2, wandHoehe / 2, (z1 + z2) / 2)
      trennwandMesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
      trennwandMesh.castShadow = true
      trennwandMesh.receiveShadow = true
      scene.add(trennwandMesh)
    })

    // Elektrogeräte stehen auf dem höchsten Möbelstück, dessen 2D-Fläche sie überlappen
    const traegerHoehe = (item, cxPx, cyPx) => {
      let hoehe = 0
      furniture.forEach(f => {
        if (f.id === item.id || f.kategorie === 'Elektrogeräte' || f.istWandElement) return
        const frad = ((f.rotation || 0) * Math.PI) / 180
        const fbw = f.width * Math.abs(Math.cos(frad)) + f.height * Math.abs(Math.sin(frad))
        const fbh = f.width * Math.abs(Math.sin(frad)) + f.height * Math.abs(Math.cos(frad))
        if (cxPx >= f.left && cxPx <= f.left + fbw && cyPx >= f.top && cyPx <= f.top + fbh) {
          hoehe = Math.max(hoehe, getMoebelHoehe(f.name))
        }
      })
      return hoehe
    }

    furniture.forEach(item => {
      if (item.istWandElement) {
        const elBreite = item.width / 60
        const gruppe = new THREE.Group()
        
        // Position basierend auf Wand
        const wand = item.wand || 'nord'
        let px = 0
        let pz = 0
        let ry = 0

        if (wand === 'nord') {
          pz = -raumTiefe / 2
          px = (item.left / 60) - raumBreite / 2 + elBreite / 2
          ry = 0
        } else if (wand === 'sued') {
          pz = raumTiefe / 2
          px = (item.left / 60) - raumBreite / 2 + elBreite / 2
          ry = Math.PI
        } else if (wand === 'west') {
          px = -raumBreite / 2
          pz = (item.top / 60) - raumTiefe / 2 + elBreite / 2
          ry = Math.PI / 2
        } else if (wand === 'ost') {
          px = raumBreite / 2
          pz = (item.top / 60) - raumTiefe / 2 + elBreite / 2
          ry = -Math.PI / 2
        }

        gruppe.position.set(px, 0, pz)
        gruppe.rotation.y = ry

        if (item.typ === 'fenster') {
          const elHoehe = 1.2
          const yPos = wandHoehe * 0.55

          const rahmenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, metalness: 0.1 })
          const rahmen = new THREE.Mesh(new THREE.BoxGeometry(elBreite, elHoehe, 0.1), rahmenMat)
          rahmen.position.set(0, yPos, 0)
          rahmen.castShadow = true
          gruppe.add(rahmen)

          const glasMat = new THREE.MeshStandardMaterial({ 
            color: '#A8D8F0', transparent: true, opacity: 0.35,
            roughness: 0.0, metalness: 0.1,
          })
          const glas = new THREE.Mesh(new THREE.BoxGeometry(elBreite - 0.08, elHoehe - 0.08, 0.02), glasMat)
          glas.position.set(0, yPos, 0)
          gruppe.add(glas)

          const strebeMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6 })
          const strebeH = new THREE.Mesh(new THREE.BoxGeometry(elBreite - 0.06, 0.04, 0.06), strebeMat)
          strebeH.position.set(0, yPos, 0.02)
          gruppe.add(strebeH)

          const strebeV = new THREE.Mesh(new THREE.BoxGeometry(0.04, elHoehe - 0.06, 0.06), strebeMat)
          strebeV.position.set(0, yPos, 0.02)
          gruppe.add(strebeV)

          const bankMat = new THREE.MeshStandardMaterial({ color: '#E8E4DC', roughness: 0.4 })
          const bank = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.1, 0.05, 0.15), bankMat)
          bank.position.set(0, yPos - elHoehe/2 - 0.025, 0.08)
          gruppe.add(bank)

        } else {
          const elHoehe = 2.1
          const tuerMat = new THREE.MeshStandardMaterial({ color: '#C8A97A', roughness: 0.7, metalness: 0.0 })
          
          const tuer = new THREE.Mesh(new THREE.BoxGeometry(elBreite, elHoehe, 0.06), tuerMat)
          tuer.position.set(0, elHoehe / 2, 0.03)
          tuer.castShadow = true
          gruppe.add(tuer)

          const rahmenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6 })
          const rahmenL = new THREE.Mesh(new THREE.BoxGeometry(0.08, elHoehe + 0.1, 0.15), rahmenMat)
          rahmenL.position.set(-elBreite/2 - 0.04, elHoehe/2, 0)
          gruppe.add(rahmenL)

          const rahmenR = rahmenL.clone()
          rahmenR.position.x = elBreite/2 + 0.04
          gruppe.add(rahmenR)

          const rahmenO = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.16, 0.08, 0.15), rahmenMat)
          rahmenO.position.set(0, elHoehe + 0.04, 0)
          gruppe.add(rahmenO)

          const fuellungMat = new THREE.MeshStandardMaterial({ color: '#B8956A', roughness: 0.8 })
          const fuellung1 = new THREE.Mesh(new THREE.BoxGeometry(elBreite - 0.2, elHoehe * 0.4, 0.02), fuellungMat)
          fuellung1.position.set(0, elHoehe * 0.65, 0.06)
          gruppe.add(fuellung1)
          const fuellung2 = fuellung1.clone()
          fuellung2.position.y = elHoehe * 0.25
          gruppe.add(fuellung2)

          const knaufMat = new THREE.MeshStandardMaterial({ color: '#C8A050', roughness: 0.1, metalness: 0.9 })
          const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), knaufMat)
          knauf.position.set(elBreite/2 - 0.12, elHoehe * 0.5, 0.08)
          gruppe.add(knauf)

          const schluesselMat = new THREE.MeshStandardMaterial({ color: '#888780', metalness: 0.8, roughness: 0.2 })
          const schluessel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), schluesselMat)
          schluessel.position.set(elBreite/2 - 0.12, elHoehe * 0.5 - 0.08, 0.09)
          gruppe.add(schluessel)
        }
        scene.add(gruppe)
      } else {
        const moebelBreite = item.width  / 60
        const moebelTiefe  = item.height / 60
        const moebelHoehe  = getMoebelHoehe(item.name)

        const rad = ((item.rotation || 0) * Math.PI) / 180
        const boundWpx = item.width * Math.abs(Math.cos(rad)) + item.height * Math.abs(Math.sin(rad))
        const boundHpx = item.width * Math.abs(Math.sin(rad)) + item.height * Math.abs(Math.cos(rad))
        const centerXpx = item.left + boundWpx / 2
        const centerZpx = item.top  + boundHpx / 2

        const name = item.name.toLowerCase()
        const istDeckenleuchte = name.includes('deckenlampe') || name.includes('pendelleuchte') || name.includes('kronleuchter')

        const x = -raumBreite / 2 + (centerXpx / innenBpx) * raumBreite
        const z = -raumTiefe  / 2 + (centerZpx / innenTpx) * raumTiefe
        const y = istDeckenleuchte ? wandHoehe : (item.kategorie === 'Elektrogeräte' ? traegerHoehe(item, centerXpx, centerZpx) : 0)
        const rotation = -(item.rotation || 0) * Math.PI / 180
        const gruppe = new THREE.Group()
        gruppe.position.set(x, y, z)
        gruppe.rotation.y = rotation

        const mat = new THREE.MeshStandardMaterial({
          color: item.color,
          roughness: 0.7,
          metalness: 0.0,
        })
        const borderMat = new THREE.MeshStandardMaterial({
          color: item.border,
          roughness: 0.5,
          metalness: 0.1,
        })
        // Stoff-Textur (Polster/Bettwäsche) und Holz-Textur (Massivholz-Teile), auf Basis der Katalogfarbe eingefärbt
        const stoffMat = mat.clone()
        stoffMat.map = stoffTextur
        const holzMat = mat.clone()
        holzMat.map = holzTextur

        if (name.includes('ecksofa')) {
          const armTiefe = moebelTiefe * 0.55
          const chaiseBreite = Math.min(moebelBreite * 0.4, moebelBreite - 0.3)
          const chaiseX = -moebelBreite / 2 + chaiseBreite / 2
          const sitzHoehe = 0.4

          const sitzLang = new THREE.Mesh(new RoundedBoxGeometry(moebelBreite, 0.22, armTiefe, 2, 0.04), stoffMat)
          sitzLang.position.set(0, sitzHoehe, moebelTiefe / 2 - armTiefe / 2)
          sitzLang.castShadow = true
          gruppe.add(sitzLang)
          const lehneLang = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.48, 0.14), stoffMat)
          lehneLang.position.set(0, sitzHoehe + 0.31, moebelTiefe / 2 - 0.07)
          lehneLang.castShadow = true
          gruppe.add(lehneLang)

          const chaiseTiefe = moebelTiefe - armTiefe
          const sitzChaise = new THREE.Mesh(new RoundedBoxGeometry(chaiseBreite, 0.22, chaiseTiefe, 2, 0.04), stoffMat)
          sitzChaise.position.set(chaiseX, sitzHoehe, -armTiefe / 2)
          sitzChaise.castShadow = true
          gruppe.add(sitzChaise)
          const lehneChaise = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, chaiseTiefe), stoffMat)
          lehneChaise.position.set(chaiseX - chaiseBreite / 2 + 0.07, sitzHoehe + 0.31, -armTiefe / 2)
          gruppe.add(lehneChaise)

          const kissenAnzahl = Math.max(2, Math.round((moebelBreite - chaiseBreite) / 0.75))
          const kissenBreite = (moebelBreite - chaiseBreite) / kissenAnzahl
          for (let i = 0; i < kissenAnzahl; i++) {
            const kissen = new THREE.Mesh(new RoundedBoxGeometry(kissenBreite - 0.03, 0.14, armTiefe - 0.08, 2, 0.05), stoffMat)
            kissen.position.set(-moebelBreite / 2 + chaiseBreite + kissenBreite * (i + 0.5), sitzHoehe + 0.18, moebelTiefe / 2 - armTiefe / 2)
            gruppe.add(kissen)
          }

          // Beinhöhe reicht exakt bis zur Sitzfläche (Boden der Sitzkissen bei sitzHoehe - 0.11)
          const eckBeinHoehe = sitzHoehe - 0.11
          const beinMat = new THREE.MeshStandardMaterial({ color: '#5C4425', roughness: 0.55, map: holzTextur })
          const beinGeo = new THREE.CylinderGeometry(0.02, 0.028, eckBeinHoehe, 10)
          ;[
            [-moebelBreite / 2 + 0.06, moebelTiefe / 2 - 0.06],
            [moebelBreite / 2 - 0.06, moebelTiefe / 2 - 0.06],
            [moebelBreite / 2 - 0.06, -moebelTiefe / 2 + 0.06],
            [-moebelBreite / 2 + 0.06, -moebelTiefe / 2 + 0.06],
          ].forEach(([px, pz]) => {
            const bein = new THREE.Mesh(beinGeo, beinMat)
            bein.position.set(px, eckBeinHoehe / 2, pz)
            gruppe.add(bein)
          })

        } else if (name.includes('sofa') || name.includes('sessel')) {
          const sitzHoehe = 0.4
          const kissenAnzahl = name.includes('sessel') ? 1 : Math.max(2, Math.round(moebelBreite / 0.7))
          const kissenBreite = (moebelBreite - 0.14) / kissenAnzahl

          const sockel = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite - 0.06, 0.22, moebelTiefe * 0.72), stoffMat)
          sockel.position.set(0, sitzHoehe - 0.11, moebelTiefe * 0.06)
          sockel.castShadow = true
          gruppe.add(sockel)

          const knopfMat = new THREE.MeshStandardMaterial({ color: item.border, roughness: 0.6 })
          for (let i = 0; i < kissenAnzahl; i++) {
            const cx = -moebelBreite / 2 + 0.07 + kissenBreite * (i + 0.5)
            const kissen = new THREE.Mesh(new RoundedBoxGeometry(kissenBreite, 0.16, moebelTiefe * 0.62, 3, 0.05), stoffMat)
            kissen.position.set(cx, sitzHoehe + 0.08, moebelTiefe * 0.08)
            kissen.castShadow = true
            gruppe.add(kissen)

            const rkissen = new THREE.Mesh(new RoundedBoxGeometry(kissenBreite, moebelTiefe * 0.4, 0.16, 3, 0.05), stoffMat)
            rkissen.position.set(cx, sitzHoehe + moebelTiefe * 0.2 + 0.04, -moebelTiefe / 2 + 0.12)
            rkissen.rotation.x = -0.12
            rkissen.castShadow = true
            gruppe.add(rkissen)

            const knopf = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), knopfMat)
            knopf.position.set(cx, sitzHoehe + moebelTiefe * 0.2 + 0.06, -moebelTiefe / 2 + 0.2)
            gruppe.add(knopf)
          }

          const armGeo = new RoundedBoxGeometry(0.14, 0.34, moebelTiefe * 0.78, 2, 0.05)
          const armL = new THREE.Mesh(armGeo, stoffMat)
          armL.position.set(-moebelBreite / 2 + 0.07, sitzHoehe + 0.02, moebelTiefe * 0.04)
          armL.castShadow = true
          gruppe.add(armL)
          const armR = armL.clone()
          armR.position.x = moebelBreite / 2 - 0.07
          gruppe.add(armR)

          // Beinhöhe reicht exakt bis zur Unterkante des Sockels (sitzHoehe - 0.11 - 0.11)
          const sofaBeinHoehe = sitzHoehe - 0.22
          const beinMat = new THREE.MeshStandardMaterial({ color: '#5C4425', roughness: 0.55, map: holzTextur })
          const beinGeo = new THREE.CylinderGeometry(0.014, 0.024, sofaBeinHoehe, 10)
          ;[
            [-moebelBreite / 2 + 0.1, moebelTiefe / 2 - 0.1],
            [moebelBreite / 2 - 0.1, moebelTiefe / 2 - 0.1],
            [-moebelBreite / 2 + 0.1, -moebelTiefe / 2 + 0.1],
            [moebelBreite / 2 - 0.1, -moebelTiefe / 2 + 0.1],
          ].forEach(([px, pz]) => {
            const bein = new THREE.Mesh(beinGeo, beinMat)
            bein.position.set(px, sofaBeinHoehe / 2, pz)
            gruppe.add(bein)
          })

        } else if (name.includes('bett') && !name.includes('bank')) {
          const boxspring = name.includes('boxspring')
          const doppel = name.includes('doppel') || name.includes('boxspring') || moebelBreite > 1.4
          const beinMat = new THREE.MeshStandardMaterial({ color: '#5C4425', roughness: 0.6, map: holzTextur })
          let kissenBasisY

          if (boxspring) {
            const box = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.42, moebelTiefe), borderMat)
            box.position.set(0, 0.21, 0)
            box.castShadow = true
            gruppe.add(box)
            const topper = new THREE.Mesh(new RoundedBoxGeometry(moebelBreite - 0.06, 0.16, moebelTiefe - 0.06, 2, 0.04), stoffMat)
            topper.position.set(0, 0.5, 0)
            topper.castShadow = true
            gruppe.add(topper)

            const kopfBreite = moebelBreite
            const kopfHoehe = 0.85
            const kopfBasis = new THREE.Mesh(new THREE.BoxGeometry(kopfBreite, kopfHoehe, 0.1), mat)
            kopfBasis.position.set(0, kopfHoehe / 2 + 0.1, -moebelTiefe / 2 + 0.05)
            kopfBasis.castShadow = true
            gruppe.add(kopfBasis)
            const streifenMat = new THREE.MeshStandardMaterial({ color: item.border, roughness: 0.8 })
            const streifenAnzahl = Math.max(4, Math.round(kopfBreite / 0.22))
            for (let i = 1; i < streifenAnzahl; i++) {
              const sx = -kopfBreite / 2 + (kopfBreite / streifenAnzahl) * i
              const streifen = new THREE.Mesh(new THREE.BoxGeometry(0.015, kopfHoehe - 0.08, 0.02), streifenMat)
              streifen.position.set(sx, kopfHoehe / 2 + 0.1, -moebelTiefe / 2 + 0.005)
              gruppe.add(streifen)
            }
            // Kissen sollen auf der Topper-Oberfläche liegen (Topper-Oberkante 0.58 + halbe Kissenhöhe)
            kissenBasisY = 0.63
          } else {
            const matratze = new THREE.Mesh(new RoundedBoxGeometry(moebelBreite - 0.1, 0.22, moebelTiefe * 0.8, 2, 0.04), stoffMat)
            matratze.position.set(0, 0.32, moebelTiefe * 0.05)
            matratze.castShadow = true
            gruppe.add(matratze)
            const rahmen = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.18, moebelTiefe), borderMat)
            rahmen.position.set(0, 0.09, 0)
            rahmen.castShadow = true
            gruppe.add(rahmen)
            ;[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
              const bein = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.09, 8), beinMat)
              bein.position.set(sx * (moebelBreite / 2 - 0.08), 0.045, sz * (moebelTiefe / 2 - 0.08))
              gruppe.add(bein)
            })
            const kopf = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.55, 0.08), borderMat)
            kopf.position.set(0, 0.36, -moebelTiefe / 2 + 0.04)
            kopf.castShadow = true
            gruppe.add(kopf)
            // Kissen sollen auf der Matratzen-Oberfläche liegen (Matratzen-Oberkante 0.43 + halbe Kissenhöhe)
            kissenBasisY = 0.48
          }

          const kissenMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9, map: stoffTextur })
          if (doppel) {
            [-1, 1].forEach(s => {
              const kissen = new THREE.Mesh(new RoundedBoxGeometry(moebelBreite / 2 - 0.14, 0.1, 0.3, 2, 0.04), kissenMat)
              kissen.position.set(s * moebelBreite / 4, kissenBasisY, -moebelTiefe * 0.28)
              kissen.rotation.z = s * 0.03
              gruppe.add(kissen)
            })
          } else {
            const kissen = new THREE.Mesh(new RoundedBoxGeometry(moebelBreite - 0.2, 0.1, 0.3, 2, 0.04), kissenMat)
            kissen.position.set(0, kissenBasisY, -moebelTiefe * 0.28)
            gruppe.add(kissen)
          }
          const bettdeckeMat = new THREE.MeshStandardMaterial({ color: item.border, roughness: 0.85, map: stoffTextur })
          const bettdecke = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite - 0.16, 0.1, moebelTiefe * 0.22), bettdeckeMat)
          bettdecke.position.set(0, kissenBasisY, moebelTiefe * 0.32)
          gruppe.add(bettdecke)

        } else if ((name.includes('tisch') && !name.includes('lampe')) || name.includes('schreibtisch')) {
          const platte = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.05, moebelTiefe), holzMat)
          platte.position.set(0, moebelHoehe - 0.025, 0)
          platte.castShadow = true
          gruppe.add(platte)
          const kante = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite + 0.01, 0.014, moebelTiefe + 0.01), borderMat)
          kante.position.set(0, moebelHoehe - 0.005, 0)
          gruppe.add(kante)

          const beinMat = new THREE.MeshStandardMaterial({ color: item.border, roughness: 0.55, map: holzTextur })
          const beinHoehe = moebelHoehe - 0.05
          const beinPos = [
            [-moebelBreite/2+0.08,  moebelTiefe/2-0.08],
            [ moebelBreite/2-0.08,  moebelTiefe/2-0.08],
            [-moebelBreite/2+0.08, -moebelTiefe/2+0.08],
            [ moebelBreite/2-0.08, -moebelTiefe/2+0.08],
          ]
          beinPos.forEach(([px, pz]) => {
            const bein = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.032, beinHoehe, 12), beinMat)
            bein.position.set(px, beinHoehe / 2, pz)
            bein.castShadow = true
            gruppe.add(bein)
          })

        } else if (name.includes('stuhl') || name.includes('hocker')) {
          const istHocker = name.includes('hocker')
          const sitz = new THREE.Mesh(new RoundedBoxGeometry(moebelBreite, 0.05, moebelTiefe, 2, 0.03), stoffMat)
          sitz.position.set(0, 0.45, 0)
          sitz.castShadow = true
          gruppe.add(sitz)

          if (!istHocker) {
            const lamellenAnzahl = 3
            for (let i = 0; i < lamellenAnzahl; i++) {
              const lx = -moebelBreite / 2 + 0.05 + (moebelBreite - 0.1) / (lamellenAnzahl - 1) * i
              const lamelle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.03), holzMat)
              lamelle.position.set(lx, 0.68, -moebelTiefe / 2 + 0.02)
              lamelle.castShadow = true
              gruppe.add(lamelle)
            }
            const lehnenRahmen = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.04, 0.03), holzMat)
            lehnenRahmen.position.set(0, 0.87, -moebelTiefe / 2 + 0.02)
            gruppe.add(lehnenRahmen)
          }

          const beinMat = new THREE.MeshStandardMaterial({ color: item.border, roughness: 0.5, map: holzTextur })
          const beinPos = [
            [-moebelBreite/2+0.04,  moebelTiefe/2-0.04],
            [ moebelBreite/2-0.04,  moebelTiefe/2-0.04],
            [-moebelBreite/2+0.04, -moebelTiefe/2+0.04],
            [ moebelBreite/2-0.04, -moebelTiefe/2+0.04],
          ]
          beinPos.forEach(([px, pz]) => {
            const bein = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 0.45, 10), beinMat)
            bein.position.set(px, 0.225, pz)
            gruppe.add(bein)
          })

        } else if (name.includes('regal')) {
          const dicke = 0.025
          const wangeL = new THREE.Mesh(new THREE.BoxGeometry(dicke, moebelHoehe, moebelTiefe), holzMat)
          wangeL.position.set(-moebelBreite / 2 + dicke / 2, moebelHoehe / 2, 0)
          wangeL.castShadow = true
          gruppe.add(wangeL)
          const wangeR = wangeL.clone()
          wangeR.position.x = moebelBreite / 2 - dicke / 2
          gruppe.add(wangeR)

          const rueckwandMat = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.8, transparent: true, opacity: 0.5, map: holzTextur })
          const rueckwand = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite - dicke * 2, moebelHoehe, 0.012), rueckwandMat)
          rueckwand.position.set(0, moebelHoehe / 2, -moebelTiefe / 2 + 0.01)
          gruppe.add(rueckwand)

          const fachAnzahl = Math.max(2, Math.round(moebelHoehe / 0.35))
          for (let i = 0; i <= fachAnzahl; i++) {
            const fy = Math.max(0.02, Math.min((moebelHoehe / fachAnzahl) * i, moebelHoehe - 0.01))
            const fach = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite - dicke * 2, 0.02, moebelTiefe - 0.02), holzMat)
            fach.position.set(0, fy, 0)
            fach.castShadow = true
            gruppe.add(fach)
          }

        } else if (name.includes('schrank') || name.includes('sideboard') || name.includes('kommode') || name.includes('vitrine') || name.includes('board')) {
          const istVitrine = name.includes('vitrine')
          const plintheHoehe = Math.min(0.06, moebelHoehe * 0.1)

          const plinthe = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite - 0.04, plintheHoehe, moebelTiefe - 0.04),
            new THREE.MeshStandardMaterial({ color: '#3A3A38', roughness: 0.7 }))
          plinthe.position.set(0, plintheHoehe / 2, 0)
          gruppe.add(plinthe)

          const korpusHoehe = moebelHoehe - plintheHoehe
          const korpus = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, korpusHoehe, moebelTiefe), holzMat)
          korpus.position.set(0, plintheHoehe + korpusHoehe / 2, 0)
          korpus.castShadow = true
          gruppe.add(korpus)

          const anzahlTueren = Math.max(1, Math.round(moebelBreite / 0.55))
          const tuerBreite = moebelBreite / anzahlTueren
          const panelMat = istVitrine
            ? new THREE.MeshStandardMaterial({ color: '#CFE8F0', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35 })
            : new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.6, map: holzTextur })
          const griffMat = new THREE.MeshStandardMaterial({ color: '#8A8680', roughness: 0.3, metalness: 0.7 })
          for (let i = 0; i < anzahlTueren; i++) {
            const tx = -moebelBreite / 2 + tuerBreite * (i + 0.5)
            const panelGeo = new THREE.BoxGeometry(tuerBreite - 0.03, korpusHoehe - 0.06, 0.015)
            const panel = new THREE.Mesh(panelGeo, panelMat)
            panel.position.set(tx, plintheHoehe + korpusHoehe / 2, moebelTiefe / 2 + 0.008)
            gruppe.add(panel)
            if (istVitrine) {
              const rahmen = new THREE.LineSegments(new THREE.EdgesGeometry(panelGeo), new THREE.LineBasicMaterial({ color: item.border }))
              rahmen.position.copy(panel.position)
              gruppe.add(rahmen)
            }
            const seite = i < anzahlTueren / 2 ? 1 : -1
            const griff = new THREE.Mesh(new THREE.BoxGeometry(0.014, korpusHoehe * 0.18, 0.02), griffMat)
            griff.position.set(tx + seite * (tuerBreite * 0.32), plintheHoehe + korpusHoehe / 2, moebelTiefe / 2 + 0.02)
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

        } else if (item.kategorie === 'Elektrogeräte') {
          const minSeite = Math.min(moebelBreite, moebelTiefe)
          const dunkelMat = new THREE.MeshStandardMaterial({ color: '#2C2C2A', roughness: 0.5, metalness: 0.2 })

          if (name.includes('lautsprecher')) {
            const koerper = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe), mat)
            koerper.position.set(0, moebelHoehe / 2, 0)
            koerper.castShadow = true
            gruppe.add(koerper)
            const woofer = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.32, minSeite * 0.32, 0.02, 20), dunkelMat)
            woofer.rotation.x = Math.PI / 2
            woofer.position.set(0, moebelHoehe * 0.35, moebelTiefe / 2 + 0.01)
            gruppe.add(woofer)
            const tweeter = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.16, minSeite * 0.16, 0.02, 20), dunkelMat)
            tweeter.rotation.x = Math.PI / 2
            tweeter.position.set(0, moebelHoehe * 0.75, moebelTiefe / 2 + 0.01)
            gruppe.add(tweeter)

          } else if (name.includes('konsole')) {
            const koerper = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe), mat)
            koerper.position.set(0, moebelHoehe / 2, 0)
            koerper.castShadow = true
            gruppe.add(koerper)
            const led = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.01, 12),
              new THREE.MeshStandardMaterial({ color: '#5FD0F0', emissive: '#2090C0', emissiveIntensity: 0.6 }))
            led.position.set(moebelBreite / 2 - 0.04, moebelHoehe + 0.005, moebelTiefe / 2 - 0.04)
            gruppe.add(led)

          } else if (name.includes('laptop')) {
            const basis = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, 0.015, moebelTiefe), mat)
            basis.position.set(0, 0.015, 0)
            basis.castShadow = true
            gruppe.add(basis)
            const bildschirm = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelTiefe * 0.85, 0.015), borderMat)
            bildschirm.position.set(0, moebelTiefe * 0.4, -moebelTiefe / 2 + 0.02)
            bildschirm.rotation.x = -Math.PI / 2.6
            gruppe.add(bildschirm)

          } else if (name.includes('router')) {
            const koerper = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe), mat)
            koerper.position.set(0, moebelHoehe / 2, 0)
            gruppe.add(koerper)
            const antenneGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8)
            const a1 = new THREE.Mesh(antenneGeo, dunkelMat)
            a1.position.set(-moebelBreite / 4, moebelHoehe + 0.06, 0)
            a1.rotation.z = 0.2
            gruppe.add(a1)
            const a2 = a1.clone()
            a2.position.x = moebelBreite / 4
            a2.rotation.z = -0.2
            gruppe.add(a2)

          } else if (name.includes('toaster')) {
            const koerper = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe), mat)
            koerper.position.set(0, moebelHoehe / 2, 0)
            koerper.castShadow = true
            gruppe.add(koerper)
            const schlitz1 = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.55, 0.01, moebelTiefe * 0.15), dunkelMat)
            schlitz1.position.set(0, moebelHoehe + 0.005, -moebelTiefe * 0.15)
            gruppe.add(schlitz1)
            const schlitz2 = schlitz1.clone()
            schlitz2.position.z = moebelTiefe * 0.15
            gruppe.add(schlitz2)

          } else if (name.includes('wasserkocher')) {
            const radius = minSeite / 2
            const koerper = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.85, radius, moebelHoehe, 20), mat)
            koerper.position.set(0, moebelHoehe / 2, 0)
            koerper.castShadow = true
            gruppe.add(koerper)
            const henkel = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.55, 0.015, 8, 16, Math.PI), borderMat)
            henkel.position.set(0, moebelHoehe * 0.7, -radius * 0.7)
            henkel.rotation.y = Math.PI / 2
            gruppe.add(henkel)
            const tuelle = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 8), mat)
            tuelle.position.set(0, moebelHoehe * 0.75, radius * 0.85)
            tuelle.rotation.x = Math.PI / 2.5
            gruppe.add(tuelle)

          } else if (name.includes('kaffeemaschine')) {
            const oben = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe * 0.6, moebelTiefe), mat)
            oben.position.set(0, moebelHoehe * 0.7, 0)
            oben.castShadow = true
            gruppe.add(oben)
            const kanne = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.32, minSeite * 0.28, moebelHoehe * 0.4, 16),
              new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.75 }))
            kanne.position.set(0, moebelHoehe * 0.2, moebelTiefe * 0.1)
            gruppe.add(kanne)

          } else if (name.includes('ventilator')) {
            const basis = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.4, minSeite * 0.45, 0.02, 20), dunkelMat)
            basis.position.set(0, 0.01, 0)
            gruppe.add(basis)
            const stange = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, moebelHoehe - 0.1, 8), dunkelMat)
            stange.position.set(0, (moebelHoehe - 0.1) / 2 + 0.02, 0)
            gruppe.add(stange)
            const kopf = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.45, minSeite * 0.45, 0.05, 20), mat)
            kopf.rotation.x = Math.PI / 2
            kopf.position.set(0, moebelHoehe - 0.05, 0)
            kopf.castShadow = true
            gruppe.add(kopf)

          } else {
            const geo = new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe)
            const mesh = new THREE.Mesh(geo, mat)
            mesh.position.set(0, moebelHoehe / 2, 0)
            mesh.castShadow = true
            gruppe.add(mesh)
          }

        } else if (name.includes('kronleuchter')) {
          const radius = Math.min(moebelBreite, moebelTiefe) / 2
          const kabelLaenge = 0.25
          const glowMat = new THREE.MeshStandardMaterial({ color: '#FFF3D0', emissive: '#FFDA88', emissiveIntensity: 0.9 })

          const kabel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, kabelLaenge, 8), borderMat)
          kabel.position.set(0, -kabelLaenge / 2, 0)
          gruppe.add(kabel)

          const hub = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.22, 12, 10), borderMat)
          hub.position.set(0, -kabelLaenge, 0)
          gruppe.add(hub)

          const armAnzahl = 5
          for (let i = 0; i < armAnzahl; i++) {
            const winkel = (i / armAnzahl) * Math.PI * 2
            const armLaenge = radius * 0.85
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, armLaenge, 6), borderMat)
            arm.position.set(Math.cos(winkel) * armLaenge / 2, -kabelLaenge - 0.03, Math.sin(winkel) * armLaenge / 2)
            arm.rotation.z = Math.PI / 2
            arm.rotation.y = -winkel
            gruppe.add(arm)
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.15, 12, 10), glowMat)
            bulb.position.set(Math.cos(winkel) * armLaenge, -kabelLaenge - 0.06, Math.sin(winkel) * armLaenge)
            gruppe.add(bulb)
          }

          const licht = new THREE.PointLight(0xfff0c8, 0.9, Math.max(raumBreite, raumTiefe) * 0.8)
          licht.position.set(0, -kabelLaenge, 0)
          gruppe.add(licht)

        } else if (istDeckenleuchte) {
          // Deckenlampe / Pendelleuchte
          const radius = Math.min(moebelBreite, moebelTiefe) / 2
          const kabelLaenge = name.includes('pendelleuchte') ? 0.4 : 0.08
          const glowMat = new THREE.MeshStandardMaterial({ color: '#FFF3D0', emissive: '#FFDA88', emissiveIntensity: 0.9 })

          const kabel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, kabelLaenge, 8), borderMat)
          kabel.position.set(0, -kabelLaenge / 2, 0)
          gruppe.add(kabel)

          const schirm = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), mat)
          schirm.position.set(0, -kabelLaenge, 0)
          schirm.castShadow = true
          gruppe.add(schirm)

          const bulb = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.28, 12, 10), glowMat)
          bulb.position.set(0, -kabelLaenge - radius * 0.35, 0)
          gruppe.add(bulb)

          const licht = new THREE.PointLight(0xfff0c8, 0.7, Math.max(raumBreite, raumTiefe) * 0.7)
          licht.position.set(0, -kabelLaenge - radius * 0.3, 0)
          gruppe.add(licht)

        } else if (name.includes('lampe') || name.includes('leuchte')) {
          // Steh-/Tisch-/Wandlampe: Fuß, Stange, Lampenschirm
          const radius = Math.min(moebelBreite, moebelTiefe) / 2
          const glowMat = new THREE.MeshStandardMaterial({ color: '#FFF3D0', emissive: '#FFDA88', emissiveIntensity: 0.8 })

          const basis = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius, 0.02, 20), borderMat)
          basis.position.set(0, 0.01, 0)
          gruppe.add(basis)

          const stangeHoehe = Math.max(0.05, moebelHoehe - radius * 1.3)
          const stange = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, stangeHoehe, 8), borderMat)
          stange.position.set(0, 0.02 + stangeHoehe / 2, 0)
          gruppe.add(stange)

          const schirm = new THREE.Mesh(new THREE.ConeGeometry(radius, radius * 1.1, 20, 1, true), mat)
          schirm.position.set(0, moebelHoehe - radius * 0.5, 0)
          schirm.castShadow = true
          gruppe.add(schirm)

          const bulb = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.22, 12, 10), glowMat)
          bulb.position.set(0, moebelHoehe - radius * 0.6, 0)
          gruppe.add(bulb)

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
  resizeObserver.disconnect()
  mount.removeChild(renderer.domElement)
  renderer.dispose()
}
  }, [room, furniture, fussleiste, fussleisteFarbe, raumHoehe])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
  )
}

// === PROZEDURALE CANVAS-TEXTUREN ===

function erzeugeHolzTextur() {
  const groesse = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, groesse, groesse)
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * groesse
    const dunkel = 0.08 + Math.random() * 0.16
    ctx.strokeStyle = `rgba(90,60,25,${dunkel.toFixed(2)})`
    ctx.lineWidth = 0.6 + Math.random() * 1.8
    ctx.beginPath()
    let x = 0
    ctx.moveTo(x, y)
    while (x < groesse) {
      x += 6
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3 + (Math.random() - 0.5) * 1.5)
    }
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function erzeugeStoffTextur() {
  const groesse = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, groesse, groesse)
  const zellen = 24
  const zellGroesse = groesse / zellen
  for (let y = 0; y < zellen; y++) {
    for (let x = 0; x < zellen; x++) {
      const hell = 222 + Math.floor(Math.random() * 30)
      ctx.fillStyle = `rgb(${hell},${hell},${hell})`
      ctx.fillRect(x * zellGroesse, y * zellGroesse, zellGroesse, zellGroesse)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 6)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function erzeugeBodenTextur(bodenTyp, breiteM, tiefeM) {
  const groesse = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = getBodenFarbe(bodenTyp)
  ctx.fillRect(0, 0, groesse, groesse)

  if (bodenTyp === 'boden-parkett' || bodenTyp === 'boden-laminat') {
    const dielenBreite = groesse / 10
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 24; j++) {
        const x = i * dielenBreite + Math.random() * dielenBreite
        const y = Math.random() * groesse
        ctx.strokeStyle = `rgba(70,40,15,${(0.05 + Math.random() * 0.1).toFixed(2)})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + (Math.random() - 0.5) * 10, y + 20 + Math.random() * 30)
        ctx.stroke()
      }
    }
    ctx.strokeStyle = 'rgba(60,35,10,0.35)'
    ctx.lineWidth = 2
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath()
      ctx.moveTo(i * dielenBreite, 0)
      ctx.lineTo(i * dielenBreite, groesse)
      ctx.stroke()
    }
  } else if (bodenTyp === 'boden-fliesen') {
    const fliesenAnzahl = 6
    const fliesenGroesse = groesse / fliesenAnzahl
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * groesse, y = Math.random() * groesse
      ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.08).toFixed(2)})`
      ctx.fillRect(x, y, 2, 2)
    }
    ctx.strokeStyle = 'rgba(150,145,135,0.8)'
    ctx.lineWidth = 3
    for (let i = 0; i <= fliesenAnzahl; i++) {
      ctx.beginPath(); ctx.moveTo(i * fliesenGroesse, 0); ctx.lineTo(i * fliesenGroesse, groesse); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * fliesenGroesse); ctx.lineTo(groesse, i * fliesenGroesse); ctx.stroke()
    }
  } else if (bodenTyp === 'boden-teppich') {
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * groesse, y = Math.random() * groesse
      const hell = Math.random() * 40 - 20
      ctx.fillStyle = hell > 0 ? `rgba(255,255,255,${(hell / 100).toFixed(2)})` : `rgba(0,0,0,${(-hell / 100).toFixed(2)})`
      ctx.fillRect(x, y, 1.5, 1.5)
    }
  } else if (bodenTyp === 'boden-beton') {
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * groesse, y = Math.random() * groesse
      const r = 5 + Math.random() * 20
      const hell = Math.random() > 0.5
      ctx.fillStyle = hell ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
  } else {
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * groesse, y = Math.random() * groesse
      ctx.fillStyle = `rgba(0,0,0,${(Math.random() * 0.02).toFixed(2)})`
      ctx.fillRect(x, y, 2, 2)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(Math.max(1, Math.round(breiteM)), Math.max(1, Math.round(tiefeM)))
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function erzeugeUmgebungsTextur() {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, 16)
  gradient.addColorStop(0, '#dfe9f0')
  gradient.addColorStop(0.5, '#f5f4f0')
  gradient.addColorStop(1, '#c9c2b0')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 16, 16)
  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
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
    'Sofa': 0.4, 'Sessel': 0.4, 'Sofa 2-Sitzer': 0.4, 'Sofa 3-Sitzer': 0.4, 'Ecksofa': 0.42,
    'Einzelbett': 0.6, 'Doppelbett': 0.6, 'Boxspringbett': 0.65,
    'Esstisch': 0.75, 'Couchtisch': 0.45,
    'Schreibtisch': 0.75, 'TV-Board': 0.5, 'Sideboard': 0.8,
    'Kleiderschrank': 2.1, 'Regal': 1.8, 'Bücherregal': 1.8,
    'Kühlschrank': 1.8, 'Herd': 0.9, 'Spüle': 0.9,
    'WC': 0.8, 'Badewanne': 0.6, 'Dusche': 2.0,
    'Waschmaschine': 0.85, 'Pflanze': 1.2, 'Großpflanze': 1.8,
    'Lampe': 1.5, 'Stehlampe': 1.7, 'TV': 0.1,
    'Lautsprecher': 0.4, 'Spielekonsole': 0.08, 'Laptop': 0.02,
    'Router': 0.04, 'Toaster': 0.2, 'Wasserkocher': 0.25,
    'Kaffeemaschine': 0.35, 'Ventilator': 0.9,
    'Teppich klein': 0.02, 'Teppich groß': 0.02, 'Bild': 0.03,
    'Sitzbank': 0.45, 'Barhocker': 0.75, 'Sofa 1-Sitzer': 0.4, 'Schminktisch': 0.75, 'Bettbank': 0.45,
    'Rollcontainer': 0.6, 'Konferenztisch': 0.75, 'Backofen': 0.6, 'Dunstabzugshaube': 0.15,
    'Duschkabine Eck': 2.0, 'Bidet': 0.8,
    'Vase': 0.3, 'Kerzenständer': 0.25, 'Wanduhr': 0.03, 'Kissen': 0.15,
    'Globus': 0.4, 'Skulptur': 0.5, 'Kaktus': 0.6, 'Lichterkette': 0.05,
    'Deckenlampe': 0.3, 'Pendelleuchte': 0.35, 'Wandleuchte': 0.2, 'Kronleuchter': 0.45, 'Tischlampe': 0.45,
  }
  return hoehen[name] || 0.75
}
