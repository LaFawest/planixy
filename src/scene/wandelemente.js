import * as THREE from 'three'
import { HIMMELSRICHTUNG_JE_SEGMENT } from '../constants'

// === WANDELEMENTE (Tür/Fenster) ===
export function baueWandElement(scene, item, raumBreite, raumTiefe, wandHoehe) {
  const elBreite = item.width / 60
  const gruppe = new THREE.Group()

  // Position basierend auf Wand. item.left/item.top bleiben unverändert die Quelle für die
  // Position entlang der Wand (wie beim 2D-Rendering) — nur die Zuordnung zur Himmelsrichtung
  // kommt jetzt aus dem Segmentindex statt aus dem alten wand-String.
  const wand = HIMMELSRICHTUNG_JE_SEGMENT[item.wandSegment] || 'nord'
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
}
