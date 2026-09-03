// Brücke zwischen den echten Amazon-Produkten (produktempfehlungen.js) und dem Katalog/der
// 3D-Szene (constants.js/moebel.js): löst Produktfarbe (deutscher Name) zu Hex auf, rechnet
// Produktmaße (cm) in die Katalog-Skala um und wählt einen sinnvollen Default beim Platzieren.
import { produktEmpfehlungen } from './produktempfehlungen'
import { wandFarben } from '../constants'

// Katalog-Skala ist 60 Einheiten = 1 Meter (siehe WAND_DICKE_PX/berechneInnenmasse in
// constants.js und deren Rückrechnung in scene/moebel.js: item.width/60 -> Meter). Ein
// cm-Wert aus einem echten Produkt muss deshalb mit 0.6 skaliert werden, nicht mit 0.6 geraten
// an mehreren Stellen einzeln — daher hier zentral.
export function cmZuKatalogEinheit(cm) {
  return Math.max(1, Math.round(cm * 0.6))
}

// Zusätzliche Farbnamen, die in produktempfehlungen.js vorkommen, aber als Wandfarbe (wandFarben)
// keinen Sinn ergeben würden (Edelstahl, Nussbaum, ...) und deshalb nicht dort, sondern nur hier
// ergänzt werden. Bewusst NICHT aufgenommen: 'Transparent', 'Mehrfarbig', 'Warmweiß' — das sind
// keine eindeutigen Vollfarben, für die raten wir nicht, sondern fallen auf die Katalogfarbe des
// Möbeltyps zurück.
const ZUSAETZLICHE_PRODUKT_FARBEN = {
  Blau: '#3B6FA6',
  Grün: '#4B7F52',
  Braun: '#7B5233',
  Rot: '#A33B3B',
  Silber: '#BFC0C2',
  Edelstahl: '#C7C8C4',
  Natur: '#C9A876',
  Nussbaum: '#5C4425',
  Walnuss: '#5C4425',
  Schiefergrau: '#5C6266',
  Rosa: '#E8AFC0',
  Dunkelgrau: '#5F5E5A',
  Eiche: '#C3986A',
}

const PRODUKT_FARBEN = Object.fromEntries([
  ...wandFarben.map(w => [w.name, w.farbe]),
  ...Object.entries(ZUSAETZLICHE_PRODUKT_FARBEN),
])

// null statt geraten, wenn der Name in keiner Tabelle auftaucht — der Aufrufer fällt dann auf
// die generische Katalogfarbe zurück.
export function farbNameZuHex(name) {
  return PRODUKT_FARBEN[name] || null
}

// Leitet eine Kantenfarbe aus der aufgelösten Hex-Farbe ab (etwas abgedunkelt), da echte
// Produkte kein eigenes border/Kantenfarbe-Feld haben und das nicht manuell gepflegt werden soll.
export function dunklerFarbe(hex, faktor = 0.72) {
  const n = hex.replace('#', '')
  const bigint = parseInt(n, 16)
  const kanal = (shift) => Math.max(0, Math.min(255, Math.round(((bigint >> shift) & 255) * faktor)))
  const zweistellig = (v) => v.toString(16).padStart(2, '0')
  return `#${zweistellig(kanal(16))}${zweistellig(kanal(8))}${zweistellig(kanal(0))}`
}

export function produkteFuerTyp(moebelName) {
  return produktEmpfehlungen.filter(p => p.moebelName === moebelName)
}

// Vorschlag beim Platzieren aus dem Katalog: bevorzugt ein Produkt mit verifiziertem Preis,
// sonst das erste — null, wenn es für den Typ (noch) keine echten Produkte gibt.
export function ersterVorschlag(moebelName) {
  const optionen = produkteFuerTyp(moebelName)
  if (optionen.length === 0) return null
  return optionen.find(p => p.preis != null) || optionen[0]
}

// Übersetzt ein ausgewähltes Produkt in die Felder, die ein Katalog-/Möbel-Item braucht (Farbe,
// Kantenfarbe, Maße, echte Höhe, Produkt-Referenz) — jedes Feld einzeln, fehlt es am Produkt,
// bleibt der Katalog-Default (katalogDefault) erhalten statt das ganze Produkt zu verwerfen.
// `katalogDefault` ist der generische furnitureLibrary-Eintrag für den Möbeltyp (width/height/
// color/border), NICHT das aktuell platzierte Möbelstück — so bleibt bei einem Produktwechsel
// jedes fehlende Feld beim ursprünglichen Katalog-Default statt beim vorherigen Produkt.
export function produktAufKatalogItemAnwenden(katalogDefault, produkt) {
  if (!produkt) {
    return {
      width: katalogDefault.width, height: katalogDefault.height,
      color: katalogDefault.color, border: katalogDefault.border,
      echteHoeheM: undefined, produktId: undefined,
    }
  }
  const hex = produkt.farbe ? farbNameZuHex(produkt.farbe) : null
  return {
    width: produkt.breite != null ? cmZuKatalogEinheit(produkt.breite) : katalogDefault.width,
    height: produkt.tiefe != null ? cmZuKatalogEinheit(produkt.tiefe) : katalogDefault.height,
    color: hex || katalogDefault.color,
    border: hex ? dunklerFarbe(hex) : katalogDefault.border,
    echteHoeheM: produkt.hoehe != null ? produkt.hoehe / 100 : undefined,
    produktId: produkt.id,
  }
}
