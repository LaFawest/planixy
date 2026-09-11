import * as THREE from 'three'
import { wandSegmente, rechteckPolygon } from '../raumPolygon'

const FENSTER_HOEHE = 1.2
const TUER_HOEHE = 2.1

// === WANDELEMENTE (Tür/Fenster) ===
// holzTextur (erzeugeHolzTextur aus texturen.js, wie schon bei Möbel-Holzbeinen in moebel.js)
// ersetzt die bisherigen flachen Farben an Tür/Rahmen/Fensterrahmen durch eine Holzmaserung.
export function baueWandElement(scene, item, raumBreite, raumTiefe, wandHoehe, eckpunkte, holzTextur) {
  const elBreite = item.width / 60
  const gruppe = new THREE.Group()

  // Position/Drehung wie bei Trennwänden (siehe baueTrennwaende in trennwaende.js): Mittelpunkt
  // und Blickrichtung ergeben sich direkt aus Segment-Start/-Ende, nicht mehr aus vier festen
  // Fällen für die Himmelsrichtung.
  const segmente = wandSegmente(eckpunkte || rechteckPolygon(raumBreite, raumTiefe))
  const segment = segmente[item.wandSegment] || segmente[0]

  // Klemmung nur beim Rendern: wird das Segment (z.B. durch eine Größenänderung des Raums)
  // kürzer als Position + Elementbreite, rückt das Element sichtbar mit, statt aus der Wand
  // herauszuragen. item.wandPosition in den Daten bleibt davon unberührt — das Klemmen der
  // gespeicherten Position ist ein eigener, späterer Schritt.
  const position = Math.max(0, Math.min(item.wandPosition || 0, segment.laenge - elBreite))
  const mitte = position + elBreite / 2
  const t = segment.laenge > 0 ? mitte / segment.laenge : 0

  const x1 = segment.start.x - raumBreite / 2
  const z1 = segment.start.y - raumTiefe / 2
  const x2 = segment.ende.x - raumBreite / 2
  const z2 = segment.ende.y - raumTiefe / 2

  const px = x1 + (x2 - x1) * t
  const pz = z1 + (z2 - z1) * t
  const ry = -Math.atan2(z2 - z1, x2 - x1)

  // Bei Fenstern trägt gruppe.position.y jetzt direkt die Brüstungshöhe (Abstand Unterkante
  // Fenster bis Boden) — item.bruestungshoehe, falls vom Nutzer im 3D-Editor gesetzt, sonst der
  // bisherige feste Wert als Fallback (keine optische Änderung an bereits platzierten Fenstern).
  // Türen bleiben bei y=0 (Bodenanschluss), wie bisher.
  // Phase 4, Teil 2: item.hoeheReal überschreibt optional die feste FENSTER_HOEHE (analog zum
  // Tür-Ast unten) — gesetzt, sobald Hassan ein Fenster im 3D-Editor per Eck-Anfasser
  // größenverändert hat (siehe RoomView3D.jsx).
  const fensterElHoehe = item.hoeheReal ?? FENSTER_HOEHE
  const bruestungshoeheFallback = wandHoehe * 0.55 - fensterElHoehe / 2
  const gruppenY = item.typ === 'fenster' ? (item.bruestungshoehe ?? bruestungshoeheFallback) : 0
  gruppe.position.set(px, gruppenY, pz)
  gruppe.rotation.y = ry

  if (item.typ === 'fenster') {
    const elHoehe = fensterElHoehe
    // Relativ zur Gruppe konstant (halbe Fensterhöhe) — die absolute Höhe kommt jetzt allein aus
    // gruppe.position.y oben, nicht mehr aus einer hier berechneten Weltkoordinate.
    const yPos = elHoehe / 2

    if (item.stil === 'doppel') {
      // Doppelfenster: zwei Fenstereinheiten nebeneinander mit gemeinsamem Mittelpfosten — jede
      // Hälfte baugleich zum bestehenden Einzelfenster unten (Rahmen+Glas+Sprosse), nur schmaler
      // und um ±versatz von der Gruppen-Mitte verschoben.
      const MITTELPFOSTEN_BREITE = 0.08
      const halbBreite = (elBreite - MITTELPFOSTEN_BREITE) / 2
      const versatz = (halbBreite + MITTELPFOSTEN_BREITE) / 2
      ;[-versatz, versatz].forEach(x => {
        const rahmenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, metalness: 0.1, map: holzTextur })
        const rahmen = new THREE.Mesh(new THREE.BoxGeometry(halbBreite, elHoehe, 0.1), rahmenMat)
        rahmen.position.set(x, yPos, 0)
        rahmen.castShadow = true
        gruppe.add(rahmen)

        const glasMat = new THREE.MeshStandardMaterial({
          color: '#A8D8F0', transparent: true, opacity: 0.35,
          roughness: 0.0, metalness: 0.1,
        })
        const glas = new THREE.Mesh(new THREE.BoxGeometry(halbBreite - 0.08, elHoehe - 0.08, 0.02), glasMat)
        glas.position.set(x, yPos, 0)
        gruppe.add(glas)

        const strebeMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, map: holzTextur })
        const strebeH = new THREE.Mesh(new THREE.BoxGeometry(halbBreite - 0.06, 0.04, 0.06), strebeMat)
        strebeH.position.set(x, yPos, 0.02)
        gruppe.add(strebeH)
      })

      const pfostenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, map: holzTextur })
      const pfosten = new THREE.Mesh(new THREE.BoxGeometry(MITTELPFOSTEN_BREITE, elHoehe, 0.1), pfostenMat)
      pfosten.position.set(0, yPos, 0)
      gruppe.add(pfosten)

      const bankMat = new THREE.MeshStandardMaterial({ color: '#E8E4DC', roughness: 0.4 })
      const bank = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.1, 0.05, 0.15), bankMat)
      bank.position.set(0, yPos - elHoehe/2 - 0.025, 0.08)
      gruppe.add(bank)
    } else {
      const rahmenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, metalness: 0.1, map: holzTextur })
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

      const strebeMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, map: holzTextur })
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
    }

  } else {
    const elHoehe = item.hoeheReal ?? TUER_HOEHE

    if (item.stil === 'balkon-einzel') {
      // Balkontür Einzelflügel: wie eine normale Tür aufgebaut (Rahmen, Griff), aber mit einer
      // durchgehenden Glasscheibe statt der zwei Holzfüllungen.
      const tuerMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.5, metalness: 0.1, map: holzTextur })
      const tuer = new THREE.Mesh(new THREE.BoxGeometry(elBreite, elHoehe, 0.06), tuerMat)
      tuer.position.set(0, elHoehe / 2, 0.03)
      tuer.castShadow = true
      gruppe.add(tuer)

      const glasMat = new THREE.MeshStandardMaterial({ color: '#A8D8F0', transparent: true, opacity: 0.35, roughness: 0.0, metalness: 0.1 })
      const glas = new THREE.Mesh(new THREE.BoxGeometry(elBreite - 0.12, elHoehe - 0.12, 0.02), glasMat)
      glas.position.set(0, elHoehe / 2, 0.06)
      gruppe.add(glas)

      const rahmenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, map: holzTextur })
      const rahmenL = new THREE.Mesh(new THREE.BoxGeometry(0.08, elHoehe + 0.1, 0.15), rahmenMat)
      rahmenL.position.set(-elBreite/2 - 0.04, elHoehe/2, 0)
      gruppe.add(rahmenL)
      const rahmenR = rahmenL.clone()
      rahmenR.position.x = elBreite/2 + 0.04
      gruppe.add(rahmenR)
      const rahmenO = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.16, 0.08, 0.15), rahmenMat)
      rahmenO.position.set(0, elHoehe + 0.04, 0)
      gruppe.add(rahmenO)

      const griffMat = new THREE.MeshStandardMaterial({ color: '#888780', metalness: 0.8, roughness: 0.2 })
      const griff = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), griffMat)
      griff.position.set(elBreite/2 - 0.1, elHoehe * 0.5, 0.09)
      gruppe.add(griff)
    } else if (item.stil === 'balkon-doppel') {
      // Balkontür Doppelflügel: zwei Einzelflügel-Türen nebeneinander (je Hälfte baugleich zum
      // Einzelflügel oben), Griffe zur Mitte hin gespiegelt — wie bei echten zweiflügligen Türen.
      const MITTELPFOSTEN_BREITE = 0.08
      const halbBreite = (elBreite - MITTELPFOSTEN_BREITE) / 2
      const versatz = (halbBreite + MITTELPFOSTEN_BREITE) / 2
      ;[-versatz, versatz].forEach(x => {
        const tuerMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.5, metalness: 0.1, map: holzTextur })
        const tuer = new THREE.Mesh(new THREE.BoxGeometry(halbBreite, elHoehe, 0.06), tuerMat)
        tuer.position.set(x, elHoehe / 2, 0.03)
        tuer.castShadow = true
        gruppe.add(tuer)

        const glasMat = new THREE.MeshStandardMaterial({ color: '#A8D8F0', transparent: true, opacity: 0.35, roughness: 0.0, metalness: 0.1 })
        const glas = new THREE.Mesh(new THREE.BoxGeometry(halbBreite - 0.1, elHoehe - 0.12, 0.02), glasMat)
        glas.position.set(x, elHoehe / 2, 0.06)
        gruppe.add(glas)

        const griffMat = new THREE.MeshStandardMaterial({ color: '#888780', metalness: 0.8, roughness: 0.2 })
        const griff = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), griffMat)
        griff.position.set(x > 0 ? x - halbBreite/2 + 0.06 : x + halbBreite/2 - 0.06, elHoehe * 0.5, 0.09)
        gruppe.add(griff)
      })

      const pfostenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, map: holzTextur })
      const pfosten = new THREE.Mesh(new THREE.BoxGeometry(MITTELPFOSTEN_BREITE, elHoehe, 0.1), pfostenMat)
      pfosten.position.set(0, elHoehe/2, 0)
      gruppe.add(pfosten)

      const rahmenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, map: holzTextur })
      const rahmenL = new THREE.Mesh(new THREE.BoxGeometry(0.08, elHoehe + 0.1, 0.15), rahmenMat)
      rahmenL.position.set(-elBreite/2 - 0.04, elHoehe/2, 0)
      gruppe.add(rahmenL)
      const rahmenR = rahmenL.clone()
      rahmenR.position.x = elBreite/2 + 0.04
      gruppe.add(rahmenR)
      const rahmenO = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.16, 0.08, 0.15), rahmenMat)
      rahmenO.position.set(0, elHoehe + 0.04, 0)
      gruppe.add(rahmenO)
    } else if (item.stil === 'haustuer') {
      // Hauseingangstür Alu/Anthrazit: dunkle Anthrazit-Türfüllung in einem hellen Alu-Rahmen,
      // schmaler vertikaler Glasstreifen nahe der Schlossseite (typisch für moderne Haustüren) und
      // ein durchgehender Stoßgriff (Zylinder) statt Knauf.
      const tuerMat = new THREE.MeshStandardMaterial({ color: '#3B3B39', roughness: 0.4, metalness: 0.3 })
      const tuer = new THREE.Mesh(new THREE.BoxGeometry(elBreite, elHoehe, 0.07), tuerMat)
      tuer.position.set(0, elHoehe / 2, 0.035)
      tuer.castShadow = true
      gruppe.add(tuer)

      const glasStreifenMat = new THREE.MeshStandardMaterial({ color: '#A8D8F0', transparent: true, opacity: 0.4, roughness: 0.0, metalness: 0.1 })
      const glasStreifen = new THREE.Mesh(new THREE.BoxGeometry(elBreite * 0.12, elHoehe - 0.3, 0.02), glasStreifenMat)
      glasStreifen.position.set(elBreite / 2 - elBreite * 0.18, elHoehe / 2, 0.075)
      gruppe.add(glasStreifen)

      const rahmenMat = new THREE.MeshStandardMaterial({ color: '#B8B8B4', roughness: 0.3, metalness: 0.7 })
      const rahmenL = new THREE.Mesh(new THREE.BoxGeometry(0.09, elHoehe + 0.1, 0.16), rahmenMat)
      rahmenL.position.set(-elBreite/2 - 0.045, elHoehe/2, 0)
      gruppe.add(rahmenL)
      const rahmenR = rahmenL.clone()
      rahmenR.position.x = elBreite/2 + 0.045
      gruppe.add(rahmenR)
      const rahmenO = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.18, 0.09, 0.16), rahmenMat)
      rahmenO.position.set(0, elHoehe + 0.045, 0)
      gruppe.add(rahmenO)

      const griffMat = new THREE.MeshStandardMaterial({ color: '#5A5A57', metalness: 0.85, roughness: 0.2 })
      const griff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, elHoehe * 0.45, 8), griffMat)
      griff.position.set(elBreite/2 - 0.2, elHoehe * 0.5, 0.1)
      gruppe.add(griff)
    } else if (item.stil === 'kassette') {
      // Kassettentür: wie die Standard-Tür aufgebaut (Rahmen, Knauf), aber mit drei gerahmten
      // Kassetten-Feldern statt zwei einfachen Füllungen — jedes Feld bekommt einen schmalen Steg
      // als Rahmen plus eine leicht abgesetzte Füllung, für den klassischen Kassettentür-Look.
      const tuerMat = new THREE.MeshStandardMaterial({ color: '#E8C9A0', roughness: 0.6, map: holzTextur })
      const tuer = new THREE.Mesh(new THREE.BoxGeometry(elBreite, elHoehe, 0.06), tuerMat)
      tuer.position.set(0, elHoehe / 2, 0.03)
      tuer.castShadow = true
      gruppe.add(tuer)

      const rahmenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, map: holzTextur })
      const rahmenL = new THREE.Mesh(new THREE.BoxGeometry(0.08, elHoehe + 0.1, 0.15), rahmenMat)
      rahmenL.position.set(-elBreite/2 - 0.04, elHoehe/2, 0)
      gruppe.add(rahmenL)
      const rahmenR = rahmenL.clone()
      rahmenR.position.x = elBreite/2 + 0.04
      gruppe.add(rahmenR)
      const rahmenO = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.16, 0.08, 0.15), rahmenMat)
      rahmenO.position.set(0, elHoehe + 0.04, 0)
      gruppe.add(rahmenO)

      const stegMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, map: holzTextur })
      const fuellungMat = new THREE.MeshStandardMaterial({ color: '#D9B181', roughness: 0.8, map: holzTextur })
      ;[elHoehe * 0.82, elHoehe * 0.5, elHoehe * 0.18].forEach(y => {
        const steg = new THREE.Mesh(new THREE.BoxGeometry(elBreite - 0.14, elHoehe * 0.22, 0.03), stegMat)
        steg.position.set(0, y, 0.06)
        gruppe.add(steg)
        const fuellung = new THREE.Mesh(new THREE.BoxGeometry(elBreite - 0.24, elHoehe * 0.16, 0.02), fuellungMat)
        fuellung.position.set(0, y, 0.07)
        gruppe.add(fuellung)
      })

      const knaufMat = new THREE.MeshStandardMaterial({ color: '#C8A050', roughness: 0.1, metalness: 0.9 })
      const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), knaufMat)
      knauf.position.set(elBreite/2 - 0.12, elHoehe * 0.5, 0.08)
      gruppe.add(knauf)
    } else if (item.stil === 'glas-zimmer') {
      // Glastür (Zimmertür): wie Balkontür-Einzelflügel aufgebaut, aber mit hellem/weißem Rahmen
      // statt Holzoptik, mattierter (weniger transparenter) Glasfüllung und einem modernen
      // Flachgriff statt des Balkontür-Griffs — für den Innenraum, nicht für den Wetterschutz.
      const tuerMat = new THREE.MeshStandardMaterial({ color: '#FAFAF8', roughness: 0.4, metalness: 0.0 })
      const tuer = new THREE.Mesh(new THREE.BoxGeometry(elBreite, elHoehe, 0.05), tuerMat)
      tuer.position.set(0, elHoehe / 2, 0.025)
      tuer.castShadow = true
      gruppe.add(tuer)

      const glasMat = new THREE.MeshStandardMaterial({ color: '#DCE8F0', transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.0 })
      const glas = new THREE.Mesh(new THREE.BoxGeometry(elBreite - 0.1, elHoehe - 0.1, 0.02), glasMat)
      glas.position.set(0, elHoehe / 2, 0.05)
      gruppe.add(glas)

      const rahmenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.5 })
      const rahmenL = new THREE.Mesh(new THREE.BoxGeometry(0.06, elHoehe + 0.1, 0.13), rahmenMat)
      rahmenL.position.set(-elBreite/2 - 0.03, elHoehe/2, 0)
      gruppe.add(rahmenL)
      const rahmenR = rahmenL.clone()
      rahmenR.position.x = elBreite/2 + 0.03
      gruppe.add(rahmenR)
      const rahmenO = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.12, 0.06, 0.13), rahmenMat)
      rahmenO.position.set(0, elHoehe + 0.03, 0)
      gruppe.add(rahmenO)

      const griffMat = new THREE.MeshStandardMaterial({ color: '#888780', metalness: 0.7, roughness: 0.3 })
      const griff = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.025), griffMat)
      griff.position.set(elBreite/2 - 0.15, elHoehe * 0.5, 0.08)
      gruppe.add(griff)
    } else if (item.stil === 'landhaus') {
      // Landhaustür: weiß lackierte Tür mit Sprossen-Gitter (2 senkrechte + 3 waagerechte Stege
      // ergeben ein 6-Felder-Kassettierung), schmiedeeisen-artiger Knauf für den Landhausstil.
      const tuerMat = new THREE.MeshStandardMaterial({ color: '#FFFDF7', roughness: 0.55 })
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

      const stegMat = new THREE.MeshStandardMaterial({ color: '#EDE7DC', roughness: 0.6 })
      const stegV1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, elHoehe - 0.1, 0.02), stegMat)
      stegV1.position.set(-elBreite/6, elHoehe/2, 0.06)
      gruppe.add(stegV1)
      const stegV2 = stegV1.clone()
      stegV2.position.x = elBreite/6
      gruppe.add(stegV2)
      ;[0.2, 0.5, 0.8].forEach(f => {
        const stegH = new THREE.Mesh(new THREE.BoxGeometry(elBreite - 0.1, 0.03, 0.02), stegMat)
        stegH.position.set(0, elHoehe * f, 0.06)
        gruppe.add(stegH)
      })

      const griffMat = new THREE.MeshStandardMaterial({ color: '#2C2C2A', roughness: 0.4, metalness: 0.6 })
      const griff = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), griffMat)
      griff.position.set(elBreite/2 - 0.12, elHoehe * 0.5, 0.08)
      gruppe.add(griff)
    } else {
      const tuerMat = new THREE.MeshStandardMaterial({ color: '#C8A97A', roughness: 0.7, metalness: 0.0, map: holzTextur })

      const tuer = new THREE.Mesh(new THREE.BoxGeometry(elBreite, elHoehe, 0.06), tuerMat)
      tuer.position.set(0, elHoehe / 2, 0.03)
      tuer.castShadow = true
      gruppe.add(tuer)

      const rahmenMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, map: holzTextur })
      const rahmenL = new THREE.Mesh(new THREE.BoxGeometry(0.08, elHoehe + 0.1, 0.15), rahmenMat)
      rahmenL.position.set(-elBreite/2 - 0.04, elHoehe/2, 0)
      gruppe.add(rahmenL)

      const rahmenR = rahmenL.clone()
      rahmenR.position.x = elBreite/2 + 0.04
      gruppe.add(rahmenR)

      const rahmenO = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.16, 0.08, 0.15), rahmenMat)
      rahmenO.position.set(0, elHoehe + 0.04, 0)
      gruppe.add(rahmenO)

      const fuellungMat = new THREE.MeshStandardMaterial({ color: '#B8956A', roughness: 0.8, map: holzTextur })
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
  }

  // Jedes Kind-Mesh bekommt die furniture-Item-ID — Grundlage fürs Anklicken/Ziehen im
  // Wand-Fokus-Modus (RoomView3D.jsx): ein Raycaster-Treffer auf ein beliebiges Kind-Mesh lässt
  // sich darüber eindeutig auf sein furniture-Item zurückführen.
  gruppe.traverse(obj => { obj.userData.wandElementId = item.id })

  scene.add(gruppe)
  return gruppe
}
