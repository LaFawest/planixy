import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { getMoebelHoehe } from '../texturen'

function baueBeine(gruppe, positionen, radius, hoehe, farbe, holzTextur, { segmente = 10, roughness = 0.55, castShadow = false } = {}) {
  const [radiusOben, radiusUnten] = Array.isArray(radius) ? radius : [radius, radius]
  const beinMat = new THREE.MeshStandardMaterial({ color: farbe, roughness, map: holzTextur })
  const beinGeo = new THREE.CylinderGeometry(radiusOben, radiusUnten, hoehe, segmente)
  positionen.forEach(([px, pz]) => {
    const bein = new THREE.Mesh(beinGeo, beinMat)
    bein.position.set(px, hoehe / 2, pz)
    if (castShadow) bein.castShadow = true
    gruppe.add(bein)
  })
}

// Gemeinsamer Teil aller Leuchten: Glühmaterial, optional Kabel (Aufhängung) und optional PointLight (echte Lichtquelle)
function baueGluehlampe(gruppe, borderMat, glowIntensity, kabel, licht) {
  const glowMat = new THREE.MeshStandardMaterial({ color: '#FFF3D0', emissive: '#FFDA88', emissiveIntensity: glowIntensity })
  if (kabel) {
    const kabelMesh = new THREE.Mesh(new THREE.CylinderGeometry(kabel.radius, kabel.radius, kabel.laenge, 8), borderMat)
    kabelMesh.position.set(0, -kabel.laenge / 2, 0)
    gruppe.add(kabelMesh)
  }
  if (licht) {
    const lichtMesh = new THREE.PointLight(0xfff0c8, licht.intensitaet, licht.reichweite)
    lichtMesh.position.set(0, licht.y, 0)
    gruppe.add(lichtMesh)
  }
  return glowMat
}

function baueGeraeteBox(gruppe, breite, hoehe, tiefe, material) {
  const koerper = new THREE.Mesh(new THREE.BoxGeometry(breite, hoehe, tiefe), material)
  koerper.position.set(0, hoehe / 2, 0)
  koerper.castShadow = true
  gruppe.add(koerper)
  return koerper
}

// outlineFarbe steuert zugleich, ob eine Kanten-Outline gezeichnet wird (undefined = keine Outline)
function baueStandardBox(gruppe, breite, hoehe, tiefe, material, outlineFarbe) {
  const geo = new THREE.BoxGeometry(breite, hoehe, tiefe)
  const mesh = new THREE.Mesh(geo, material)
  mesh.position.set(0, hoehe / 2, 0)
  mesh.castShadow = true
  gruppe.add(mesh)
  if (outlineFarbe) {
    mesh.receiveShadow = true
    const edges = new THREE.EdgesGeometry(geo)
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: outlineFarbe }))
    line.position.copy(mesh.position)
    gruppe.add(line)
  }
}

// === MÖBEL (Aufbau der Einrichtungsgegenstände inkl. Elektrogeräte-Sonderfälle) ===
export function baueMoebel(scene, item, furniture, raumBreite, raumTiefe, wandHoehe, stoffTextur, holzTextur) {
  const wandDicke = 8
  const innenBpx = raumBreite * 60 - wandDicke * 2
  const innenTpx = raumTiefe  * 60 - wandDicke * 2

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
    baueBeine(gruppe, [
      [-moebelBreite / 2 + 0.06, moebelTiefe / 2 - 0.06],
      [moebelBreite / 2 - 0.06, moebelTiefe / 2 - 0.06],
      [moebelBreite / 2 - 0.06, -moebelTiefe / 2 + 0.06],
      [-moebelBreite / 2 + 0.06, -moebelTiefe / 2 + 0.06],
    ], [0.02, 0.028], eckBeinHoehe, '#5C4425', holzTextur)

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
    baueBeine(gruppe, [
      [-moebelBreite / 2 + 0.1, moebelTiefe / 2 - 0.1],
      [moebelBreite / 2 - 0.1, moebelTiefe / 2 - 0.1],
      [-moebelBreite / 2 + 0.1, -moebelTiefe / 2 + 0.1],
      [moebelBreite / 2 - 0.1, -moebelTiefe / 2 + 0.1],
    ], [0.014, 0.024], sofaBeinHoehe, '#5C4425', holzTextur)

  } else if (name.includes('bett') && !name.includes('bank')) {
    const boxspring = name.includes('boxspring')
    const doppel = name.includes('doppel') || name.includes('boxspring') || moebelBreite > 1.4
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
      const bettBeinPos = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [sx * (moebelBreite / 2 - 0.08), sz * (moebelTiefe / 2 - 0.08)])
      baueBeine(gruppe, bettBeinPos, 0.02, 0.09, '#5C4425', holzTextur, { segmente: 8, roughness: 0.6 })
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

    const beinHoehe = moebelHoehe - 0.05
    baueBeine(gruppe, [
      [-moebelBreite/2+0.08,  moebelTiefe/2-0.08],
      [ moebelBreite/2-0.08,  moebelTiefe/2-0.08],
      [-moebelBreite/2+0.08, -moebelTiefe/2+0.08],
      [ moebelBreite/2-0.08, -moebelTiefe/2+0.08],
    ], [0.02, 0.032], beinHoehe, item.border, holzTextur, { segmente: 12, castShadow: true })

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

    baueBeine(gruppe, [
      [-moebelBreite/2+0.04,  moebelTiefe/2-0.04],
      [ moebelBreite/2-0.04,  moebelTiefe/2-0.04],
      [-moebelBreite/2+0.04, -moebelTiefe/2+0.04],
      [ moebelBreite/2-0.04, -moebelTiefe/2+0.04],
    ], [0.015, 0.022], 0.45, item.border, holzTextur, { roughness: 0.5 })

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
      baueGeraeteBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat)
      const woofer = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.32, minSeite * 0.32, 0.02, 20), dunkelMat)
      woofer.rotation.x = Math.PI / 2
      woofer.position.set(0, moebelHoehe * 0.35, moebelTiefe / 2 + 0.01)
      gruppe.add(woofer)
      const tweeter = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.16, minSeite * 0.16, 0.02, 20), dunkelMat)
      tweeter.rotation.x = Math.PI / 2
      tweeter.position.set(0, moebelHoehe * 0.75, moebelTiefe / 2 + 0.01)
      gruppe.add(tweeter)

    } else if (name.includes('konsole')) {
      baueGeraeteBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat)
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
      const koerper = baueGeraeteBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat)
      koerper.castShadow = false // Router-Gehäuse wirft im Original keinen Schatten
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
      baueGeraeteBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat)
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
      const oben = baueGeraeteBox(gruppe, moebelBreite, moebelHoehe * 0.6, moebelTiefe, mat)
      oben.position.y = moebelHoehe * 0.7 // sitzt erhöht über der Kanne, nicht auf halber eigener Höhe
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
      baueStandardBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat)
    }

  } else if (name.includes('kronleuchter')) {
    const radius = Math.min(moebelBreite, moebelTiefe) / 2
    const kabelLaenge = 0.25
    const glowMat = baueGluehlampe(gruppe, borderMat, 0.9,
      { radius: 0.008, laenge: kabelLaenge },
      { intensitaet: 0.9, reichweite: Math.max(raumBreite, raumTiefe) * 0.8, y: -kabelLaenge })

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

  } else if (istDeckenleuchte) {
    // Deckenlampe / Pendelleuchte
    const radius = Math.min(moebelBreite, moebelTiefe) / 2
    const kabelLaenge = name.includes('pendelleuchte') ? 0.4 : 0.08
    const glowMat = baueGluehlampe(gruppe, borderMat, 0.9,
      { radius: 0.01, laenge: kabelLaenge },
      { intensitaet: 0.7, reichweite: Math.max(raumBreite, raumTiefe) * 0.7, y: -kabelLaenge - radius * 0.3 })

    const schirm = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), mat)
    schirm.position.set(0, -kabelLaenge, 0)
    schirm.castShadow = true
    gruppe.add(schirm)

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.28, 12, 10), glowMat)
    bulb.position.set(0, -kabelLaenge - radius * 0.35, 0)
    gruppe.add(bulb)

  } else if (name.includes('lampe') || name.includes('leuchte')) {
    // Steh-/Tisch-/Wandlampe: Fuß, Stange, Lampenschirm
    const radius = Math.min(moebelBreite, moebelTiefe) / 2
    const glowMat = baueGluehlampe(gruppe, borderMat, 0.8, null, null)

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
    baueStandardBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat, item.border)
  }

  gruppe.castShadow = true
  scene.add(gruppe)
}
