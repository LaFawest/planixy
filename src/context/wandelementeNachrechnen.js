// Fenster und Türen: Lage im Grundriss bei jedem Laden aus der Wand neu berechnen.
//
// Gespeichert ist für jedes Wandelement zweierlei: wandSegment + wandPosition (daraus baut 3D das
// Element, scene/wandelemente.js) und left/top/rotation (daraus zeichnet der Grundriss es). Beides
// sollte dieselbe Stelle meinen. Bis zum 16.11.2026 tat es das an rückwärts laufenden Wänden nicht
// (beim Rechteck Süd und West): Der Grundriss zählte dort bis zur fernen Kante, 3D ab der nahen.
// Seit platziereAufSegment ebenfalls ab der nahen Kante zählt, stimmen neu gesetzte Elemente —
// gespeicherte aber trugen noch das alte left/top, und ein Klick darauf im Grundriss hätte sie
// von dort aus neu eingerastet und wandPosition überschrieben.
//
// Deshalb gilt wandPosition als Quelle (Hassans Entscheidung: 3D hat recht), und left/top/rotation
// werden beim Laden daraus nachgerechnet. Bei jedem Laden statt als Schema-Umrechnung: Die Rechnung
// ist billig und ändert an einem stimmigen Element nichts, und ohne neue Schema-Version kann ein
// noch offener Tab mit älterem Code die Daten weiter lesen. wandPosition und wandSegment bleiben
// unverändert. Passt ein Element nicht mehr auf seine Wand (platziereAufWandSegment liefert null),
// bleibt es, wie es ist — darum kümmert sich wie bisher die Nachjustierung nach einer Formänderung.
import { WAND_DICKE_PX } from '../constants'
import { rechteckPolygon, innenKonturen, platziereAufWandSegment } from '../raumPolygon'

export const wandelementeNachrechnen = (raum) => {
  const furniture = raum.furniture || []
  if (!furniture.some(item => item.istWandElement)) return raum
  let innenEckpunkte
  try {
    const eckpunkte = raum.eckpunkte || rechteckPolygon(raum.breite || 6, raum.tiefe || 5)
    innenEckpunkte = innenKonturen(eckpunkte.map(p => ({ x: p.x * 60, y: p.y * 60 })), 0).innenEckpunkte
  } catch {
    return raum
  }
  let geaendert = false
  const neu = furniture.map(item => {
    if (!item.istWandElement) return item
    const platziert = platziereAufWandSegment(item.wandSegment, item.wandPosition || 0, item.width, item.height, innenEckpunkte, WAND_DICKE_PX)
    if (!platziert) return item
    if (platziert.left === item.left && platziert.top === item.top && platziert.rotation === item.rotation) return item
    geaendert = true
    return { ...item, left: platziert.left, top: platziert.top, rotation: platziert.rotation }
  })
  return geaendert ? { ...raum, furniture: neu } : raum
}
