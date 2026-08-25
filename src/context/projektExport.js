import { SCHEMA_VERSION, migriereProjekteDaten } from './projekteStorage'
import { erzeugeRaum } from '../constants'
import { vergibProjektId, vergibRaumId, vergibMoebelId, vergibWandId } from './idZaehler'

// Dateiname darf keine Zeichen enthalten, die unter Windows/macOS/Linux in Dateinamen verboten
// sind — Projektnamen sind Freitext und könnten z.B. "/" enthalten.
const sanitisiereDateiname = (name) => name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Projekt'

// Baut den Dateiinhalt für den Projekt-Export — dieselbe Hülle ({schemaVersion, projekte}) wie
// die localStorage-Sicherung (projekteStorage.js), nur mit einem einzigen Projekt statt allen,
// damit parseProjektDatei unten dieselbe Migrationskette (migriereProjekteDaten) unverändert
// wiederverwenden kann, egal ob eine alte Exportdatei später auf eine neuere App-Version trifft.
export function serialisiereProjekt(projekt) {
  const heute = new Date().toISOString().slice(0, 10)
  const dateiname = `${sanitisiereDateiname(projekt.name)}_${heute}.json`
  const json = JSON.stringify({ schemaVersion: SCHEMA_VERSION, projekte: [projekt] }, null, 2)
  return { dateiname, json }
}

// Liest eine exportierte Projektdatei ein und liefert ein importbereites Projekt mit frischen,
// app-weit eindeutigen IDs (Projekt, Räume, Möbel, Trennwände — dieselben zentralen Zähler wie
// beim Duplizieren, siehe ProjekteListeContext.jsx duplicateProjekt) zurück. Wirft bei jedem
// Problem (kaputtes JSON, fremde/unvollständige Struktur, ein Raum mit unbekannten oder
// fehlenden Pflichtfeldern) einen Error mit einer für den Nutzer verständlichen Meldung, statt
// die App abstürzen zu lassen — die Raum-Prüfung nutzt dafür erzeugeRaum() (constants.js),
// dieselbe Stelle, die auch jeden intern neu erzeugten Raum validiert.
export function parseProjektDatei(text) {
  let rohDaten
  try {
    rohDaten = JSON.parse(text)
  } catch {
    throw new Error('Datei ist kein gültiges JSON.')
  }

  const projekte = migriereProjekteDaten(rohDaten)
  const projektRoh = projekte?.[0]
  if (!projektRoh || typeof projektRoh !== 'object') {
    throw new Error('Datei enthält kein gültiges Planixy-Projekt.')
  }
  if (!Array.isArray(projektRoh.raeume) || projektRoh.raeume.length === 0) {
    throw new Error('Projekt enthält keine Räume.')
  }

  const raeume = projektRoh.raeume.map(raum => {
    let geprueft
    try {
      geprueft = erzeugeRaum({ ...raum, id: vergibRaumId() })
    } catch (err) {
      throw new Error(`Raum "${raum?.name ?? '?'}" ist ungültig: ${err.message}`)
    }
    return {
      ...geprueft,
      furniture: (geprueft.furniture || []).map(item => ({ ...item, id: vergibMoebelId() })),
      trennwaende: (geprueft.trennwaende || []).map(wand => ({ ...wand, id: vergibWandId() })),
    }
  })

  const jetzt = new Date().toISOString()
  return {
    id: vergibProjektId(),
    name: projektRoh.name || 'Importiertes Projekt',
    erstelltAm: jetzt,
    geaendertAm: jetzt,
    raeume,
  }
}

// Hängt bei einer Namenskollision mit einem bestehenden Projekt "(importiert)" an, statt beim
// Nutzer nachzufragen — bei einer weiteren Kollision (z.B. dieselbe Datei zweimal importiert)
// wird durchnummeriert.
export function eindeutigerProjektname(name, bestehendeNamen) {
  if (!bestehendeNamen.includes(name)) return name
  let kandidat = `${name} (importiert)`
  let n = 2
  while (bestehendeNamen.includes(kandidat)) {
    kandidat = `${name} (importiert ${n})`
    n++
  }
  return kandidat
}
