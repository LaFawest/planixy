import { DEFAULT_RAUM_DESIGN } from '../constants'

// Vor Schema v1 waren fussleiste/fussleisteFarbe/raumHoehe globaler State, nicht Teil
// des Raums, aber optisch für alle Räume gleich. Damit beim Umstieg nichts springt,
// bekommen bestehende Räume ohne diese Felder genau die alten Default-Werte fest zugewiesen.
export const migriereRaum = (room) => ({ ...DEFAULT_RAUM_DESIGN, ...room })

export const maxId = (werte) => werte.reduce((max, w) => typeof w === 'number' && w > max ? w : max, 0)
