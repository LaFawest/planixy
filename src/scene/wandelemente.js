import * as THREE from 'three'
import { wandSegmente, rechteckPolygon } from '../raumPolygon'
import { bogenMasse } from '../constants'

const FENSTER_HOEHE = 1.2
const TUER_HOEHE = 2.1

// Unterkante eines Wandelements über dem Boden, in Metern. Türen und Durchgänge stehen auf dem
// Boden; ein Fenster sitzt auf seiner Brüstung, und ohne gesetzte Brüstung auf dem Rückfallwert,
// der es mittig in die Wand setzt. Exportiert, weil die Sockelleiste in RoomView3D.jsx dieselbe
// Kante braucht, um sich an der richtigen Stelle zu unterbrechen — zwei Kopien dieser Formel
// würden beim nächsten Nachjustieren auseinanderlaufen.
// Die Öffnung, die ein Wandelement in der Wand braucht — in Metern, relativ zum Wandsegment:
// u = linke Kante ab Segmentanfang, unten = Unterkante über dem Boden.
//
// Eine Stelle für alle vier Interessenten: Die Wandgeometrie schneidet danach ihr Loch, die
// Laibung wird danach gebaut, die Sockelleiste entscheidet danach, wo sie aufhört, und das
// Element selbst richtet sich danach aus. Vorher rechnete RoomView3D.jsx mit einer eigenen
// Konstante TUER_HOEHE_3D, während hier TUER_HOEHE galt — zwei Zahlen für dieselbe Türhöhe in
// zwei Dateien.
export function wandElementOeffnung(item, wandHoehe, segmentLaenge) {
  const breite = item.width / 60
  const maxU = segmentLaenge == null ? Infinity : Math.max(0, segmentLaenge - breite)
  const u = Math.max(0, Math.min(item.wandPosition || 0, maxU))
  if (item.typ === 'fenster') {
    const hoehe = item.hoeheReal ?? FENSTER_HOEHE
    return { u, breite, unten: item.bruestungshoehe ?? (wandHoehe * 0.55 - hoehe / 2), hoehe }
  }
  return { u, breite, unten: 0, hoehe: item.hoeheReal ?? TUER_HOEHE }
}

// Unterkante über dem Boden. Die Sockelleiste fragt danach, ob sie unter dem Element
// durchlaufen darf.
export function wandElementUnterkante(item, wandHoehe) {
  return wandElementOeffnung(item, wandHoehe).unten
}

// Tiefe der Nische hinter einem Durchgang. Die Wände der App sind flache Flächen ohne Dicke;
// ein Durchgang schneidet ein echtes Loch, hinter dem nichts liegt — ohne Nische sieht man dort
// scene.background (#F5F4F0) und die Öffnung wirkt wie ein Scherenschnitt in Papier.
// 0,6 m ist bewusst mehr als eine Wanddicke: Es soll nach angrenzendem Raum aussehen, nicht nach
// zugemauerter Öffnung.
const NISCHE_TIEFE = 0.6
const NISCHE_FARBE = '#D8D3CA'

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

// Nische hinter einer Wandöffnung: die Kontur der Öffnung, nach hinten extrudiert und von innen
// sichtbar gemacht.
//
// side: BackSide ist hier der ganze Trick. Gezeichnet werden nur die Flächen, deren Normale vom
// Betrachter wegzeigt — vom Raum aus also Laibung, Boden und Rückwand, nicht aber der Deckel
// vorne an der Wandebene. Die Öffnung bleibt dadurch offen und bekommt trotzdem einen Grund.
// Eine geschlossene Box mit FrontSide würde die Öffnung zumauern, DoubleSide ebenso.
//
// polygonOffset: Die Laibung liegt exakt auf der Lochkante. Die Backstein-Einfassung am Bogen
// ragt halb nach hinten (z −0,07 bis 0) und hat dort deckungsgleiche Innenflächen — ohne den
// Versatz flimmern beide gegeneinander. So gewinnt die Einfassung.
//
// Kein castShadow: Die Nische steht außerhalb des Raums und würde sonst Schatten in den Raum
// werfen, die es nicht geben kann.
function baueNische(kontur, tiefe = NISCHE_TIEFE, farbe = NISCHE_FARBE) {
  const geo = new THREE.ExtrudeGeometry(kontur, { depth: tiefe, bevelEnabled: false })
  geo.translate(0, 0, -tiefe)   // nach hinten, vom Raum weg (+z zeigt in den Raum)
  const mat = new THREE.MeshStandardMaterial({
    color: farbe, roughness: 0.95, metalness: 0.0, side: THREE.BackSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  })
  const nische = new THREE.Mesh(geo, mat)
  nische.receiveShadow = true
  // Hieß "durchgang-nische", solange es sie nur am Durchgang gab. Jetzt hat jede Öffnung eine.
  nische.name = 'wand-nische'
  // Kein Klickziel: Der Raycaster von three.js prüft nur layers, nicht visible — eine unsichtbar
  // geschaltete Nische bliebe sonst anklickbar. Auch sichtbar soll sie keines sein: Sie liegt hinter
  // der Wand und finge schräge Klicks auf die Wand neben der Öffnung ab. Klickziel des Durchgangs
  // ist allein die Klickfläche, die Nische ist reine Deko dahinter.
  nische.raycast = () => {}
  return nische
}

// Welchen Ausschnitt der Dorfansicht (erzeugeAussichtTextur in texturen.js) eine Öffnung zeigt.
//
// Ohne das bekäme jede Fläche die UV-Koordinaten 0 bis 1, also das GANZE Bild — gestaucht in ein
// schmales Fenster, gestreckt in ein breites, und der Kirchturm stünde in jedem Fenster an
// derselben Stelle. Stattdessen hat die Ansicht einen festen Maßstab: Das Bild ist draußen
// AUSSICHT_BREITE × AUSSICHT_HOEHE Meter groß, und jede Öffnung schneidet so viel davon aus, wie
// sie groß ist. Ein schmales Fenster zeigt wenig, ein breites mehr, nichts wird verzerrt.
//
// Senkrecht sitzt der Horizont auf halber Öffnungshöhe. Ist eine Öffnung höher als das Bild (die
// Balkontür), läuft sie oben in den Himmel und unten in die Hecke — die Textur ist senkrecht an
// den Rand geklemmt.
//
// Waagerecht entscheidet die Lage in der Wand: Nebeneinanderliegende Fenster derselben Wand zeigen
// ein zusammenhängendes Panorama, wie echte Fenster nebeneinander. Jede Wand bekommt dazu einen
// eigenen Versatz, damit Fenster auf verschiedenen Wänden nicht dieselbe Stelle zeigen.
// 1,4 m Höhe: Ein Standardfenster von 1,2 m zeigt damit fast das ganze Bild, von der Hecke unten
// bis in den blauen Himmel oben. Die Breite folgt aus dem Seitenverhältnis der Textur (4 : 1),
// sonst wäre das Dorf verzerrt.
const AUSSICHT_BREITE = 5.6
const AUSSICHT_HOEHE = 1.4
const AUSSICHT_HORIZONT_V = 0.48   // 1 − 0,52: Horizont in texturen.js, von unten gezählt
function setzeAussichtUV(geo, oeffnung, hoehe, segmentIndex) {
  const uLinks = 0.23 + (segmentIndex || 0) * 0.381 + oeffnung.u / AUSSICHT_BREITE
  const uRechts = uLinks + oeffnung.breite / AUSSICHT_BREITE
  const vUnten = AUSSICHT_HORIZONT_V - hoehe / 2 / AUSSICHT_HOEHE
  const vOben = AUSSICHT_HORIZONT_V + hoehe / 2 / AUSSICHT_HOEHE
  // PlaneGeometry legt ihre vier Ecken in der Reihenfolge oben links, oben rechts, unten links,
  // unten rechts an.
  const uv = geo.attributes.uv
  uv.setXY(0, uLinks, vOben)
  uv.setXY(1, uRechts, vOben)
  uv.setXY(2, uLinks, vUnten)
  uv.setXY(3, uRechts, vUnten)
  uv.needsUpdate = true
}

// Ein Türblatt mit rechteckigem Ausschnitt, aus vier Platten gebaut: links, rechts, oben, unten.
// Fürs Auge dasselbe wie ein massives Blatt mit einem Loch darin, aber ohne echte
// Geometrie-Verrechnung — die three.js nicht mitbringt und die für vier Rechtecke auch niemand
// braucht.
//
// Bis hierher war jedes verglaste Blatt eine massive Box mit einer Scheibe davor. Deshalb sah man
// durch das Glas das Blatt und nicht hindurch.
//
// Alle Maße in Blatt-Koordinaten, Nullpunkt in der Blattmitte. ausschnitt = { x, y, breite, hoehe }
// beschreibt Mitte und Größe des Lochs. Platten mit Breite oder Höhe null entstehen nicht — ein
// Ausschnitt, der bis an die Blattkante reicht, lässt die betreffende Platte einfach weg.
function baueBlattMitAusschnitt(breite, hoehe, tiefe, material, ausschnitt) {
  const blatt = new THREE.Group()
  const platte = (mx, my, pb, ph) => {
    if (pb <= 0.001 || ph <= 0.001) return
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(pb, ph, tiefe), material)
    mesh.position.set(mx, my, 0)
    mesh.castShadow = true
    blatt.add(mesh)
  }
  const links = -breite / 2, rechts = breite / 2, unten = -hoehe / 2, oben = hoehe / 2
  const aLinks = ausschnitt.x - ausschnitt.breite / 2
  const aRechts = ausschnitt.x + ausschnitt.breite / 2
  const aUnten = ausschnitt.y - ausschnitt.hoehe / 2
  const aOben = ausschnitt.y + ausschnitt.hoehe / 2
  platte((links + aLinks) / 2, 0, aLinks - links, hoehe)
  platte((aRechts + rechts) / 2, 0, rechts - aRechts, hoehe)
  platte(ausschnitt.x, (aOben + oben) / 2, ausschnitt.breite, oben - aOben)
  platte(ausschnitt.x, (unten + aUnten) / 2, ausschnitt.breite, aUnten - unten)
  return blatt
}

// Eine Scheibe für einen solchen Ausschnitt. Zwei Zentimeter größer als das Loch, damit sie im
// Falz sitzt und an den Kanten keine Fuge bleibt.
//
// Beleuchtet, nicht wie die Aussicht unbeleuchtet: Glas in einer Tür ist eine Fläche im Raum und
// soll Licht annehmen. Sie schreibt aber keine Tiefe — sonst entscheidet die Zeichenreihenfolge,
// ob man das dahinter Liegende sieht.
function baueTuerScheibe(breite, hoehe, deckkraft = 0.18, farbe = '#EAF2F7') {
  return new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.02, breite + 0.02), Math.max(0.02, hoehe + 0.02), 0.012),
    new THREE.MeshStandardMaterial({
      color: farbe, transparent: true, opacity: deckkraft,
      roughness: 0.05, metalness: 0.0, depthWrite: false,
    }),
  )
}

// Die glatte Innentür: ein Röhrenspan-Blatt mit Weißlack oder aufgedrucktem Holzdekor, wie es im
// Baumarkt steht. Sie hat nichts außer Blatt, Zarge und Drücker — keine Füllungen, keine Stege.
// Genau deshalb ist dieser Zweig der kürzeste in dieser Datei, und genau deshalb hat er bisher
// gefehlt: Es gab nichts zu bauen, was interessant aussah.
//
// dekor = aufgedruckte Maserung (holzTextur) statt Lack. Massives Holz wäre hier falsch, das ist
// im Baumarkt die Ausnahme — die Schreinerei-Ausführung ist die Kassettentür weiter unten.
//
// Eiche hell ist heller angesetzt, als der Ton allein vermuten ließe: Die Holztextur dunkelt jede
// Farbe ab, mit der sie multipliziert wird. Mit #D9BE95 stand die Tür im Bild bernsteinfarben
// da und kaum heller als die alte „Tür (Holz, Füllungen)“.
const GLATTE_TUEREN = {
  'glatt-weiss':  { blatt: '#F7F6F3', dekor: false, zarge: '#FFFEFB', klinke: '#9A9A97', licht: false },
  'glatt-eiche':  { blatt: '#EAD5B0', dekor: true,  zarge: '#F0E2C8', klinke: '#9A9A97', licht: false },
  'glatt-dunkel': { blatt: '#7A5A41', dekor: true,  zarge: '#8C6B50', klinke: '#B9B9B6', licht: false },
  'glatt-licht':  { blatt: '#F7F6F3', dekor: false, zarge: '#FFFEFB', klinke: '#9A9A97', licht: true },
}

export function baueWandElement(scene, item, raumBreite, raumTiefe, wandHoehe, eckpunkte, holzTextur, backsteinTextur, aussichtMaterial) {
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
  const gruppenY = wandElementUnterkante(item, wandHoehe)
  gruppe.position.set(px, gruppenY, pz)
  gruppe.rotation.y = ry

  // Jede Öffnung braucht eine Laibung, sonst sieht man durch das Loch in der Wand den
  // Szenenhintergrund — dasselbe Problem, das der Durchgang mit seiner Nische schon gelöst hat.
  // Zwei Tiefen, weil es zwei Bedeutungen sind: Ein Durchgang führt in einen anderen Raum und
  // ist deshalb tief (das macht sein eigener Zweig weiter unten). Alles andere bekommt nur eine
  // Laibung in Wanddicke.
  //
  // Der Grund der Laibung sagt, wohin die Öffnung führt: Wandfarbe für alles, was in einen
  // anderen Raum führt, die Dorfansicht für das, was nach draußen geht.
  //
  // Laibung: nach draußen tiefer, weil eine echte Außenwand 20 bis 40 cm dick ist und das Fenster
  // in dieser Tiefe sitzt. Nach innen genügt Wanddicke.
  const LAIBUNG_TIEFE_INNEN = 0.15
  const LAIBUNG_TIEFE_AUSSEN = 0.22
  const NACH_DRAUSSEN = new Set(['fenster'])
  const STIL_NACH_DRAUSSEN = new Set(['balkon-einzel', 'balkon-doppel', 'haustuer'])
  if (item.typ !== 'durchgang') {
    const o = wandElementOeffnung(item, wandHoehe, segment.laenge)
    const draussen = NACH_DRAUSSEN.has(item.typ) || STIL_NACH_DRAUSSEN.has(item.stil)
    const LAIBUNG_TIEFE = draussen ? LAIBUNG_TIEFE_AUSSEN : LAIBUNG_TIEFE_INNEN
    // Kontur in Gruppen-Koordinaten: Die Gruppe sitzt bereits auf der Unterkante (bei Fenstern
    // die Brüstungshöhe), die Kontur läuft deshalb von 0 bis zur Elementhöhe.
    const hoehe = Math.max(0, Math.min(wandHoehe - o.unten, o.hoehe))
    const kontur = new THREE.Shape()
    kontur.moveTo(-o.breite / 2, 0)
    kontur.lineTo(o.breite / 2, 0)
    kontur.lineTo(o.breite / 2, hoehe)
    kontur.lineTo(-o.breite / 2, hoehe)
    kontur.lineTo(-o.breite / 2, 0)
    // Die Laibung ist immer Wandfarbe — auch nach draußen. Sie ist verputzte Wand, nicht Himmel;
    // in Schritt 1 war sie hellblau, und genau das ließ sie im Schatten grau wirken.
    gruppe.add(baueNische(kontur, LAIBUNG_TIEFE, NISCHE_FARBE))

    // Und am Grund der Laibung die Aussicht, so groß wie die Öffnung. Unbeleuchtet (siehe
    // Material in RoomView3D.jsx): Draußen liegt nicht im Schatten der Laibung.
    if (draussen && aussichtMaterial) {
      const geo = new THREE.PlaneGeometry(o.breite, hoehe)
      setzeAussichtUV(geo, o, hoehe, item.wandSegment)
      const aussicht = new THREE.Mesh(geo, aussichtMaterial)
      aussicht.position.set(0, hoehe / 2, -LAIBUNG_TIEFE + 0.006)
      // Kein Klickziel und kein Schattenwerfer — dieselbe Begründung wie bei der Nische.
      aussicht.raycast = () => {}
      gruppe.add(aussicht)
    }
  }

  if (item.typ === 'fenster') {
    const elHoehe = fensterElHoehe
    const yPos = elHoehe / 2

    // Deutsches Dreh-Kipp-Fenster, Baumarkt-Optik: Blendrahmen in der Öffnung, darin ein
    // Flügelrahmen, darin EINE Scheibe, Griff seitlich in halber Höhe.
    //
    // Was hier bewusst fehlt, ist der waagerechte Riegel über die Mitte, den die alte Fassung
    // hatte: Das ist das Merkmal eines amerikanischen Schiebefensters, bei dem die untere Hälfte
    // nach oben geschoben wird. Und was hier neu ist, ist überhaupt ein Rahmen — die alte Fassung
    // war eine massive Platte über die ganze Fensterfläche, in der die Scheibe mittig steckte und
    // deshalb unsichtbar war.
    const BLEND_BREITE = 0.06   // Ansichtsbreite des Blendrahmens
    const BLEND_TIEFE = 0.12
    const FLUEGEL_BREITE = 0.07
    const FLUEGEL_TIEFE = 0.05
    const FLUEGEL_Z = 0.05      // Flügelmitte: steht gut einen Zentimeter vor dem Blendrahmen
    const PFOSTEN_BREITE = 0.08
    const UEBERSCHLAG = 0.02    // Flügel greift über die Rahmeninnenkante, wie in echt

    // stil trägt Farbe UND Flügelzahl. Alte Fenster ohne stil bekommen Holzdekor, nicht Weiß: Sie
    // sahen bisher holzfarben aus, und ein gespeicherter Raum soll nicht umgestrichen werden,
    // weil der Katalog umgestellt wurde. Dieselbe Nachsicht wie bei der Schiebetür weiter unten.
    const fensterStil = item.stil === 'doppel' ? 'holz-doppel' : (item.stil || 'holz')
    const istDoppel = fensterStil.endsWith('doppel')
    const istWeiss = fensterStil.startsWith('weiss')

    // Ein Material für alle Rahmenteile. Weiß ist Kunststoff, Holzdekor ist eine aufgedruckte
    // Maserung — kein massives Holz, denn das ist im Baumarkt die Ausnahme.
    const rahmenMat = istWeiss
      ? new THREE.MeshStandardMaterial({ color: '#FAFAF8', roughness: 0.45, metalness: 0.0 })
      : new THREE.MeshStandardMaterial({ color: '#E9D9BE', roughness: 0.6, metalness: 0.0, map: holzTextur })

    // Ein Rahmen als Ring aus vier Boxen, um den Nullpunkt zentriert. Senkrechte über die volle
    // Höhe, waagerechte dazwischen: An den Ecken entsteht dadurch eine Stoßfuge wie an einem
    // echten Rahmen, statt einer durchlaufenden Fläche.
    const baueRing = (breite, hoehe, ansicht, tiefe) => {
      const ring = new THREE.Group()
      const innen = Math.max(0.02, breite - 2 * ansicht)
      ;[-1, 1].forEach(s => {
        const senkrecht = new THREE.Mesh(new THREE.BoxGeometry(ansicht, hoehe, tiefe), rahmenMat)
        senkrecht.position.set(s * (breite - ansicht) / 2, 0, 0)
        senkrecht.castShadow = true
        ring.add(senkrecht)
      })
      ;[-1, 1].forEach(s => {
        const waagerecht = new THREE.Mesh(new THREE.BoxGeometry(innen, ansicht, tiefe), rahmenMat)
        waagerecht.position.set(0, s * (hoehe - ansicht) / 2, 0)
        waagerecht.castShadow = true
        ring.add(waagerecht)
      })
      return ring
    }

    // Ein Flügel: Rahmen, Scheibe, Griff. Einzel- und Doppelfenster bauen denselben.
    // griffSeite: +1 = Griff rechts (Bänder links), -1 = umgekehrt.
    const baueFluegel = (breite, hoehe, griffSeite) => {
      const fluegel = new THREE.Group()
      fluegel.add(baueRing(breite, hoehe, FLUEGEL_BREITE, FLUEGEL_TIEFE))

      const glas = new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(0.02, breite - 2 * FLUEGEL_BREITE),
          Math.max(0.02, hoehe - 2 * FLUEGEL_BREITE),
          0.012,
        ),
        new THREE.MeshStandardMaterial({
          color: '#EAF2F7', transparent: true, opacity: 0.18,
          roughness: 0.05, metalness: 0.0,
          // Eine einzelne Scheibe schreibt bewusst keine Tiefe: Sonst entscheidet die
          // Zeichenreihenfolge, ob man das dahinter Liegende sieht.
          depthWrite: false,
        }),
      )
      fluegel.add(glas)

      // Fenstergriff. Geschlossen zeigt der Hebel nach UNTEN — das ist die Stellung, in der ein
      // Dreh-Kipp-Fenster zu ist. Waagerecht hieße offen, nach oben gekippt, und ein Fenster im
      // Grundriss soll nicht offen stehen.
      const griffMat = istWeiss
        ? new THREE.MeshStandardMaterial({ color: '#F2F2F0', roughness: 0.4, metalness: 0.1 })
        : new THREE.MeshStandardMaterial({ color: '#B9B9B6', roughness: 0.3, metalness: 0.7 })
      const griffX = griffSeite * (breite / 2 - FLUEGEL_BREITE / 2)
      const vorn = FLUEGEL_TIEFE / 2
      const rosette = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.1, 0.014), griffMat)
      rosette.position.set(griffX, 0, vorn + 0.007)
      fluegel.add(rosette)
      const hals = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.03), griffMat)
      hals.position.set(griffX, 0, vorn + 0.029)
      fluegel.add(hals)
      const hebel = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.1, 0.024), griffMat)
      hebel.position.set(griffX, -0.055, vorn + 0.032)
      fluegel.add(hebel)

      return fluegel
    }

    const blend = baueRing(elBreite, elHoehe, BLEND_BREITE, BLEND_TIEFE)
    blend.position.set(0, yPos, 0)
    gruppe.add(blend)

    const innenBreite = Math.max(0.1, elBreite - 2 * BLEND_BREITE)
    const innenHoehe = Math.max(0.1, elHoehe - 2 * BLEND_BREITE)

    if (istDoppel) {
      const pfosten = new THREE.Mesh(new THREE.BoxGeometry(PFOSTEN_BREITE, innenHoehe, BLEND_TIEFE), rahmenMat)
      pfosten.position.set(0, yPos, 0)
      pfosten.castShadow = true
      gruppe.add(pfosten)

      // Beide Griffe zeigen zum Mittelpfosten, wie an einem echten zweiflügligen Fenster.
      const halb = Math.max(0.1, (innenBreite - PFOSTEN_BREITE) / 2)
      const versatz = PFOSTEN_BREITE / 2 + halb / 2
      ;[{ x: -versatz, seite: 1 }, { x: versatz, seite: -1 }].forEach(({ x, seite }) => {
        const fluegel = baueFluegel(halb + UEBERSCHLAG, innenHoehe + UEBERSCHLAG, seite)
        fluegel.position.set(x, yPos, FLUEGEL_Z)
        gruppe.add(fluegel)
      })
    } else {
      const fluegel = baueFluegel(innenBreite + UEBERSCHLAG, innenHoehe + UEBERSCHLAG, 1)
      fluegel.position.set(0, yPos, FLUEGEL_Z)
      gruppe.add(fluegel)
    }

    // Fensterbank innen, wie bisher unter dem Fenster.
    const bankMat = new THREE.MeshStandardMaterial({ color: istWeiss ? '#F0EEE9' : '#E8E4DC', roughness: 0.4 })
    const bank = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.1, 0.05, 0.15), bankMat)
    bank.position.set(0, yPos - elHoehe / 2 - 0.025, 0.08)
    gruppe.add(bank)

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

      // Dieselbe Kontur, die in RoomView3D.jsx das Loch in die Wand schneidet, hier als Körper
      // nach hinten extrudiert (siehe Kopf der Datei, NISCHE_TIEFE). Die Höhe wird wie dort auf
      // die Wandhöhe geklemmt, sonst ragt die Nische über die Wand, wenn der Raum nachträglich
      // niedriger gestellt wurde.
      const nischenHoehe = Math.max(0, Math.min(wandHoehe, gesamtHoehe))
      const nischenMasse = bogenMasse(elBreite, nischenHoehe)
      const bogenKontur = new THREE.Shape()
      bogenKontur.moveTo(-elBreite / 2, 0)
      bogenKontur.lineTo(elBreite / 2, 0)
      bogenKontur.lineTo(elBreite / 2, nischenMasse.kaempferHoehe)
      bogenKontur.absellipse(0, nischenMasse.kaempferHoehe, radius, nischenMasse.bogenHoehe, 0, Math.PI, false, 0)
      bogenKontur.lineTo(-elBreite / 2, 0)
      gruppe.add(baueNische(bogenKontur))

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

      const nischenHoehe = Math.min(wandHoehe, elHoehe)   // wie vOben beim Wandloch
      const kontur = new THREE.Shape()
      kontur.moveTo(-elBreite / 2, 0)
      kontur.lineTo(elBreite / 2, 0)
      kontur.lineTo(elBreite / 2, nischenHoehe)
      kontur.lineTo(-elBreite / 2, nischenHoehe)
      kontur.lineTo(-elBreite / 2, 0)
      gruppe.add(baueNische(kontur))
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
      // Blatt als Rahmen mit echtem Ausschnitt. Der untere Schenkel ist deutlich breiter als die
      // übrigen — das ist das Merkmal, an dem man eine Balkontür von einem bis zum Boden
      // reichenden Fenster unterscheidet.
      const ANSICHT = 0.11
      const ANSICHT_UNTEN = 0.19
      const ausBreite = Math.max(0.05, elBreite - 2 * ANSICHT)
      const ausHoehe = Math.max(0.05, elHoehe - ANSICHT - ANSICHT_UNTEN)
      // Mitte des Ausschnitts liegt über der Blattmitte, weil unten mehr Rahmen steht.
      const ausY = (ANSICHT_UNTEN - ANSICHT) / 2

      const tuerMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.5, metalness: 0.1, map: holzTextur })
      const blatt = baueBlattMitAusschnitt(elBreite, elHoehe, 0.06, tuerMat, {
        x: 0, y: ausY, breite: ausBreite, hoehe: ausHoehe,
      })
      blatt.position.set(0, elHoehe / 2, 0.03)
      gruppe.add(blatt)

      const scheibe = baueTuerScheibe(ausBreite, ausHoehe)
      scheibe.position.set(0, ausY, 0)
      blatt.add(scheibe)

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
      // Mitten auf dem senkrechten Schenkel und mit der Rückseite auf dem Blatt (Vorderseite
      // 0.06). Bei elBreite/2 - 0.1 ragte er 5 mm in den Ausschnitt, und bei z = 0.09 schwebte er
      // 1,5 cm vor dem Blatt — vorher verdeckte die vorgesetzte Scheibe beides.
      griff.position.set(elBreite/2 - ANSICHT / 2, elHoehe * 0.5, 0.075)
      gruppe.add(griff)
    } else if (item.stil === 'balkon-doppel') {
      // Balkontür Doppelflügel: zwei Einzelflügel-Türen nebeneinander (je Hälfte baugleich zum
      // Einzelflügel oben), Griffe zur Mitte hin gespiegelt — wie bei echten zweiflügligen Türen.
      const MITTELPFOSTEN_BREITE = 0.08
      const halbBreite = (elBreite - MITTELPFOSTEN_BREITE) / 2
      const versatz = (halbBreite + MITTELPFOSTEN_BREITE) / 2
      ;[-versatz, versatz].forEach(x => {
        // Jeder Flügel baugleich zum Einzelflügel, nur schmaler — gleiche Rahmenbreiten, gleicher
        // breiterer unterer Schenkel.
        const ANSICHT = 0.1
        const ANSICHT_UNTEN = 0.17
        const ausBreite = Math.max(0.05, halbBreite - 2 * ANSICHT)
        const ausHoehe = Math.max(0.05, elHoehe - ANSICHT - ANSICHT_UNTEN)
        const ausY = (ANSICHT_UNTEN - ANSICHT) / 2

        const tuerMat = new THREE.MeshStandardMaterial({ color: '#F5F0E8', roughness: 0.5, metalness: 0.1, map: holzTextur })
        const blatt = baueBlattMitAusschnitt(halbBreite, elHoehe, 0.06, tuerMat, {
          x: 0, y: ausY, breite: ausBreite, hoehe: ausHoehe,
        })
        blatt.position.set(x, elHoehe / 2, 0.03)
        gruppe.add(blatt)

        const scheibe = baueTuerScheibe(ausBreite, ausHoehe)
        scheibe.position.set(0, ausY, 0)
        blatt.add(scheibe)

        const griffMat = new THREE.MeshStandardMaterial({ color: '#888780', metalness: 0.8, roughness: 0.2 })
        const griff = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), griffMat)
        // x passt (6 cm vom Rand, Schenkel 10 cm). z wie beim Einzelflügel auf die Blattfläche.
        griff.position.set(x > 0 ? x - halbBreite/2 + 0.06 : x + halbBreite/2 - 0.06, elHoehe * 0.5, 0.075)
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
      // Schmaler Lichtstreifen als echter Ausschnitt, nahe der Schlossseite wie bisher. Oben und
      // unten bleibt bewusst viel Blatt stehen — ein Streifen, der bis an die Kante läuft, sieht
      // nach Industrietür aus, nicht nach Hauseingang.
      const streifenBreite = Math.max(0.04, elBreite * 0.12)
      const streifenHoehe = Math.max(0.1, elHoehe - 0.6)
      const streifenX = elBreite / 2 - elBreite * 0.18

      const tuerMat = new THREE.MeshStandardMaterial({ color: '#3B3B39', roughness: 0.4, metalness: 0.3 })
      const blatt = baueBlattMitAusschnitt(elBreite, elHoehe, 0.07, tuerMat, {
        x: streifenX, y: 0, breite: streifenBreite, hoehe: streifenHoehe,
      })
      blatt.position.set(0, elHoehe / 2, 0.035)
      gruppe.add(blatt)

      // Mattiert und weniger durchsichtig als eine Balkontür: An einer Haustür will niemand von
      // draußen hereinsehen können.
      const scheibe = baueTuerScheibe(streifenBreite, streifenHoehe, 0.5, '#D7E4EA')
      scheibe.position.set(streifenX, 0, 0)
      blatt.add(scheibe)

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
      // Links neben dem Lichtstreifen statt bei elBreite/2 - 0.2: Dort lag er bei einer 1 m
      // breiten Tür mitten im Streifen (0,26 bis 0,38 m), also jetzt über dem Loch.
      griff.position.set(streifenX - streifenBreite / 2 - 0.07, elHoehe * 0.5, 0.1)
      gruppe.add(griff)
    } else if (GLATTE_TUEREN[item.stil]) {
      const ausfuehrung = GLATTE_TUEREN[item.stil]
      // 4 cm Blatt: Ein Innentürblatt ist dünner als eine Balkontür (6 cm) und deutlich dünner
      // als eine Haustür (7 cm).
      const BLATT_TIEFE = 0.04

      const blattMat = new THREE.MeshStandardMaterial({ color: ausfuehrung.blatt, roughness: 0.5, metalness: 0.0 })
      if (ausfuehrung.dekor) blattMat.map = holzTextur

      if (ausfuehrung.licht) {
        // Lichtausschnitt: ein hohes, schmales Glasfeld etwas über der Blattmitte, oben und unten
        // bleibt reichlich Blatt. Das ist die gängige Baumarkt-Ausführung — nicht die
        // vollflächige Glastür, die es als eigenen Eintrag schon gibt.
        //
        // Die Breite ist nach oben begrenzt, damit zwischen Glaskante und Drücker Blatt bleibt:
        // Der Drücker sitzt 6,5 cm vom Rand, seine Rosette hat 3,5 cm Radius. Ohne die Grenze
        // steckte die Rosette bei einer schmalen Tür im Glas.
        const ausBreite = Math.max(0.05, Math.min(elBreite * 0.42, elBreite - 0.3))
        const ausHoehe = Math.max(0.1, elHoehe * 0.5)
        const ausY = elHoehe * 0.09
        const blatt = baueBlattMitAusschnitt(elBreite, elHoehe, BLATT_TIEFE, blattMat, {
          x: 0, y: ausY, breite: ausBreite, hoehe: ausHoehe,
        })
        blatt.position.set(0, elHoehe / 2, BLATT_TIEFE / 2)
        gruppe.add(blatt)

        // Mattiert wie bei der Zimmer-Glastür: Sichtschutz, aber man sieht, ob drüben Licht
        // brennt.
        const scheibe = baueTuerScheibe(ausBreite, ausHoehe, 0.55, '#DCE8F0')
        scheibe.position.set(0, ausY, 0)
        blatt.add(scheibe)
      } else {
        const blatt = new THREE.Mesh(new THREE.BoxGeometry(elBreite, elHoehe, BLATT_TIEFE), blattMat)
        blatt.position.set(0, elHoehe / 2, BLATT_TIEFE / 2)
        blatt.castShadow = true
        gruppe.add(blatt)
      }

      // Zarge in denselben Maßen wie an den übrigen Türen, aber im Ton der Ausführung: Zu einer
      // weißen Tür gehört eine weiße Zarge, zu einer Eichentür eine in Eiche.
      const zargeMat = new THREE.MeshStandardMaterial({ color: ausfuehrung.zarge, roughness: 0.6 })
      if (ausfuehrung.dekor) zargeMat.map = holzTextur
      const zargeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, elHoehe + 0.1, 0.15), zargeMat)
      zargeL.position.set(-elBreite / 2 - 0.04, elHoehe / 2, 0)
      gruppe.add(zargeL)
      const zargeR = zargeL.clone()
      zargeR.position.x = elBreite / 2 + 0.04
      gruppe.add(zargeR)
      const zargeO = new THREE.Mesh(new THREE.BoxGeometry(elBreite + 0.16, 0.08, 0.15), zargeMat)
      zargeO.position.set(0, elHoehe + 0.04, 0)
      gruppe.add(zargeO)

      // 6,5 cm vom Rand ist das übliche Maß an einer Zimmertür (55 mm Dornmaß plus Falz) — dieselbe
      // Begründung wie am Standard-Türzweig weiter unten. z ist hier die Blattvorderseite, denn ein
      // glattes Blatt hat nichts, was darauf aufliegt.
      const klinkeX = elBreite / 2 - 0.065, klinkeY = elHoehe * 0.47
      baueKlinke(gruppe, klinkeX, klinkeY, BLATT_TIEFE, ausfuehrung.klinke)

      const schluesselMat = new THREE.MeshStandardMaterial({ color: '#888780', metalness: 0.8, roughness: 0.2 })
      const schluessel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), schluesselMat)
      schluessel.position.set(klinkeX, klinkeY - 0.085, BLATT_TIEFE + 0.02)
      gruppe.add(schluessel)

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
      // Innen-Glastür: schmaler Rahmen ringsum, großes mattiertes Feld. Anders als bei der
      // Balkontür bleibt der untere Schenkel nur leicht breiter — eine Zimmertür hat kein Wetter
      // abzuhalten.
      //
      // 9 cm statt der gerechneten 7: Auf dem Schenkel sitzt die Klinke, und ihre Rosette hat 7 cm
      // Durchmesser — bei 7 cm Schenkel stünde sie bündig an der Glaskante.
      const ANSICHT = 0.09
      const ANSICHT_UNTEN = 0.12
      const ausBreite = Math.max(0.05, elBreite - 2 * ANSICHT)
      const ausHoehe = Math.max(0.05, elHoehe - ANSICHT - ANSICHT_UNTEN)
      const ausY = (ANSICHT_UNTEN - ANSICHT) / 2

      const tuerMat = new THREE.MeshStandardMaterial({ color: '#FAFAF8', roughness: 0.4, metalness: 0.0 })
      const blatt = baueBlattMitAusschnitt(elBreite, elHoehe, 0.05, tuerMat, {
        x: 0, y: ausY, breite: ausBreite, hoehe: ausHoehe,
      })
      blatt.position.set(0, elHoehe / 2, 0.025)
      gruppe.add(blatt)

      // Mattiert: Eine Zimmer-Glastür ist Sichtschutz, kein Fenster. Deutlich deckender als die
      // Balkontür, aber hell — man soll sehen, ob im Nachbarraum Licht brennt.
      const scheibe = baueTuerScheibe(ausBreite, ausHoehe, 0.55, '#DCE8F0')
      scheibe.position.set(0, ausY, 0)
      blatt.add(scheibe)

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

      // Mitten auf dem senkrechten Rahmenschenkel. An der alten Stelle (elBreite/2 - 0.09) hätte
      // die Rosette (7 cm Durchmesser) jetzt zur Hälfte im Ausschnitt gehangen, und z = 0.06 war
      // die Vorderseite der alten, vorgesetzten Scheibe — das Blatt endet bei 0.05.
      // Edelstahlton, wie an Glastüren üblich.
      baueKlinke(gruppe, elBreite/2 - ANSICHT / 2, elHoehe * 0.47, 0.05, '#A8A8A5')
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
