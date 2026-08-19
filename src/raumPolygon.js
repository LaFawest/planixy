// Zentrale Geometrie-Utility für Raumformen. Ein Raum wird durch eine Eckpunktliste
// (im Uhrzeigersinn, Meter, Ursprung oben-links) beschrieben — alles hier leitet sich
// daraus ab. Für ein Rechteck mit Breite B und Tiefe T: (0,0) → (B,0) → (B,T) → (0,T).
//
// Diese Reihenfolge deckt sich für Rechtecke mit der bisherigen Wandreihenfolge
// nord/ost/sued/west aus wandSeiten in constants.js (Segment 0 = nord, 1 = ost, ...)
// und ist Voraussetzung für die Normalen-Berechnung in wandSegmente().
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

// Liefert das nächstgelegene Wandsegment zu einem Punkt samt Distanz — Basis für
// Wand-Snapping (z.B. Fenster/Türen an die nächste Kante statt an feste Himmelsrichtungen).
export function naechsteKante(punkt, eckpunkte) {
  return wandSegmente(eckpunkte).reduce((beste, segment) => {
    const distanz = distanzPunktZuStrecke(punkt, segment.start, segment.ende)
    return !beste || distanz < beste.distanz ? { ...segment, distanz } : beste
  }, null)
}
