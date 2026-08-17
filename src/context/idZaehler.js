import { loadProjekte, alleRaeume } from './projekteStorage'
import { maxId } from './roomsStorage'

// Raum-IDs müssen app-weit eindeutig sein: Räume entstehen sowohl über RoomsContext.addRoom
// als auch über ProjekteListeContext.addProjekt (Standardraum), deshalb ein gemeinsamer Zähler.
let naechsteRaumId = maxId(alleRaeume(loadProjekte()).map(r => r.id)) + 1
export const vergibRaumId = () => naechsteRaumId++

let naechsteProjektId = maxId(loadProjekte().map(p => p.id)) + 1
export const vergibProjektId = () => naechsteProjektId++
