// Umrechnung gespeicherter Räume von Schema 7 auf 8: Raummaße als Innenmaß (Hassans Entscheidung
// vom 16.11.2026). Geprüft mit scripts/pruefe-migration-v8.mjs, eingehängt in die Ladekette von
// projekteStorage.js (migriereProjekteDaten) — alle drei Ladewege laufen hindurch: Gast,
// Konto und Datei-Import.
//
// Bis Schema 7 galt: Die Eckpunkte sind die Außenkante. Der Grundriss zieht die Wand (WAND_DICKE_PX)
// und die Fußleiste (8 px) nach innen ab, und left/top der Möbel zählen ab der so verkleinerten
// Innenfläche. 3D dagegen stellt die Wände auf die Eckpunkte und streckt die Lage der Möbel aus
// dieser Innenfläche auf die volle Raumgröße — daher 15,5 bis 20,7 cm Luft zwischen einem im
// Grundriss bündigen Möbelstück und der Wand.
//
// Ab Schema 8 gilt: Die Eckpunkte sind die Wandinnenseite. Pixel zählen ab der inneren Wandecke
// (Minimum der Eckpunkte), 60 px/m ohne Streckung, die Fußleiste ist FUSSLEISTE_TIEFE_M tief.
//
// Die Umrechnung je Raum:
// 1. Möbel, Deckenleuchten und Trennwände behalten ihre Lage in 3D: Ihre Mitte wird um denselben
//    Faktor gestreckt, mit dem 3D bisher gestreckt hat (Raumbreite in px / Innenbreite in px). Die
//    Größe bleibt. Weil nur die Abstände zwischen den Mitten wachsen, entstehen keine neuen
//    Überlappungen.
// 2. Was im alten Grundriss bündig an einer Wand lag (Abstand zur Wandinnenseite höchstens alte
//    Fußleiste + 0,5 px, je Segment, damit es auch für L-/U-Formen gilt), rückt an die neue
//    Grenze: mit Fußleiste FUSSLEISTE_TIEFE_M vor die Wand, ohne direkt an die Wand. Das sind die
//    gemessenen 11,5 bis 16,7 cm. Elektrogeräte (stehen auf Möbeln) und Deckenleuchten nicht.
// 3. Fenster und Türen: left/top neu aus wandSegment und wandPosition. wandPosition und
//    bruestungshoehe bleiben — in 3D bewegt sich also nichts.
import { WAND_DICKE_PX, FUSSLEISTE_TIEFE_M, DEFAULT_RAUM_DESIGN, istDeckenleuchte } from '../constants'
import { rechteckPolygon, boundingBox, innenPolygone, wandSegmente, platziereAufWandSegment } from '../raumPolygon'

const ALTE_FUSSLEISTE_PX = 8
const TOLERANZ_PX = 0.5

const gedrehteBox = (breite, hoehe, rotationGrad) => {
  const rad = (rotationGrad || 0) * Math.PI / 180
  return {
    breite: breite * Math.abs(Math.cos(rad)) + hoehe * Math.abs(Math.sin(rad)),
    hoehe: breite * Math.abs(Math.sin(rad)) + hoehe * Math.abs(Math.cos(rad)),
  }
}

// Schiebt ein Möbelstück, das im alten Grundriss an einer Wand anlag, an dieselbe Wand im neuen.
// altSegmente: Wandinnenseiten im alten Rahmen; neuSegmente: dieselben Wände im neuen Rahmen
// (gleicher Index, versetztesPolygon erhält die Reihenfolge). Nur achsparallele Wände — andere
// Formen gibt es in der App nicht.
const anWandRuecken = (altLinks, altOben, neuLinks, neuOben, box, altSegmente, neuSegmente, fussleisteAltPx, fussleisteNeuPx) => {
  let links = neuLinks
  let oben = neuOben
  altSegmente.forEach((alt, i) => {
    const neu = neuSegmente[i]
    if (!neu) return
    if (alt.start.y === alt.ende.y && Math.abs(alt.normale.y) > 0.5) {
      const vonX = Math.min(alt.start.x, alt.ende.x), bisX = Math.max(alt.start.x, alt.ende.x)
      if (altLinks + box.breite <= vonX || altLinks >= bisX) return
      const wandAlt = alt.start.y
      const abstand = alt.normale.y < 0 ? altOben - wandAlt : wandAlt - (altOben + box.hoehe)
      if (abstand < -TOLERANZ_PX || abstand > fussleisteAltPx + TOLERANZ_PX) return
      oben = alt.normale.y < 0 ? neu.start.y + fussleisteNeuPx : neu.start.y - fussleisteNeuPx - box.hoehe
    } else if (alt.start.x === alt.ende.x && Math.abs(alt.normale.x) > 0.5) {
      const vonY = Math.min(alt.start.y, alt.ende.y), bisY = Math.max(alt.start.y, alt.ende.y)
      if (altOben + box.hoehe <= vonY || altOben >= bisY) return
      const wandAlt = alt.start.x
      const abstand = alt.normale.x < 0 ? altLinks - wandAlt : wandAlt - (altLinks + box.breite)
      if (abstand < -TOLERANZ_PX || abstand > fussleisteAltPx + TOLERANZ_PX) return
      links = alt.normale.x < 0 ? neu.start.x + fussleisteNeuPx : neu.start.x - fussleisteNeuPx - box.breite
    }
  })
  return { links, oben }
}

export const migriereRaumV7ZuV8 = (raum) => {
  const eckpunkte = raum.eckpunkte || rechteckPolygon(raum.breite || 6, raum.tiefe || 5)
  const polygonPx = eckpunkte.map(p => ({ x: p.x * 60, y: p.y * 60 }))
  const box = boundingBox(polygonPx)
  // Faktoren, mit denen 3D bisher die 2D-Innenfläche auf die volle Raumgröße gestreckt hat.
  const fx = box.breite / (box.breite - WAND_DICKE_PX * 2)
  const fy = box.tiefe / (box.tiefe - WAND_DICKE_PX * 2)
  const fussleisteAn = raum.fussleiste ?? DEFAULT_RAUM_DESIGN.fussleiste
  const fussleisteAltPx = fussleisteAn ? ALTE_FUSSLEISTE_PX : 0
  const fussleisteNeuPx = fussleisteAn ? FUSSLEISTE_TIEFE_M * 60 : 0

  // Neuer Rahmen: Ursprung an der inneren Wandecke, Wände auf den Eckpunkten.
  const wandNeuPx = polygonPx.map(p => ({ x: p.x - box.minX, y: p.y - box.minY }))
  const neuSegmente = wandSegmente(wandNeuPx)
  // Alter Rahmen: Wandinnenseite um WAND_DICKE_PX nach innen versetzt und um WAND_DICKE_PX
  // verschoben (wie useRaumGeometrie bis Schema 7). Kann bei sehr schmalen Schenkeln werfen —
  // dann wird nur gestreckt, ohne Ranrücken.
  let altSegmente = []
  try {
    altSegmente = wandSegmente(innenPolygone(polygonPx, WAND_DICKE_PX, fussleisteAltPx).innenEckpunkte)
  } catch {
    altSegmente = []
  }

  const furniture = (raum.furniture || []).map(item => {
    if (item.istWandElement) {
      const neu = platziereAufWandSegment(item.wandSegment, item.wandPosition, item.width, item.height, wandNeuPx, WAND_DICKE_PX)
      return neu ? { ...item, left: neu.left, top: neu.top, rotation: neu.rotation } : item
    }
    // Mitte so, wie baueMoebel (scene/moebel.js) sie aus width/height bildet — die soll in 3D
    // bleiben, wo sie ist.
    const box3d = gedrehteBox(item.width, item.height, item.rotation)
    const mitteX = (item.left + box3d.breite / 2) * fx
    const mitteY = (item.top + box3d.hoehe / 2) * fy
    let left = mitteX - box3d.breite / 2
    let top = mitteY - box3d.hoehe / 2
    if (item.kategorie !== 'Elektrogeräte' && !istDeckenleuchte(item.name || '')) {
      // Anliegen prüfen mit der Box, mit der FurnitureContext beim Ziehen klemmt.
      const boxKlemm = gedrehteBox(item.origWidth || item.width, item.origHeight || item.height, item.rotation)
      const gerueckt = anWandRuecken(item.left, item.top, left, top, boxKlemm, altSegmente, neuSegmente, fussleisteAltPx, fussleisteNeuPx)
      left = gerueckt.links
      top = gerueckt.oben
    }
    return { ...item, left, top }
  })

  const trennwaende = (raum.trennwaende || []).map(wand => ({
    ...wand, x1: wand.x1 * fx, y1: wand.y1 * fy, x2: wand.x2 * fx, y2: wand.y2 * fy,
  }))

  return { ...raum, furniture, trennwaende }
}

export const migriereV7ZuV8 = (v7Daten) => ({
  schemaVersion: 8,
  projekte: (v7Daten.projekte || []).map(projekt => ({
    ...projekt,
    raeume: (projekt.raeume || []).map(migriereRaumV7ZuV8),
  })),
})
