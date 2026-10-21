import { furnitureLibrary } from '../constants'
import { hatModell } from '../scene/modelle'

// Die Licht-Typen aus Schritt 3 sind gezeichnete Geometrie mit echten Lichtquellen, kein
// geladenes Modell — ein Meshy-Modell wäre dort ein Rückschritt, weil es nicht leuchtet.
// Sie sind von der Modellpflicht deshalb ausgenommen, genau wie Fenster und Türen aus
// Schritt 2, die über istWandElement laufen und gar keine Möbel sind.
const LICHT_KATEGORIE = 'Licht'
const KATEGORIE_JE_NAME = new Map(furnitureLibrary.map(f => [f.name, f.kategorie]))

// Die eine Regel. Beantwortet für ein Katalog-Item ODER ein platziertes Möbelstück dieselbe
// Frage: Darf das in der App vorkommen?
export function darfVorkommen(item) {
  if (!item) return false
  if (item.istWandElement) return true
  if (KATEGORIE_JE_NAME.get(item.name) === LICHT_KATEGORIE) return true
  return hatModell(item.name)
}

// Entfernt aus einer Liste von Räumen alle Möbel, die nach obiger Regel nicht mehr vorkommen
// dürfen. Gibt die Räume unverändert zurück, wenn nichts zu entfernen war — so bleibt die
// Objektidentität erhalten und React rendert nicht ohne Grund neu.
export function raeumeBereinigen(raeume) {
  if (!Array.isArray(raeume)) return raeume
  let etwasEntfernt = false
  const bereinigt = raeume.map(raum => {
    const moebel = raum?.furniture
    if (!Array.isArray(moebel)) return raum
    const behalten = moebel.filter(darfVorkommen)
    if (behalten.length === moebel.length) return raum
    etwasEntfernt = true
    return { ...raum, furniture: behalten }
  })
  return etwasEntfernt ? bereinigt : raeume
}
