import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { getMoebelHoehe } from '../texturen'
import { berechneInnenmasse } from '../constants'

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

// Gemeinsamer Teil aller Leuchten: Glühmaterial, optional Kabel (Aufhängung) und optional
// PointLight (echte Lichtquelle). eingeschaltet/farbe kommen aus item.lichtAn/item.farbtemperatur
// (siehe baueMoebel) — bei ausgeschalteter Leuchte bleibt die Glühbirnen-Geometrie stehen, glimmt
// aber nicht (emissiveIntensity 0) und es wird kein PointLight erzeugt.
function baueGluehlampe(gruppe, borderMat, glowIntensity, kabel, licht, eingeschaltet, farbe) {
  const glowMat = new THREE.MeshStandardMaterial({ color: '#FFF3D0', emissive: farbe || '#FFDA88', emissiveIntensity: eingeschaltet ? glowIntensity : 0 })
  if (kabel) {
    const kabelMesh = new THREE.Mesh(new THREE.CylinderGeometry(kabel.radius, kabel.radius, kabel.laenge, 8), borderMat)
    kabelMesh.position.set(0, -kabel.laenge / 2, 0)
    gruppe.add(kabelMesh)
  }
  if (licht && eingeschaltet) {
    const lichtMesh = new THREE.PointLight(farbe || 0xfff0c8, licht.intensitaet, licht.reichweite)
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
  const { innenBpx, innenTpx } = berechneInnenmasse(raumBreite, raumTiefe)

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
  // Nur für Leuchten (kategorie 'Licht') relevant — an/aus und Farbe je Leuchte, mit Warmweiß-
  // Default, solange der Licht-Schritt (Schritt 4f) noch keinen eigenen Regler dafür anbietet.
  const lichtAn = item.lichtAn !== false
  const lichtFarbe = item.farbtemperatur || '#fff0c8'

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
      { intensitaet: 0.9, reichweite: Math.max(raumBreite, raumTiefe) * 0.8, y: -kabelLaenge },
      lichtAn, lichtFarbe)

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
      { intensitaet: 0.7, reichweite: Math.max(raumBreite, raumTiefe) * 0.7, y: -kabelLaenge - radius * 0.3 },
      lichtAn, lichtFarbe)

    const schirm = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), mat)
    schirm.position.set(0, -kabelLaenge, 0)
    schirm.castShadow = true
    gruppe.add(schirm)

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.28, 12, 10), glowMat)
    bulb.position.set(0, -kabelLaenge - radius * 0.35, 0)
    gruppe.add(bulb)

  } else if (name.includes('wandleuchte')) {
    // Wandlampe: kompakte Rückplatte + kurzer Arm + Schirm, bewusst ohne Bodenfuß/Stange (im
    // Unterschied zum generischen Steh-/Tischlampen-Zweig unten) — muss deshalb VOR diesem
    // stehen, sonst matcht 'wandleuchte' bereits dessen 'leuchte'-Check und wird nie erreicht.
    const radius = Math.min(moebelBreite, moebelTiefe) / 2
    const mitteHoehe = moebelHoehe * 0.6
    const glowMat = baueGluehlampe(gruppe, borderMat, 0.8, null,
      { intensitaet: 0.4, reichweite: Math.max(raumBreite, raumTiefe) * 0.4, y: mitteHoehe },
      lichtAn, lichtFarbe)

    const rueckplatte = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.7, radius, 0.02), borderMat)
    rueckplatte.position.set(0, mitteHoehe, -moebelTiefe / 2 + 0.01)
    gruppe.add(rueckplatte)

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, moebelTiefe * 0.4, 8), borderMat)
    arm.rotation.x = Math.PI / 2
    arm.position.set(0, mitteHoehe, -moebelTiefe / 2 + moebelTiefe * 0.2 + 0.01)
    gruppe.add(arm)

    const schirm = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.55, radius * 0.65, 16, 1, true), mat)
    schirm.rotation.x = Math.PI / 2
    schirm.position.set(0, mitteHoehe, -moebelTiefe / 2 + moebelTiefe * 0.42)
    schirm.castShadow = true
    gruppe.add(schirm)

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.16, 10, 8), glowMat)
    bulb.position.copy(schirm.position)
    gruppe.add(bulb)

  } else if (name.includes('lampe') || name.includes('leuchte')) {
    // Steh-/Tisch-/Wandlampe: Fuß, Stange, Lampenschirm
    const radius = Math.min(moebelBreite, moebelTiefe) / 2
    const glowMat = baueGluehlampe(gruppe, borderMat, 0.8, null,
      { intensitaet: 0.5, reichweite: Math.max(raumBreite, raumTiefe) * 0.5, y: moebelHoehe - radius * 0.6 },
      lichtAn, lichtFarbe)

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

  } else if (name.includes('badewanne')) {
    const wannenRadius = Math.min(moebelHoehe, moebelTiefe) * 0.35
    const wannenMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.3, metalness: 0.05 })
    const wanne = new THREE.Mesh(new RoundedBoxGeometry(moebelBreite, moebelHoehe, moebelTiefe, 4, wannenRadius), wannenMat)
    wanne.position.set(0, moebelHoehe / 2, 0)
    wanne.castShadow = true
    gruppe.add(wanne)

    const wasserMat = new THREE.MeshStandardMaterial({ color: '#B7DDF4', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 })
    const wasser = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.82, 0.02, moebelTiefe * 0.72), wasserMat)
    wasser.position.set(0, moebelHoehe * 0.82, 0)
    gruppe.add(wasser)

  } else if (name.includes('dusche') || name.includes('duschkabine')) {
    // Dusche und Duschkabine Eck teilen sich dieselbe Grundform (Glaswände + Duschkopf + Bodenwanne)
    const glasMat = new THREE.MeshStandardMaterial({ color: '#CFE8F0', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35 })
    const chromMat = new THREE.MeshStandardMaterial({ color: '#B0AFA8', roughness: 0.3, metalness: 0.7 })
    const wannenHoehe = 0.06

    const wanne = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite - 0.02, wannenHoehe, moebelTiefe - 0.02),
      new THREE.MeshStandardMaterial({ color: '#F0F0F0', roughness: 0.4 }))
    wanne.position.set(0, wannenHoehe / 2, 0)
    wanne.castShadow = true
    gruppe.add(wanne)

    const glasHoehe = moebelHoehe - wannenHoehe
    const glasDicke = 0.015
    const rueckwand = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, glasHoehe, glasDicke), glasMat)
    rueckwand.position.set(0, wannenHoehe + glasHoehe / 2, -moebelTiefe / 2 + glasDicke / 2)
    gruppe.add(rueckwand)
    const seitenwand = new THREE.Mesh(new THREE.BoxGeometry(glasDicke, glasHoehe, moebelTiefe), glasMat)
    seitenwand.position.set(-moebelBreite / 2 + glasDicke / 2, wannenHoehe + glasHoehe / 2, 0)
    gruppe.add(seitenwand)

    const duschkopfArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, moebelTiefe * 0.25, 8), chromMat)
    duschkopfArm.rotation.x = Math.PI / 2
    duschkopfArm.position.set(0, moebelHoehe - 0.15, -moebelTiefe / 2 + moebelTiefe * 0.13)
    gruppe.add(duschkopfArm)
    const duschkopf = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 16), chromMat)
    duschkopf.position.set(0, moebelHoehe - 0.19, -moebelTiefe / 2 + moebelTiefe * 0.25)
    gruppe.add(duschkopf)

  } else if (name.includes('wc') || name.includes('bidet')) {
    const istBidet = name.includes('bidet')
    const minSeite = Math.min(moebelBreite, moebelTiefe)
    const beckenHoehe = istBidet ? moebelHoehe * 0.5 : moebelHoehe * 0.55
    const beckenZ = moebelTiefe / 2 - minSeite * 0.42

    const becken = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.4, minSeite * 0.22, beckenHoehe, 20), mat)
    becken.position.set(0, beckenHoehe / 2, beckenZ)
    becken.castShadow = true
    gruppe.add(becken)

    const deckel = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.42, minSeite * 0.42, 0.03, 20), borderMat)
    deckel.position.set(0, beckenHoehe + 0.015, beckenZ)
    gruppe.add(deckel)

    if (!istBidet) {
      const spuelkastenHoehe = moebelHoehe * 0.55
      const spuelkasten = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.75, spuelkastenHoehe, 0.12), mat)
      spuelkasten.position.set(0, moebelHoehe - spuelkastenHoehe / 2, -moebelTiefe / 2 + 0.06)
      spuelkasten.castShadow = true
      gruppe.add(spuelkasten)
    }

  } else if (name.includes('waschbecken')) {
    const minSeite = Math.min(moebelBreite, moebelTiefe)
    const beckenOberkante = moebelHoehe - 0.06

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.12, minSeite * 0.16, beckenOberkante, 12), mat)
    stand.position.set(0, beckenOberkante / 2, 0)
    gruppe.add(stand)

    const becken = new THREE.Mesh(new RoundedBoxGeometry(moebelBreite * 0.92, 0.12, moebelTiefe * 0.9, 2, 0.05), mat)
    becken.position.set(0, beckenOberkante, 0)
    becken.castShadow = true
    gruppe.add(becken)

    const armatur = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 10), borderMat)
    armatur.position.set(0, beckenOberkante + 0.135, -moebelTiefe * 0.28)
    gruppe.add(armatur)

  } else if (name.includes('handtuchhalter')) {
    // Bewusst schlicht: nur Stange + zwei Halter, kein Handtuch-Mesh
    const barY = moebelHoehe * 0.55
    const stangenLaenge = moebelBreite * 0.85
    const stange = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, stangenLaenge, 10), borderMat)
    stange.rotation.z = Math.PI / 2
    stange.position.set(0, barY, 0)
    gruppe.add(stange)

    const halterMat = new THREE.MeshStandardMaterial({ color: '#8A8680', roughness: 0.3, metalness: 0.6 })
    const halterSeiten = [-1, 1]
    halterSeiten.forEach(s => {
      const halter = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.03), halterMat)
      halter.position.set(s * stangenLaenge / 2, barY, 0)
      gruppe.add(halter)
    })

  } else if (name.includes('waschmaschine')) {
    const minSeite = Math.min(moebelBreite, moebelTiefe)
    baueGeraeteBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat)

    const ringMat = new THREE.MeshStandardMaterial({ color: '#8A8680', roughness: 0.3, metalness: 0.6 })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(minSeite * 0.28, 0.015, 10, 24), ringMat)
    ring.position.set(0, moebelHoehe * 0.42, moebelTiefe / 2 + 0.005)
    gruppe.add(ring)

    const glasMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A', roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.85 })
    const glas = new THREE.Mesh(new THREE.CircleGeometry(minSeite * 0.24, 24), glasMat)
    glas.position.set(0, moebelHoehe * 0.42, moebelTiefe / 2 + 0.002)
    gruppe.add(glas)

    const bedienfeld = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.85, 0.02, moebelTiefe * 0.15), borderMat)
    bedienfeld.position.set(0, moebelHoehe + 0.01, -moebelTiefe * 0.35)
    gruppe.add(bedienfeld)

  } else if (name.includes('pflanze')) {
    // Pflanze und Großpflanze teilen sich dieselbe Grundform (Topf + überlappende Blattklumpen)
    const minSeite = Math.min(moebelBreite, moebelTiefe)
    const topfMat = new THREE.MeshStandardMaterial({ color: '#B5651D', roughness: 0.85 })
    const topfHoehe = moebelHoehe * 0.22
    const topf = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.4, minSeite * 0.3, topfHoehe, 14), topfMat)
    topf.position.set(0, topfHoehe / 2, 0)
    topf.castShadow = true
    gruppe.add(topf)

    const blattMat = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.8 })
    // [ox, oy, oz, größe] je Klumpen — unregelmäßig versetzt für den "Low-Poly-Pflanze"-Look
    const klumpen = [
      [0, 0.55, 0, 0.42],
      [0.12, 0.72, -0.06, 0.3],
      [-0.14, 0.68, 0.08, 0.32],
      [0.02, 0.9, 0.05, 0.26],
      [-0.08, 0.85, -0.1, 0.24],
    ]
    klumpen.forEach(([ox, oy, oz, groesse]) => {
      const blatt = new THREE.Mesh(new THREE.IcosahedronGeometry(minSeite * groesse, 0), blattMat)
      blatt.position.set(ox * minSeite, topfHoehe + oy * (moebelHoehe - topfHoehe), oz * minSeite)
      blatt.castShadow = true
      gruppe.add(blatt)
    })

  } else if (name.includes('teppich')) {
    baueStandardBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat, item.border)
    // Eingezogene zweite Outline knapp innerhalb des Rands als einfache "Fransen"-Andeutung
    const randGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(moebelBreite - 0.12, moebelHoehe, moebelTiefe - 0.12))
    const rand = new THREE.LineSegments(randGeo, new THREE.LineBasicMaterial({ color: item.border }))
    rand.position.set(0, moebelHoehe, 0)
    gruppe.add(rand)

  } else if (name.includes('bild')) {
    const rahmen = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe), borderMat)
    rahmen.position.set(0, moebelHoehe / 2, 0)
    rahmen.castShadow = true
    gruppe.add(rahmen)

    const leinwandHoehe = moebelHoehe * 0.55
    const leinwand = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.82, leinwandHoehe, moebelTiefe * 0.78), mat)
    leinwand.position.set(0, moebelHoehe * 0.6, 0)
    gruppe.add(leinwand)

  } else if (name.includes('kamin')) {
    const ummauerung = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe), mat)
    ummauerung.position.set(0, moebelHoehe / 2, 0)
    ummauerung.castShadow = true
    gruppe.add(ummauerung)

    const feuerHoehe = moebelHoehe * 0.55
    const feuerBreite = moebelBreite * 0.5
    const feuerTiefe = moebelTiefe * 0.5
    const feuerMat = new THREE.MeshStandardMaterial({ color: '#2A1410', roughness: 0.6, emissive: '#FF6A1F', emissiveIntensity: lichtAn ? 0.5 : 0 })
    const feuer = new THREE.Mesh(new THREE.BoxGeometry(feuerBreite, feuerHoehe, feuerTiefe), feuerMat)
    feuer.position.set(0, feuerHoehe / 2 + 0.03, moebelTiefe / 2 - feuerTiefe / 2 - 0.02)
    gruppe.add(feuer)

    if (lichtAn) {
      const glut = new THREE.PointLight('#FF8A3D', 0.5, Math.max(raumBreite, raumTiefe) * 0.3)
      glut.position.set(0, feuerHoehe * 0.4, moebelTiefe / 2 - feuerTiefe / 2)
      gruppe.add(glut)
    }

    const sims = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 1.08, 0.04, moebelTiefe * 0.55), borderMat)
    sims.position.set(0, moebelHoehe * 0.62, 0)
    gruppe.add(sims)

  } else if (name.includes('vase')) {
    const minSeite = Math.min(moebelBreite, moebelTiefe)
    const h = moebelHoehe
    const rBase = minSeite * 0.16
    const rBauch = minSeite * 0.46
    const rHals = minSeite * 0.16
    const rLippe = minSeite * 0.22
    // Vasen-Silhouette als Rotationskörper: schmaler Fuß, bauchige Mitte, verjüngter Hals, Lippe
    const profil = [
      new THREE.Vector2(rBase * 0.5, 0),
      new THREE.Vector2(rBase, h * 0.06),
      new THREE.Vector2(rBauch, h * 0.45),
      new THREE.Vector2(rBauch * 0.8, h * 0.68),
      new THREE.Vector2(rHals, h * 0.85),
      new THREE.Vector2(rLippe, h * 0.95),
      new THREE.Vector2(rLippe * 0.88, h),
    ]
    const vase = new THREE.Mesh(new THREE.LatheGeometry(profil, 16), mat)
    vase.castShadow = true
    gruppe.add(vase)

  } else if (name.includes('kerzenst')) {
    const fussHoehe = moebelHoehe * 0.85
    const fuss = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.022, fussHoehe, 12), borderMat)
    fuss.position.set(0, fussHoehe / 2, 0)
    fuss.castShadow = true
    gruppe.add(fuss)

    const flammeMat = baueGluehlampe(gruppe, borderMat, 1.0, null, null, lichtAn, '#FF8A3D')
    const flamme = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 8), flammeMat)
    flamme.position.set(0, fussHoehe + 0.02, 0)
    gruppe.add(flamme)

  } else if (name.includes('wanduhr')) {
    const radius = moebelBreite / 2
    const gehaeuseHoehe = Math.max(0.02, moebelHoehe * 0.5)
    const gehaeuse = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, gehaeuseHoehe, 24), borderMat)
    gehaeuse.position.set(0, gehaeuseHoehe / 2, 0)
    gruppe.add(gehaeuse)

    const zifferblattHoehe = Math.max(0.01, moebelHoehe - gehaeuseHoehe)
    const zifferblatt = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.85, radius * 0.85, zifferblattHoehe, 24), mat)
    zifferblatt.position.set(0, gehaeuseHoehe + zifferblattHoehe / 2, 0)
    gruppe.add(zifferblatt)

    // Zeiger-Geometrie per translate() so verschoben, dass ein Ende im Zifferblatt-Mittelpunkt
    // liegt — dadurch dreht rotation.y korrekt um die Uhrmitte statt um die Boxmitte
    const zeigerMat = new THREE.MeshStandardMaterial({ color: '#2C2C2A', roughness: 0.5 })
    const zeigerY = gehaeuseHoehe + zifferblattHoehe
    const stundeGeo = new THREE.BoxGeometry(0.012, 0.006, radius * 0.4)
    stundeGeo.translate(0, 0, radius * 0.2)
    const stunde = new THREE.Mesh(stundeGeo, zeigerMat)
    stunde.position.set(0, zeigerY, 0)
    gruppe.add(stunde)
    const minuteGeo = new THREE.BoxGeometry(0.008, 0.006, radius * 0.62)
    minuteGeo.translate(0, 0, radius * 0.31)
    const minute = new THREE.Mesh(minuteGeo, zeigerMat)
    minute.position.set(0, zeigerY, 0)
    minute.rotation.y = Math.PI / 3
    gruppe.add(minute)

  } else if (name.includes('kissen')) {
    const radius = Math.min(moebelBreite, moebelTiefe, moebelHoehe) * 0.18
    const kissen = new THREE.Mesh(new RoundedBoxGeometry(moebelBreite, moebelHoehe, moebelTiefe, 3, radius), stoffMat)
    kissen.position.set(0, moebelHoehe / 2, 0)
    kissen.castShadow = true
    gruppe.add(kissen)

  } else if (name.includes('globus')) {
    const minSeite = Math.min(moebelBreite, moebelTiefe)
    const kugelRadius = minSeite * 0.4
    const fussHoehe = Math.max(0.02, moebelHoehe - kugelRadius * 2)

    const stange = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, fussHoehe, 10), borderMat)
    stange.position.set(0, fussHoehe / 2, 0)
    gruppe.add(stange)
    const fuss = new THREE.Mesh(new THREE.CylinderGeometry(kugelRadius * 0.55, kugelRadius * 0.65, 0.02, 16), borderMat)
    fuss.position.set(0, 0.01, 0)
    gruppe.add(fuss)

    const ring = new THREE.Mesh(new THREE.TorusGeometry(kugelRadius * 1.05, 0.008, 8, 24), borderMat)
    ring.position.set(0, fussHoehe + kugelRadius, 0)
    gruppe.add(ring)

    const kugel = new THREE.Mesh(new THREE.SphereGeometry(kugelRadius, 20, 16), mat)
    kugel.position.set(0, fussHoehe + kugelRadius, 0)
    kugel.castShadow = true
    gruppe.add(kugel)

  } else if (name.includes('kaktus')) {
    const minSeite = Math.min(moebelBreite, moebelTiefe)
    const topfHoehe = moebelHoehe * 0.25
    const topfMat = new THREE.MeshStandardMaterial({ color: '#B5651D', roughness: 0.85 })
    const topf = new THREE.Mesh(new THREE.CylinderGeometry(minSeite * 0.38, minSeite * 0.28, topfHoehe, 12), topfMat)
    topf.position.set(0, topfHoehe / 2, 0)
    topf.castShadow = true
    gruppe.add(topf)

    const kaktusMat = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.75 })
    const koerperRadius = minSeite * 0.22
    const koerperLaenge = Math.max(0.02, moebelHoehe - topfHoehe - koerperRadius * 2)
    const koerper = new THREE.Mesh(new THREE.CapsuleGeometry(koerperRadius, koerperLaenge, 6, 12), kaktusMat)
    koerper.position.set(0, topfHoehe + koerperLaenge / 2 + koerperRadius, 0)
    koerper.castShadow = true
    gruppe.add(koerper)

    const armRadius = koerperRadius * 0.55
    const armLaenge = koerperLaenge * 0.4
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(armRadius, armLaenge, 4, 10), kaktusMat)
    arm.position.set(minSeite * 0.22, topfHoehe + koerperLaenge * 0.55, 0)
    arm.rotation.z = Math.PI / 2.2
    gruppe.add(arm)

  } else if (name.includes('skulptur')) {
    const minSeite = Math.min(moebelBreite, moebelTiefe)
    const sockelHoehe = moebelHoehe * 0.3
    const sockel = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.7, sockelHoehe, moebelTiefe * 0.7), mat)
    sockel.position.set(0, sockelHoehe / 2, 0)
    sockel.castShadow = true
    gruppe.add(sockel)

    const formRadius = minSeite * 0.35
    const form = new THREE.Mesh(new THREE.IcosahedronGeometry(formRadius, 0), mat)
    form.position.set(0, sockelHoehe + formRadius * 0.85, 0)
    form.rotation.set(0.4, 0.6, 0.2)
    form.castShadow = true
    gruppe.add(form)

  } else if (name.includes('lichterkette')) {
    const punkte = []
    const segmente = 4
    for (let i = 0; i <= segmente; i++) {
      const t = i / segmente
      punkte.push(new THREE.Vector3(-moebelBreite / 2 + moebelBreite * t, moebelHoehe * 0.4 + Math.sin(t * Math.PI) * moebelHoehe * 0.5, 0))
    }
    const kurve = new THREE.CatmullRomCurve3(punkte)
    const drahtMat = new THREE.MeshStandardMaterial({ color: '#4A4A46', roughness: 0.6 })
    const draht = new THREE.Mesh(new THREE.TubeGeometry(kurve, 24, 0.006, 6, false), drahtMat)
    gruppe.add(draht)

    const lichtMat = new THREE.MeshStandardMaterial({ color: '#FFF3D0', emissive: lichtFarbe, emissiveIntensity: lichtAn ? 0.9 : 0 })
    const anzahlLichter = 6
    for (let i = 0; i <= anzahlLichter; i++) {
      const punkt = kurve.getPoint(i / anzahlLichter)
      const licht = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), lichtMat)
      licht.position.copy(punkt)
      licht.position.y -= 0.02
      gruppe.add(licht)
    }

  } else if (name.includes('monitor')) {
    // Kompakter als der TV-Zweig: dünnerer Bildschirm auf kleinem Standfuß statt Bodenfuß
    const bildschirmHoehe = moebelHoehe * 0.85
    const standHoehe = moebelHoehe - bildschirmHoehe

    const fuss = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.35, 0.015, moebelTiefe * 0.6), borderMat)
    fuss.position.set(0, 0.0075, 0)
    gruppe.add(fuss)
    const hals = new THREE.Mesh(new THREE.BoxGeometry(0.03, standHoehe, 0.03), borderMat)
    hals.position.set(0, standHoehe / 2, 0)
    gruppe.add(hals)

    const screen = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, bildschirmHoehe, 0.025), mat)
    screen.position.set(0, standHoehe + bildschirmHoehe / 2, 0)
    screen.castShadow = true
    gruppe.add(screen)
    const rand = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite + 0.02, bildschirmHoehe + 0.02, 0.015), borderMat)
    rand.position.set(0, standHoehe + bildschirmHoehe / 2, -0.008)
    gruppe.add(rand)

  } else if (name.includes('rollcontainer')) {
    const korpus = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe, moebelTiefe), holzMat)
    korpus.position.set(0, moebelHoehe / 2, 0)
    korpus.castShadow = true
    gruppe.add(korpus)

    // Waagerechte Schubladen-Linien + Griffe statt der Tür/Griff-Optik des Schrank-Zweigs
    const schubladenAnzahl = 3
    const griffMat = new THREE.MeshStandardMaterial({ color: '#8A8680', roughness: 0.3, metalness: 0.7 })
    const linienMat = new THREE.MeshStandardMaterial({ color: item.border, roughness: 0.6 })
    const fachHoehe = moebelHoehe / schubladenAnzahl
    for (let i = 0; i < schubladenAnzahl; i++) {
      if (i > 0) {
        const linie = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite - 0.02, 0.008, 0.01), linienMat)
        linie.position.set(0, fachHoehe * i, moebelTiefe / 2 + 0.005)
        gruppe.add(linie)
      }
      const griff = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.3, 0.014, 0.02), griffMat)
      griff.position.set(0, fachHoehe * (i + 0.5), moebelTiefe / 2 + 0.02)
      gruppe.add(griff)
    }

    const rollenRadius = 0.02
    const rollenMat = new THREE.MeshStandardMaterial({ color: '#2C2C2A', roughness: 0.5 })
    const rollenPositionen = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
    rollenPositionen.forEach(([sx, sz]) => {
      const rolle = new THREE.Mesh(new THREE.SphereGeometry(rollenRadius, 10, 8), rollenMat)
      rolle.position.set(sx * (moebelBreite / 2 - 0.03), rollenRadius, sz * (moebelTiefe / 2 - 0.03))
      gruppe.add(rolle)
    })

  } else if (name.includes('drucker')) {
    baueGeraeteBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat)
    const dunkelMat = new THREE.MeshStandardMaterial({ color: '#2C2C2A', roughness: 0.5, metalness: 0.2 })
    const einzugsschlitz = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.7, 0.01, moebelTiefe * 0.08), dunkelMat)
    einzugsschlitz.position.set(0, moebelHoehe + 0.005, -moebelTiefe * 0.2)
    gruppe.add(einzugsschlitz)
    const ausgabefach = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.75, 0.02, moebelTiefe * 0.25), mat)
    ausgabefach.position.set(0, moebelHoehe * 0.55, moebelTiefe / 2 + moebelTiefe * 0.1)
    gruppe.add(ausgabefach)

  } else if (name.includes('bank')) {
    // Sitzbank und Bettbank teilen sich dieselbe schlichte Form (keine Rückenlehne)
    const sitzDicke = 0.08
    const sitz = new THREE.Mesh(new RoundedBoxGeometry(moebelBreite, sitzDicke, moebelTiefe, 2, 0.03), stoffMat)
    sitz.position.set(0, moebelHoehe - sitzDicke / 2, 0)
    sitz.castShadow = true
    gruppe.add(sitz)

    const beinHoehe = moebelHoehe - sitzDicke
    baueBeine(gruppe, [
      [-moebelBreite / 2 + 0.06, moebelTiefe / 2 - 0.06],
      [moebelBreite / 2 - 0.06, moebelTiefe / 2 - 0.06],
      [-moebelBreite / 2 + 0.06, -moebelTiefe / 2 + 0.06],
      [moebelBreite / 2 - 0.06, -moebelTiefe / 2 + 0.06],
    ], [0.02, 0.026], beinHoehe, item.border, holzTextur, { roughness: 0.5 })

  } else if (name.includes('spiegel')) {
    // Freistehender Spiegel: dünner Rahmen wie beim Bild-Zweig, aber echt hochkant (moebelHoehe
    // ist hier eine reale Standhöhe, die Rahmentiefe kommt bewusst aus einem festen Wert statt aus
    // moebelTiefe — sonst würde der Rahmen so tief wie sein 2D-Platzbedarf und wirkt klobig).
    const rahmenDicke = 0.04
    const rahmen = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, moebelHoehe, rahmenDicke), borderMat)
    rahmen.position.set(0, moebelHoehe / 2, 0)
    rahmen.castShadow = true
    gruppe.add(rahmen)

    const spiegelMat = new THREE.MeshStandardMaterial({ color: '#DCE8EC', roughness: 0.08, metalness: 0.6 })
    const glas = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.82, moebelHoehe * 0.85, rahmenDicke * 0.4), spiegelMat)
    glas.position.set(0, moebelHoehe / 2, rahmenDicke * 0.35)
    gruppe.add(glas)

  } else if (name.includes('kücheninsel')) {
    const plintheHoehe = Math.min(0.06, moebelHoehe * 0.1)
    const platteHoehe = 0.04
    const korpusHoehe = moebelHoehe - plintheHoehe - platteHoehe

    const plinthe = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite - 0.04, plintheHoehe, moebelTiefe - 0.04),
      new THREE.MeshStandardMaterial({ color: '#3A3A38', roughness: 0.7 }))
    plinthe.position.set(0, plintheHoehe / 2, 0)
    gruppe.add(plinthe)

    const korpus = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, korpusHoehe, moebelTiefe), holzMat)
    korpus.position.set(0, plintheHoehe + korpusHoehe / 2, 0)
    korpus.castShadow = true
    gruppe.add(korpus)

    const anzahlTueren = Math.max(2, Math.round(moebelBreite / 0.55))
    const tuerBreite = moebelBreite / anzahlTueren
    const griffMat = new THREE.MeshStandardMaterial({ color: '#8A8680', roughness: 0.3, metalness: 0.7 })
    for (let i = 0; i < anzahlTueren; i++) {
      const tx = -moebelBreite / 2 + tuerBreite * (i + 0.5)
      const panel = new THREE.Mesh(new THREE.BoxGeometry(tuerBreite - 0.03, korpusHoehe - 0.06, 0.015), holzMat)
      panel.position.set(tx, plintheHoehe + korpusHoehe / 2, moebelTiefe / 2 + 0.008)
      gruppe.add(panel)
      const griff = new THREE.Mesh(new THREE.BoxGeometry(0.014, korpusHoehe * 0.18, 0.02), griffMat)
      griff.position.set(tx + tuerBreite * 0.3, plintheHoehe + korpusHoehe / 2, moebelTiefe / 2 + 0.02)
      gruppe.add(griff)
    }

    // Arbeitsplatte übersteht den Korpus an allen Seiten, analog zur Tischplatten-Kante
    const platte = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite + 0.06, platteHoehe, moebelTiefe + 0.06), mat)
    platte.position.set(0, moebelHoehe - platteHoehe / 2, 0)
    platte.castShadow = true
    gruppe.add(platte)

  } else if (name.includes('herd') || name.includes('backofen')) {
    // Herd und Backofen teilen sich dieselbe Backofentür-Form — nur der Herd bekommt zusätzlich
    // die vier Kochfelder obenauf
    const istHerd = name.includes('herd')
    const minSeite = Math.min(moebelBreite, moebelTiefe)
    baueGeraeteBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat)

    const dunkelMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A', roughness: 0.4, metalness: 0.3 })
    const tuerBreite = moebelBreite * 0.8
    const tuerHoehe = moebelHoehe * 0.65
    const tuer = new THREE.Mesh(new THREE.BoxGeometry(tuerBreite, tuerHoehe, 0.02), dunkelMat)
    tuer.position.set(0, moebelHoehe * 0.4, moebelTiefe / 2 - 0.005)
    gruppe.add(tuer)
    const sichtfensterMat = new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.8 })
    const sichtfenster = new THREE.Mesh(new THREE.BoxGeometry(tuerBreite * 0.7, tuerHoehe * 0.55, 0.01), sichtfensterMat)
    sichtfenster.position.set(0, moebelHoehe * 0.44, moebelTiefe / 2 + 0.005)
    gruppe.add(sichtfenster)

    const bedienMat = new THREE.MeshStandardMaterial({ color: '#8A8680', roughness: 0.3, metalness: 0.6 })
    const knopfAnzahl = 4
    for (let i = 0; i < knopfAnzahl; i++) {
      const kx = -moebelBreite / 2 + (moebelBreite / knopfAnzahl) * (i + 0.5)
      const knopf = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 12), bedienMat)
      knopf.rotation.x = Math.PI / 2
      knopf.position.set(kx, moebelHoehe * 0.78, moebelTiefe / 2 + 0.006)
      gruppe.add(knopf)
    }

    if (istHerd) {
      const ringPositionen = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
      ringPositionen.forEach(([sx, sz]) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(minSeite * 0.16, 0.008, 8, 20), dunkelMat)
        ring.position.set(sx * moebelBreite * 0.22, moebelHoehe + 0.005, sz * moebelTiefe * 0.22)
        gruppe.add(ring)
      })
    }

  } else if (name.includes('geschirrspüler')) {
    // Muss vor dem 'spüle'-Zweig stehen: "Geschirrspüler" enthält "spüle" als Teilstring
    baueGeraeteBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat)
    const bedienfeld = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.9, 0.02, moebelTiefe * 0.1), borderMat)
    bedienfeld.position.set(0, moebelHoehe + 0.01, -moebelTiefe * 0.35)
    gruppe.add(bedienfeld)
    const griffMat = new THREE.MeshStandardMaterial({ color: '#8A8680', roughness: 0.3, metalness: 0.7 })
    const griff = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.85, 0.02, 0.02), griffMat)
    griff.position.set(0, moebelHoehe * 0.85, moebelTiefe / 2 + 0.01)
    gruppe.add(griff)

  } else if (name.includes('spüle')) {
    const platteHoehe = 0.05
    const platte = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, platteHoehe, moebelTiefe), mat)
    platte.position.set(0, moebelHoehe - platteHoehe / 2, 0)
    platte.castShadow = true
    gruppe.add(platte)

    const beckenMat = new THREE.MeshStandardMaterial({ color: item.border, roughness: 0.3, metalness: 0.4 })
    const becken = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.6, platteHoehe * 0.6, moebelTiefe * 0.6), beckenMat)
    becken.position.set(0, moebelHoehe - platteHoehe * 0.7, 0)
    gruppe.add(becken)

    const hahnMat = new THREE.MeshStandardMaterial({ color: '#B0AFA8', roughness: 0.3, metalness: 0.7 })
    const hahn = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 16, Math.PI), hahnMat)
    hahn.rotation.z = Math.PI / 2
    hahn.rotation.y = Math.PI / 2
    hahn.position.set(0, moebelHoehe + 0.02, -moebelTiefe * 0.3)
    gruppe.add(hahn)

  } else if (name.includes('mikrowelle')) {
    baueGeraeteBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat)
    const glasMat = new THREE.MeshStandardMaterial({ color: '#1A1A1A', roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.55 })
    const fenster = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.55, moebelHoehe * 0.6, 0.01), glasMat)
    fenster.position.set(-moebelBreite * 0.08, moebelHoehe * 0.5, moebelTiefe / 2 + 0.005)
    gruppe.add(fenster)

    const bedienfeld = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.2, moebelHoehe * 0.7, 0.01), borderMat)
    bedienfeld.position.set(moebelBreite * 0.38, moebelHoehe * 0.5, moebelTiefe / 2 + 0.005)
    gruppe.add(bedienfeld)

    const griffMat = new THREE.MeshStandardMaterial({ color: '#8A8680', roughness: 0.3, metalness: 0.7 })
    const griff = new THREE.Mesh(new THREE.BoxGeometry(0.015, moebelHoehe * 0.6, 0.02), griffMat)
    griff.position.set(moebelBreite * 0.24, moebelHoehe * 0.5, moebelTiefe / 2 + 0.01)
    gruppe.add(griff)

  } else if (name.includes('dunstabzugshaube')) {
    const hauteMat = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.3, metalness: 0.5 })
    const untenHoehe = moebelHoehe * 0.35
    const mitteHoehe = moebelHoehe * 0.35
    const kaminHoehe = moebelHoehe - untenHoehe - mitteHoehe

    const unten = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite, untenHoehe, moebelTiefe), hauteMat)
    unten.position.set(0, untenHoehe / 2, 0)
    unten.castShadow = true
    gruppe.add(unten)

    const mitte = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.6, mitteHoehe, moebelTiefe * 0.6), hauteMat)
    mitte.position.set(0, untenHoehe + mitteHoehe / 2, 0)
    gruppe.add(mitte)

    const kamin = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.25, kaminHoehe, moebelTiefe * 0.25), hauteMat)
    kamin.position.set(0, untenHoehe + mitteHoehe + kaminHoehe / 2, 0)
    gruppe.add(kamin)

    const leuchtstreifenMat = new THREE.MeshStandardMaterial({ color: '#FFF3D0', emissive: '#FFDA88', emissiveIntensity: lichtAn ? 0.6 : 0 })
    const leuchtstreifen = new THREE.Mesh(new THREE.BoxGeometry(moebelBreite * 0.8, 0.01, 0.02), leuchtstreifenMat)
    leuchtstreifen.position.set(0, untenHoehe - 0.01, moebelTiefe / 2 - 0.03)
    gruppe.add(leuchtstreifen)

  } else {
    // Standard Box für alle anderen
    baueStandardBox(gruppe, moebelBreite, moebelHoehe, moebelTiefe, mat, item.border)
  }

  gruppe.castShadow = true
  scene.add(gruppe)
}
