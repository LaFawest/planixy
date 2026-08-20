// Zentrale Geometrie-Utility für Raumformen. Ein Raum wird durch eine Eckpunktliste
// (im Uhrzeigersinn, Meter, Ursprung oben-links) beschrieben — alles hier leitet sich
// daraus ab. Für ein Rechteck mit Breite B und Tiefe T: (0,0) → (B,0) → (B,T) → (0,T).
//
// Diese Reihenfolge deckt sich für Rechtecke mit der bisherigen Wandreihenfolge
// nord/ost/sued/west (Segment 0 = nord, 1 = ost, ...), siehe HIMMELSRICHTUNG_JE_SEGMENT in
// constants.js, und ist Voraussetzung für die Normalen-Berechnung in wandSegmente().
//
// Alle Werte werden in derselben Einheit wie die Eckpunkte erwartet/zurückgegeben
// (aktuell: Meter). Die Umrechnung in Bildschirm-Pixel passiert erst bei den
// Verbrauchern, nicht hier.

// Erzeugt die Eckpunkte eines rechteckigen Raums mit Breite B und Tiefe T.
export function rechteckPolygon(breite, tiefe) {
  return [
    { x: 0, y: 0 },
    { x: breite, y: 0 },
    { x: breite, y: tiefe },
    { x: 0, y: tiefe },
  ]
}

// Erzeugt die Eckpunkte eines L-förmigen Raums: ein Rechteck B×T, aus dem an einer Ecke ein
// Rechteck aussparungBreite×aussparungTiefe ausgespart ist. `ecke` bestimmt, welche Ecke fehlt.
// Jeder Zweig verfolgt den Rand im Uhrzeigersinn um die Aussparung herum (dieselbe Orientierung
// wie rechteckPolygon, Voraussetzung für wandSegmente()).
export function lFormPolygon(breite, tiefe, aussparungBreite, aussparungTiefe, ecke) {
  const b = breite, t = tiefe, nb = aussparungBreite, nt = aussparungTiefe
  switch (ecke) {
    case 'nordost':
      return [{ x: 0, y: 0 }, { x: b - nb, y: 0 }, { x: b - nb, y: nt }, { x: b, y: nt }, { x: b, y: t }, { x: 0, y: t }]
    case 'suedwest':
      return [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: t }, { x: nb, y: t }, { x: nb, y: t - nt }, { x: 0, y: t - nt }]
    case 'nordwest':
      return [{ x: 0, y: nt }, { x: nb, y: nt }, { x: nb, y: 0 }, { x: b, y: 0 }, { x: b, y: t }, { x: 0, y: t }]
    case 'suedost':
    default:
      return [{ x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: t - nt }, { x: b - nb, y: t - nt }, { x: b - nb, y: t }, { x: 0, y: t }]
  }
}

// Erzeugt die Eckpunkte eines U-förmigen Raums: ein Rechteck B×T, aus dessen einer Seite mittig
// eine Aussparung aussparungBreite×aussparungTiefe herausgeschnitten ist. `seite` bestimmt,
// welche Seite die Aussparung trägt. Analog zu lFormPolygon im Uhrzeigersinn aufgebaut.
export function uFormPolygon(breite, tiefe, aussparungBreite, aussparungTiefe, seite) {
  const b = breite, t = tiefe, nb = aussparungBreite, nt = aussparungTiefe
  const bMin = (b - nb) / 2, bMax = (b + nb) / 2
  const tMin = (t - nt) / 2, tMax = (t + nt) / 2
  switch (seite) {
    case 'sued':
      return [
        { x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: t },
        { x: bMax, y: t }, { x: bMax, y: t - nt }, { x: bMin, y: t - nt }, { x: bMin, y: t }, { x: 0, y: t },
      ]
    case 'ost':
      return [
        { x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: tMin }, { x: b - nb, y: tMin },
        { x: b - nb, y: tMax }, { x: b, y: tMax }, { x: b, y: t }, { x: 0, y: t },
      ]
    case 'west':
      return [
        { x: 0, y: 0 }, { x: b, y: 0 }, { x: b, y: t }, { x: 0, y: t }, { x: 0, y: tMax },
        { x: nb, y: tMax }, { x: nb, y: tMin }, { x: 0, y: tMin },
      ]
    case 'nord':
    default:
      return [
        { x: 0, y: 0 }, { x: bMin, y: 0 }, { x: bMin, y: nt }, { x: bMax, y: nt }, { x: bMax, y: 0 },
        { x: b, y: 0 }, { x: b, y: t }, { x: 0, y: t },
      ]
  }
}

// Erzeugt die Eckpunkte für einen Raum anhand seiner Formfelder (raumForm, breite, tiefe,
// aussparungBreite, aussparungTiefe, ausrichtung) — der zentrale Dispatcher, den updateRoom
// (RoomsContext.jsx) bei jeder Formänderung aufruft. Für raumForm 'rechteck' (oder fehlend, zur
// Rückwärtskompatibilität mit Räumen vor Schritt 9b) identisch zu rechteckPolygon(breite, tiefe).
export function raumformPolygon(room) {
  const breite = room.breite || 6
  const tiefe = room.tiefe || 5
  if (room.raumForm === 'l-form' || room.raumForm === 'u-form') {
    const nb = room.aussparungBreite
    const nt = room.aussparungTiefe
    if (!(nb > 0) || !(nt > 0) || nb >= breite || nt >= tiefe) {
      throw new Error('raumPolygon: Aussparung muss größer als 0 und kleiner als Breite/Tiefe sein')
    }
    return room.raumForm === 'l-form'
      ? lFormPolygon(breite, tiefe, nb, nt, room.ausrichtung || 'nordost')
      : uFormPolygon(breite, tiefe, nb, nt, room.ausrichtung || 'nord')
  }
  return rechteckPolygon(breite, tiefe)
}

// Validiert/bereinigt eine rohe Eckpunktliste zu einem gültigen Randpolygon:
// mindestens 3 Punkte, keine doppelten/deckungsgleichen aufeinanderfolgenden Punkte.
export function randpolygon(eckpunkte) {
  const bereinigt = (eckpunkte || []).filter((p, i, arr) => {
    const vorheriger = arr[(i - 1 + arr.length) % arr.length]
    return Math.hypot(p.x - vorheriger.x, p.y - vorheriger.y) > 1e-9
  })
  if (bereinigt.length < 3) {
    throw new Error('raumPolygon: mindestens 3 Eckpunkte erforderlich')
  }
  return bereinigt
}

// Wandsegmente: ein Segment je Kante zwischen zwei aufeinanderfolgenden Eckpunkten,
// mit Index, Start-/Endpunkt, Länge und nach außen zeigender Normale (Einheitsvektor).
export function wandSegmente(eckpunkte) {
  const polygon = randpolygon(eckpunkte)
  return polygon.map((start, i) => {
    const ende = polygon[(i + 1) % polygon.length]
    const dx = ende.x - start.x
    const dy = ende.y - start.y
    const laenge = Math.hypot(dx, dy)
    // Bei im Uhrzeigersinn orientierten Punkten (Bildschirm-Koordinaten, y wächst nach
    // unten) zeigt (dy, -dx) normiert nach außen.
    const normale = { x: dy / laenge, y: -dx / laenge }
    return { index: i, start, ende, laenge, normale }
  })
}

// Bounding-Box eines Polygons.
export function boundingBox(eckpunkte) {
  const polygon = randpolygon(eckpunkte)
  const xs = polygon.map(p => p.x)
  const ys = polygon.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  return { minX, maxX, minY, maxY, breite: maxX - minX, tiefe: maxY - minY }
}

// Innenmaße: Bounding-Box der Eckpunkte, nach innen versetzt um die Wanddicke.
// wandDicke muss in derselben Einheit wie die Eckpunkte übergeben werden.
// Für ein Rechteck deckungsgleich mit berechneInnenmasse() aus constants.js (dort in Pixel).
export function innenmasse(eckpunkte, wandDicke) {
  const box = boundingBox(eckpunkte)
  return {
    innenBreite: Math.max(0, box.breite - wandDicke * 2),
    innenTiefe: Math.max(0, box.tiefe - wandDicke * 2),
  }
}

// Fläche eines (auch konkaven) Polygons per Shoelace-Formel. Für ein Rechteck identisch zu
// breite*tiefe — bei einer L-/U-Form dagegen (anders als breite*tiefe, was nur die
// Bounding-Box-Fläche wäre) die tatsächliche Grundfläche abzüglich der Aussparung.
export function polygonFlaeche(eckpunkte) {
  const polygon = randpolygon(eckpunkte)
  let summe = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    summe += a.x * b.y - b.x * a.y
  }
  return Math.abs(summe) / 2
}

// Schnittpunkt zweier unbegrenzter Geraden, je durch einen Punkt und einen Richtungsvektor
// gegeben. null, wenn die Geraden parallel sind (kein eindeutiger Schnittpunkt).
function linienSchnittpunkt(p0, d0, p1, d1) {
  const nenner = d0.x * d1.y - d0.y * d1.x
  if (Math.abs(nenner) < 1e-9) return null
  const t = ((p1.x - p0.x) * d1.y - (p1.y - p0.y) * d1.x) / nenner
  return { x: p0.x + d0.x * t, y: p0.y + d0.y * t }
}

// Versetzt jede Kante eines Randpolygons um `versatz` entgegen ihrer nach außen zeigenden
// Normale (also nach innen) und bildet aus den Schnittpunkten benachbarter versetzter Kanten
// ein neues, verkleinertes Polygon — die "echte" Innenfläche (Wanddicke/Fußleiste vom Rand
// abgezogen) für jede Form, nicht nur für ein Rechteck. Für ein Rechteck ergibt das wieder ein
// Rechteck, auf jeder Seite um `versatz` verkleinert — identisch zur bisherigen festen
// Bounding-Box-Berechnung.
//
// Wirft einen Fehler statt ein kaputtes (sich selbst überschneidendes) Polygon zurückzugeben,
// wenn der Versatz eine Kante umklappen würde — das passiert, sobald ein Raumteil schmaler als
// der doppelte Versatz ist (z.B. ein zu schmaler Schenkel einer L-/U-Form). Die hier geprüfte
// Kanten-Umklapp-Bedingung deckt genau diesen bei achsparallelen Formen (Schritt 9b) tatsächlich
// auftretenden Fall ab; eine vollständige Selbstüberschneidungsprüfung für beliebige (auch
// schräge) Polygone wäre deutlich aufwendiger und ist hier nicht nötig.
export function versetztesPolygon(eckpunkte, versatz) {
  const polygon = randpolygon(eckpunkte)
  const n = polygon.length
  const versetzteKanten = wandSegmente(polygon).map(segment => ({
    start: { x: segment.start.x - segment.normale.x * versatz, y: segment.start.y - segment.normale.y * versatz },
    richtung: { x: segment.ende.x - segment.start.x, y: segment.ende.y - segment.start.y },
  }))
  const neuePunkte = polygon.map((_, i) => {
    const vorherige = versetzteKanten[(i - 1 + n) % n]
    const aktuelle = versetzteKanten[i]
    const schnitt = linienSchnittpunkt(vorherige.start, vorherige.richtung, aktuelle.start, aktuelle.richtung)
    if (!schnitt) {
      throw new Error('raumPolygon: Wandversatz nicht möglich (parallele Kanten ohne Schnittpunkt)')
    }
    return schnitt
  })
  neuePunkte.forEach((punkt, i) => {
    const naechsterPunkt = neuePunkte[(i + 1) % n]
    const neueRichtung = { x: naechsterPunkt.x - punkt.x, y: naechsterPunkt.y - punkt.y }
    const originalRichtung = versetzteKanten[i].richtung
    if (neueRichtung.x * originalRichtung.x + neueRichtung.y * originalRichtung.y <= 0) {
      throw new Error('raumPolygon: Raumteil ist schmaler als der doppelte Wandversatz')
    }
  })
  return neuePunkte
}

// Liefert die beiden inneren Konturen, auf die Möbel/Fenster (grenzeEckpunkte, zusätzlich um die
// Fußleiste versetzt) bzw. Trennwände (innenEckpunkte) beim Ziehen einrasten — aus dem äußeren
// Randpolygon (in Pixeln, z.B. polygonPx aus useRaumGeometrie) über versetztesPolygon()
// abgeleitet. Beide Konturen werden zusätzlich um wandDicke verschoben, weil ihr Ursprung (0,0)
// im lokalen Koordinatensystem von canvasInnerRef liegt, das selbst schon um wandDicke nach
// innen versetzt aus dem äußeren Rahmen (eckpunkte) hervorgeht — ohne diesen Shift wären beide
// Konturen um wandDicke zu weit außen. Hook-freie Variante der Logik, die bisher direkt in
// useRaumGeometrie.js stand, damit sie auch außerhalb von React-Komponenten aufrufbar ist (siehe
// RoomsContext.jsx, Nachjustierung nach einer Formänderung, Schritt 9b-2).
export function innenPolygone(eckpunkte, wandDicke, fussleisteBreite) {
  const verschieben = (polygon) => polygon.map(p => ({ x: p.x - wandDicke, y: p.y - wandDicke }))
  return {
    innenEckpunkte: verschieben(versetztesPolygon(eckpunkte, wandDicke)),
    grenzeEckpunkte: verschieben(versetztesPolygon(eckpunkte, wandDicke + fussleisteBreite)),
  }
}

// Punkt-in-Polygon-Prüfung (Ray-Casting-Algorithmus). Punkt in denselben Koordinaten
// wie die Eckpunkte. Randinklusiv: ein Punkt exakt auf einer Kante gilt als innen — das
// reine Ray-Casting behandelt (durch die Wahl von >/< statt >=/<=) die untere/rechte Kante
// eines Rechtecks asymmetrisch zur oberen/linken und würde z.B. eine Trennwand oder ein Möbel
// flush an der Süd-/Ostwand fälschlich als außerhalb werten.
export function punktInPolygon(punkt, eckpunkte) {
  const polygon = randpolygon(eckpunkte)
  let innen = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i], pj = polygon[j]
    if (distanzPunktZuStrecke(punkt, pi, pj) < 1e-6) return true
    const schneidet = ((pi.y > punkt.y) !== (pj.y > punkt.y)) &&
      (punkt.x < (pj.x - pi.x) * (punkt.y - pi.y) / (pj.y - pi.y) + pi.x)
    if (schneidet) innen = !innen
  }
  return innen
}

// Orientierung von r relativ zur Strecke p→q: 0 = kollinear, 1/2 = im/gegen den Uhrzeigersinn.
function orientierung(p, q, r) {
  const wert = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)
  if (Math.abs(wert) < 1e-9) return 0
  return wert > 0 ? 1 : 2
}

// Prüft eine ECHTE Überkreuzung zweier Strecken a–b und c–d. Bloßes Berühren zählt bewusst
// NICHT als Kreuzung (kollinear, ein Endpunkt liegt auf der anderen Strecke, ...) — das ist
// nötig, weil z.B. eine Trennwand flush an einer Außenwand enden oder entlangverlaufen darf,
// ohne als "verlässt den Raum" gewertet zu werden. Nur ein tatsächliches Durchqueren
// (etwa eine Strecke quer über eine Nische bei einer U-Form) gilt als ungültig.
export function segmenteKreuzenSich(a, b, c, d) {
  const o1 = orientierung(a, b, c)
  const o2 = orientierung(a, b, d)
  const o3 = orientierung(c, d, a)
  const o4 = orientierung(c, d, b)
  return o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4
}

// Prüft, ob ein achsenparalleles Rechteck (z.B. eine Möbel-Bounding-Box) vollständig im
// Polygon liegt: alle vier Ecken müssen im Polygon liegen UND keine Wandkante darf das
// Rechteck echt kreuzen. Der zweite Teil ist nötig, weil eine Nische mittig in einer Wand
// (U-Form) sonst unentdeckt bliebe, obwohl alle vier Ecken links/rechts davon im soliden
// Bereich liegen.
export function rechteckInPolygon(links, oben, breite, hoehe, eckpunkte) {
  const polygon = randpolygon(eckpunkte)
  const ecken = [
    { x: links, y: oben },
    { x: links + breite, y: oben },
    { x: links + breite, y: oben + hoehe },
    { x: links, y: oben + hoehe },
  ]
  if (!ecken.every(p => punktInPolygon(p, polygon))) return false
  const rechteckKanten = ecken.map((p, i) => [p, ecken[(i + 1) % ecken.length]])
  return !wandSegmente(polygon).some(segment =>
    rechteckKanten.some(([a, b]) => segmenteKreuzenSich(a, b, segment.start, segment.ende)))
}

// Sucht eine gültige Position für ein Möbelstück (Breite/Höhe in Pixel) nahe einer der Ecken des
// Randpolygons — Fallback, wenn eine Kandidatposition weder direkt noch nach einer einfachen
// Bounding-Box-Klemmung gültig ist. Das kann bei einer konkaven Form (Aussparung) passieren: eine
// Position kann innerhalb der äußeren Bounding-Box liegen und trotzdem in der Aussparung selbst,
// wo eine reine Min/Max-Klemmung nichts ausrichtet. null, wenn keine Ecke passt (z.B. Möbelstück
// größer als jede Nische) — der Aufrufer muss dann selbst entscheiden, was er stattdessen tut.
export function naechsteFreieEcke(breite, hoehe, eckpunkte, grenzStart, grenzB, grenzT) {
  const polygon = randpolygon(eckpunkte)
  const klemmeX = (x) => Math.max(grenzStart, Math.min(grenzStart + grenzB - breite, x))
  const klemmeY = (y) => Math.max(grenzStart, Math.min(grenzStart + grenzT - hoehe, y))
  return polygon
    .map(p => ({ left: klemmeX(p.x - breite / 2), top: klemmeY(p.y - hoehe / 2) }))
    .find(({ left, top }) => rechteckInPolygon(left, top, breite, hoehe, polygon)) || null
}

// Prüft, ob eine Strecke a–b (z.B. eine Trennwand) vollständig im Polygon liegt: beide
// Endpunkte müssen im Polygon liegen UND keine Wandkante darf die Strecke echt kreuzen —
// sonst bliebe eine Strecke quer über eine Nische (U-Form) unentdeckt, obwohl beide
// Endpunkte im soliden Bereich liegen.
export function streckeInPolygon(a, b, eckpunkte) {
  const polygon = randpolygon(eckpunkte)
  if (!punktInPolygon(a, polygon) || !punktInPolygon(b, polygon)) return false
  return !wandSegmente(polygon).some(segment => segmenteKreuzenSich(a, b, segment.start, segment.ende))
}

export function distanzPunktZuStrecke(punkt, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const laengeQuadrat = dx * dx + dy * dy
  if (laengeQuadrat === 0) return Math.hypot(punkt.x - a.x, punkt.y - a.y)
  let t = ((punkt.x - a.x) * dx + (punkt.y - a.y) * dy) / laengeQuadrat
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(punkt.x - (a.x + t * dx), punkt.y - (a.y + t * dy))
}

// Leitet aus der nach außen zeigenden Normale eines Wandsegments eine grobe Himmelsrichtung
// ab (die betragsmäßig größere Achse entscheidet) — funktioniert für jede Segment-Ausrichtung,
// nicht nur für die vier achsparallelen Wände eines Rechtecks. Für ein Rechteck ergibt das
// exakt die bisherige feste Zuordnung (Segment 0 = Nord, 1 = Ost, 2 = Süd, 3 = West), siehe
// wandSegmente() oben.
export function himmelsrichtungAusNormale(normale) {
  return Math.abs(normale.x) >= Math.abs(normale.y)
    ? (normale.x > 0 ? 'ost' : 'west')
    : (normale.y > 0 ? 'sued' : 'nord')
}

// Liefert das nächstgelegene Wandsegment zu einem Punkt samt Distanz — Basis für
// Wand-Snapping (z.B. Fenster/Türen an die nächste Kante statt an feste Himmelsrichtungen).
export function naechsteKante(punkt, eckpunkte) {
  return wandSegmente(eckpunkte).reduce((beste, segment) => {
    const distanz = distanzPunktZuStrecke(punkt, segment.start, segment.ende)
    return !beste || distanz < beste.distanz ? { ...segment, distanz } : beste
  }, null)
}

// Platziert ein Fenster/Tür-Element (Breite w, Höhe h) flush auf der Innenseite eines bereits
// gewählten Wandsegments, so nah wie möglich an gewuenschtePosition (Pixel vom Segmentanfang in
// Richtung Segmentende, wird hier auf die tatsächliche Segmentlänge geklemmt). Reine
// Platzierungsgeometrie, getrennt von der Segment-Auswahl — genutzt sowohl von snappeWandElement
// (Segment über die nächstgelegene Kante gesucht) als auch von platziereAufWandSegment (Segment
// über seinen Index vorgegeben, siehe dort).
function platziereAufSegment(segment, gewuenschtePosition, w, h) {
  const horizontal = segment.start.y === segment.ende.y
  const vorwaerts = horizontal ? segment.ende.x >= segment.start.x : segment.ende.y >= segment.start.y

  let left, top, rotation
  if (horizontal) {
    rotation = 0
    const minX = Math.min(segment.start.x, segment.ende.x)
    const maxX = Math.max(segment.start.x, segment.ende.x)
    const ziel = vorwaerts ? segment.start.x + gewuenschtePosition : segment.start.x - gewuenschtePosition
    left = Math.max(minX, Math.min(maxX - w, ziel))
    top = segment.normale.y < 0 ? segment.start.y : segment.start.y - h
  } else {
    rotation = 90
    const minY = Math.min(segment.start.y, segment.ende.y)
    const maxY = Math.max(segment.start.y, segment.ende.y)
    const ziel = vorwaerts ? segment.start.y + gewuenschtePosition : segment.start.y - gewuenschtePosition
    top = Math.max(minY, Math.min(maxY - w, ziel))
    left = segment.normale.x < 0 ? segment.start.x : segment.start.x - h
  }

  const wandPosition = horizontal
    ? Math.abs(left - segment.start.x) / 60
    : Math.abs(top - segment.start.y) / 60

  return { left, top, wandSegment: segment.index, wandPosition, rotation }
}

// Snapt ein Fenster/Tür-Element (Breite w, Höhe h, gesucht um seinen Mittelpunkt cx/cy) auf das
// nächstgelegene Wandsegment von eckpunkte. Reine Funktion ohne React-Bezug, deshalb sowohl beim
// interaktiven Ziehen (FurnitureContext.jsx) als auch als Fallback bei der Nachjustierung nach
// einer Formänderung (RoomsContext.jsx, Schritt 9b-2) verwendbar, wenn platziereAufWandSegment
// (siehe dort) das bisherige Segment nicht mehr wiederverwenden kann.
export function snappeWandElement(cx, cy, w, h, eckpunkte) {
  const segment = naechsteKante({ x: cx, y: cy }, eckpunkte)
  const horizontal = segment.start.y === segment.ende.y
  const gewuenschtePosition = horizontal
    ? Math.abs((cx - w / 2) - segment.start.x)
    : Math.abs((cy - w / 2) - segment.start.y)
  return platziereAufSegment(segment, gewuenschtePosition, w, h)
}

// Hält ein Fenster/Tür-Element auf SEINEM bisherigen Wandsegment (Index segmentIndex, Position
// wandPositionM in Metern vom Segmentanfang), statt komplett neu zu suchen — für die
// Nachjustierung nach einer Formänderung (RoomsContext.jsx, Schritt 9b-2): eine Größenänderung
// verschiebt oft die Segment-Endpunkte, ohne dass die Wand, an der ein Fenster hängt, eine
// andere sein sollte. null, wenn der Index nicht mehr existiert oder das Element nicht mehr
// darauf passt — dann muss der Aufrufer auf snappeWandElement zurückfallen.
export function platziereAufWandSegment(segmentIndex, wandPositionM, w, h, eckpunkte) {
  const segment = wandSegmente(eckpunkte)[segmentIndex]
  if (!segment || wandPositionM * 60 + w > segment.laenge + 1e-6) return null
  return platziereAufSegment(segment, wandPositionM * 60, w, h)
}
