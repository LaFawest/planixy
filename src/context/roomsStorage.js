import { initialRooms, DEFAULT_RAUM_DESIGN } from '../constants'

const STORAGE_KEY = 'planixy-rooms'
const SCHEMA_VERSION = 1

// Vor Schema v1 waren fussleiste/fussleisteFarbe/raumHoehe globaler State, nicht Teil
// des Raums, aber optisch für alle Räume gleich. Damit beim Umstieg nichts springt,
// bekommen bestehende Räume ohne diese Felder genau die alten Default-Werte fest zugewiesen.
const migriereRaum = (room) => ({ ...DEFAULT_RAUM_DESIGN, ...room })

export const loadRooms = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return initialRooms

  const parsed = JSON.parse(saved)

  // Altformat: rohes Array ohne schemaVersion-Hülle
  if (Array.isArray(parsed)) {
    return parsed.map(migriereRaum)
  }

  if (parsed.schemaVersion === SCHEMA_VERSION) {
    return parsed.rooms
  }

  // Unbekannte/zukünftige Version oder unvollständige Hülle: defensiv migrieren
  return (parsed.rooms || []).map(migriereRaum)
}

export const saveRooms = (rooms) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, rooms }))
}

export const maxId = (werte) => werte.reduce((max, w) => typeof w === 'number' && w > max ? w : max, 0)
