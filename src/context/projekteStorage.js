import { initialRooms, DEFAULT_WIZARD_SCHRITT } from '../constants'
import { migriereRaum } from './roomsStorage'

const STORAGE_KEY = 'planixy-rooms'
const SCHEMA_VERSION = 3
const STANDARD_PROJEKT_NAME = 'Mein Zuhause'

const neuesProjektObjekt = (id, raeume, name = STANDARD_PROJEKT_NAME) => {
  const jetzt = new Date().toISOString()
  return { id, name, erstelltAm: jetzt, geaendertAm: jetzt, raeume }
}

// v0 (rohes Array von Räumen, kein schemaVersion-Feld) -> v1 ({ schemaVersion: 1, rooms })
const migriereV0ZuV1 = (rohesArray) => ({
  schemaVersion: 1,
  rooms: rohesArray.map(migriereRaum),
})

// v1 -> v2: die bisher flache Raumliste wird zum ersten Projekt "Mein Zuhause"
const migriereV1ZuV2 = (v1Daten) => ({
  schemaVersion: 2,
  projekte: [neuesProjektObjekt(1, v1Daten.rooms || [])],
})

// v2 -> v3: jeder Raum bekommt einen Wizard-Schritt (Default: erster Schritt), falls noch nicht vorhanden
const migriereV2ZuV3 = (v2Daten) => ({
  schemaVersion: 3,
  projekte: (v2Daten.projekte || []).map(projekt => ({
    ...projekt,
    raeume: (projekt.raeume || []).map(raum => ({ wizardSchritt: DEFAULT_WIZARD_SCHRITT, ...raum })),
  })),
})

export const loadProjekte = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return [neuesProjektObjekt(1, initialRooms)]

  let daten = JSON.parse(saved)

  // Migrationskette darf keine Version überspringen: v0 -> v1 -> v2 -> v3
  if (Array.isArray(daten)) {
    daten = migriereV0ZuV1(daten)
  }
  if (daten.schemaVersion === 1) {
    daten = migriereV1ZuV2(daten)
  }
  if (daten.schemaVersion === 2) {
    daten = migriereV2ZuV3(daten)
  }
  if (daten.schemaVersion === SCHEMA_VERSION) {
    return daten.projekte
  }

  // Unbekannte/zukünftige Version oder unvollständige Hülle: defensiv zurückfallen
  return daten.projekte || [neuesProjektObjekt(1, initialRooms)]
}

export const saveProjekte = (projekte) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, projekte }))
}

export const alleRaeume = (projekte) => projekte.flatMap(p => p.raeume || [])
