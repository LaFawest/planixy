import * as THREE from 'three'
import { wandSegmente, rechteckPolygon } from '../raumPolygon'
import { bogenMasse } from '../constants'

const FENSTER_HOEHE = 1.2
const TUER_HOEHE = 2.1

// === WANDELEMENTE (Tür/Fenster) ===
// holzTextur (erzeugeHolzTextur aus texturen.js, wie schon bei Möbel-Holzbeinen in moebel.js)
// ersetzt die bisherigen flachen Farben an Tür/Rahmen/Fensterrahmen durch eine Holzmaserung.
// Drückerklinke: Rosette auf dem Blatt, kurzer Hals nach vorn, waagerechter Drücker.
//
// Bisher saßen an den Zimmertüren Kugelknäufe. In deutschen Wohnungen ist der Knauf die
// Ausnahme — er sitzt meist außen an einer Haustür, wo er sich absichtlich nicht drehen lässt.
// Drinnen ist der Drücker der Normalfall.
//
// Der Drücker zeigt zur Bandseite, also nach innen zur Türmitte: An einer echten Tür zeigt er
// weg vom Schloss, damit die Hand beim Herunterdrücken nicht gegen die Zarge stößt.
//
// z ist die VORDERE Fläche des Türblatts an der Stelle des Griffs. Sie ist nicht bei jeder Tür
// gleich: Wo Stege oder Füllungen aufliegen, liegt sie weiter vorn, sonst läge die Rosette im
// Holz. Deshalb übergibt jeder Zweig seinen eigenen Wert.
function baueKlinke(gruppe, x, y, z, farbe) {
  const mat = new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.25, metalness: 0.8 })
  const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.014, 16), mat)
  rosette.rotation.x = Math.PI / 2
  rosette.position.set(x, y, z + 0.007)
  gruppe.add(rosette)
  const hals = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), mat)
  hals.rotation.x = Math.PI / 2
  hals.position.set(x, y, z + 0.035)
  gruppe.add(hals)
  const druecker = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.024, 0.024), mat)
  druecker.position.set(x - 0.055, y, z + 0.055)
  gruppe.add(druecker)
}

export function baueWandElement(scene, item, raumBreite, raumTiefe, wandHoehe, eckpunkte, holzTextur, backsteinTextur) {
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

  } else if (item.typ === 'durchgang') {
    // Offener Durchgang (Phase 4, Teil 3a/3b): kein Türblatt/Rahmen — das eigentliche "Loch"
    // entsteht direkt in der Wandgeometrie (siehe RoomView3D.jsx, wandGeometrieFuerSegment). Hier
    // nur eine unsichtbare Klickfläche in Elementgröße, damit der Durchgang im 3D-Bild trotzdem
    // anklickbar/verschiebbar/größenänderbar bleibt — ein reines Loch hat sonst keine Geometrie
    // zum Anklicken. Beim Rundbogen (Teil 3b) zusätzlich optional eine sichtbare
    // Backstein-Einfassung.
    const elHoehe = item.hoeheReal ?? TUER_HOEHE
    const klickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })

    if (item.stil === 'bogen') {
      // elHoehe ist seit Optimierung 2 die Gesamthöhe der Öffnung (Boden bis Bogenscheitel);
      // bogenMasse() teilt sie in geraden Teil und Bogenhöhe auf (siehe constants.js). Die
      // Klickfläche deckt genau diese Gesamthöhe ab, damit auch der gewölbte obere Teil
      // anklickbar ist.
      const radius = elBreite / 2
      const gesamtHoehe = elHoehe
      const { kaempferHoehe, bogenHoehe } = bogenMasse(elBreite, gesamtHoehe)
      const klickflaeche = new THREE.Mesh(new THREE.PlaneGeometry(elBreite, gesamtHoehe), klickMat)
      klickflaeche.position.set(0, gesamtHoehe / 2, 0)
      gruppe.add(klickflaeche)

      if (item.backstein) {
        // Optionale Ziegel-Einfassung: flaches Ring-Shape (Öffnungs-Kontur als Loch, um
        // RAHMEN_BREITE nach außen versetzte, gleich aufgebaute Kontur als Außenrand — siehe
        // Kommentar bei wandGeometrieFuerSegment in RoomView3D.jsx, warum ein größerer Radius um
        // denselben Kreismittelpunkt nahtlos an die versetzten geraden Seiten anschließt),
        // extrudiert auf Rahmentiefe und wie die Tür-Rahmenboxen oben auf der Wandebene
        // zentriert.
        const RAHMEN_BREITE = 0.12
        const RAHMEN_TIEFE = 0.14
        const radiusAussen = radius + RAHMEN_BREITE
        const bogenHoeheAussen = bogenHoehe + RAHMEN_BREITE
        const halbBreiteAussen = elBreite / 2 + RAHMEN_BREITE

        const innerPfad = new THREE.Path()
        innerPfad.moveTo(-elBreite / 2, 0)
        innerPfad.lineTo(elBreite / 2, 0)
        innerPfad.lineTo(elBreite / 2, kaempferHoehe)
        innerPfad.absellipse(0, kaempferHoehe, radius, bogenHoehe, 0, Math.PI, false, 0)
        innerPfad.lineTo(-elBreite / 2, 0)

        const aussenShape = new THREE.Shape()
        aussenShape.moveTo(-halbBreiteAussen, 0)
        aussenShape.lineTo(halbBreiteAussen, 0)
        aussenShape.lineTo(halbBreiteAussen, kaempferHoehe)
        aussenShape.absellipse(0, kaempferHoehe, radiusAussen, bogenHoeheAussen, 0, Math.PI, false, 0)
        aussenShape.lineTo(-halbBreiteAussen, 0)
        aussenShape.holes.push(innerPfad)

        const rahmenGeo = new THREE.ExtrudeGeometry(aussenShape, { depth: RAHMEN_TIEFE, bevelEnabled: false })
        rahmenGeo.translate(0, 0, -RAHMEN_TIEFE / 2)
        const rahmenMat = new THREE.MeshStandardMaterial({ map: backsteinTextur, roughness: 0.95, metalness: 0.0 })
        const rahmen = new THREE.Mesh(rahmenGeo, rahmenMat)
        rahmen.castShadow = true
        gruppe.add(rahmen)
      }
    } else {
      const klickflaeche = new THREE.Mesh(new THREE.PlaneGeometry(elBreite, elHoehe), klickMat)
      klickflaeche.position.set(0, elHoehe / 2, 0)
      gruppe.add(klickflaeche)
    }

  } else {
    const elHoehe = item.hoeheReal ?? TUER_HOEHE

    // Alte Schiebetüren tragen kein stil-Feld: Der Katalogeintrag hat es erst bekommen, als die
    // Schiebetür ihr eigenes Aussehen bekam, und jedes eingefügte Element trägt seine eigene
    // Kopie des Eintrags aus der Zeit seines Einfügens. Ohne diesen Nachschlag sähen zwei
    // Schiebetüren im selben Raum verschieden aus, je nachdem, wann sie eingefügt wurden.
    //
    // Bewusst nur hier beim Zeichnen und nicht als Änderung an den gespeicherten Daten: Das ist
    // jederzeit umkehrbar und kann keine Projektdatei beschädigen. Und bewusst nur für die
    // Schiebetür — alle anderen Stile hatten ihr Feld von Anfang an.
    const stil = item.stil || (item.name === 'Schiebetür' ? 'schiebe' : undefined)

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
    } else if (stil === 'schiebe') {
      // Schiebetür. Was sie ausmacht, ist nicht das Blatt, sondern was fehlt und was dazukommt:
      // keine Zarge, sondern eine flache Laibung; eine Laufschiene über der Öffnung; das Blatt
      // VOR der Wand statt in der Öffnung; und ein Muschelgriff statt einer Klinke — ein Drücker
      // würde beim Aufschieben an der Wand anstoßen.
      const metallMat = new THREE.MeshStandardMaterial({ color: '#8A8A87', roughness: 0.3, metalness: 0.8 })

      // Flache Laibung statt Zarge: Eine Schiebetür sitzt nicht in einem Rahmen, die Öffnung
      // wird nur sauber eingefasst.
      const laibungMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.6, map: holzTextur })
      ;[-1, 1].forEach(seite => {
        const laibung = new THREE.Mesh(new THREE.BoxGeometry(0.03, elHoehe + 0.03, 0.14), laibungMat)
        laibung.position.set(seite * (elBreite / 2 + 0.015), elHoehe / 2, 0)
        gruppe.add(laibung)
      })
      const laibungO = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.06, 0.03, 0.14), laibungMat)
      laibungO.position.set(0, elHoehe + 0.015, 0)
      gruppe.add(laibungO)

      // Die Schiene ist fast doppelt so lang wie die Öffnung und nach rechts versetzt — dorthin
      // schiebt sich die Tür. Eine Schiene, die genau über der Öffnung endet, wäre die
      // häufigste Ungenauigkeit an so einer Darstellung.
      const schiene = new THREE.Mesh(new THREE.BoxGeometry(elBreite * 1.95, 0.05, 0.05), metallMat)
      schiene.position.set(elBreite * 0.42, elHoehe + 0.11, 0.10)
      gruppe.add(schiene)
      ;[-0.32, 0.32].forEach(faktor => {
        const halter = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.02), metallMat)
        halter.position.set(elBreite * faktor, elHoehe + 0.05, 0.10)
        gruppe.add(halter)
      })

      // Blatt vor der Wand, etwas breiter als die Öffnung, damit es sie im geschlossenen
      // Zustand überdeckt. Ohne Füllungen — Schiebetüren sind flach.
      const blattMat = new THREE.MeshStandardMaterial({ color: '#C8A97A', roughness: 0.7, metalness: 0.0, map: holzTextur })
      const blatt = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.08, elHoehe, 0.04), blattMat)
      blatt.position.set(0, elHoehe / 2, 0.09)
      blatt.castShadow = true
      gruppe.add(blatt)

      const muschelMat = new THREE.MeshStandardMaterial({ color: '#3A3A38', roughness: 0.5, metalness: 0.5 })
      const muschel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.012), muschelMat)
      // z = 0.106: Das Blatt reicht von 0.07 bis 0.11. Bei 0.104 lag die Vorderseite der Mulde
      // (0.104 + 0.006) genau in der Blattfläche — zwei Flächen in derselben Ebene flimmern
      // gegeneinander, und die Mulde wäre je nach Blickwinkel verschwunden. So steht sie 2 mm vor.
      // Linke Kante, nicht rechte: Die Schiene ist nach rechts versetzt, die Tür fährt also
      // nach rechts auf. Die linke Kante ist damit die, die beim Schließen an die Laibung
      // anschlägt — dort greift man hin. Rechts läge die Mulde bei offener Tür mitten über der
      // Wand.
      muschel.position.set(-(elBreite / 2 - 0.06), elHoehe * 0.47, 0.106)
      gruppe.add(muschel)
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

      // z = 0.08, weil hier die Kassetten-Stege bis 0.075 und die Füllungen darauf bis 0.08 nach
      // vorn reichen — der mittlere Steg deckt die Griffhöhe ganz ab. Mit dem Wert der
      // Blattfläche läge die Rosette im Steg. Messington passend zum klassischen Stil.
      baueKlinke(gruppe, elBreite/2 - 0.09, elHoehe * 0.47, 0.08, '#B99648')
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

      // z = 0.06: Die Glasfüllung reicht bis dorthin, und der Griff sitzt bei dieser Tür über
      // dem Glas. Edelstahlton, wie an Glastüren üblich.
      baueKlinke(gruppe, elBreite/2 - 0.09, elHoehe * 0.47, 0.06, '#A8A8A5')
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

      // z = 0.06, die Blattfläche. Die Sprossen (vorn bei 0.07) liegen fast ganz neben der
      // Rosette: Die senkrechten sitzen bei ±elBreite/6, weit weg vom Schloss, und die mittlere
      // waagerechte bei 0.5 · elHoehe streift die Rosette nur mit 5 mm. Auf der Sprossenebene
      // hätte die Rosette auf dem übrigen Umfang 1,5 cm vor dem Blatt geschwebt; so sitzt sie auf
      // dem Holz, und ihre Vorderseite (0.074) liegt trotzdem vor der Sprosse. Dunkler, matter
      // Ton statt Metallglanz — am Landhausstil sitzt Schmiedeeisen, kein polierter Edelstahl.
      baueKlinke(gruppe, elBreite/2 - 0.09, elHoehe * 0.47, 0.06, '#3A3835')
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

      // z = 0.06, die Blattfläche selbst: Die beiden Füllungen sind schmaler als das Blatt, der
      // Griff sitzt neben ihnen auf dem Holz. Matter Edelstahlton, der häufigste Fall.
      //
      // x = elBreite/2 - 0.065 statt - 0.09 wie bei den anderen Türen: Die obere Füllung reicht
      // hier bis elBreite/2 - 0.1 und deckt die Griffhöhe 0.47 · elHoehe ganz ab (0,945 m bis
      // 1,785 m). Bei - 0.09 hätte die Rosette 2,5 cm weit in der Füllung gesteckt. 6,5 cm vom
      // Rand ist zudem das übliche Maß an einer Zimmertür (55 mm Dornmaß plus Falz).
      const klinkeX = elBreite/2 - 0.065, klinkeY = elHoehe * 0.47
      baueKlinke(gruppe, klinkeX, klinkeY, 0.06, '#9A9A97')

      // Schlüsselloch senkrecht unter der Klinke, 8,5 cm tiefer. An seiner alten Stelle
      // (elBreite/2 - 0.12, 0.5 · elHoehe - 0.08) saß es 2 cm unter der Griffmitte und steckte
      // damit in der Rosette und im Drücker. z = 0.08, damit der Zylinder (Radius 0.02) auf dem
      // Blatt aufsitzt statt davor zu schweben.
      const schluesselMat = new THREE.MeshStandardMaterial({ color: '#888780', metalness: 0.8, roughness: 0.2 })
      const schluessel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), schluesselMat)
      schluessel.position.set(klinkeX, klinkeY - 0.085, 0.08)
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
