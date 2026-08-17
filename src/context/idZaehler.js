import { loadProjekte, alleRaeume } from './projekteStorage'
import { maxId } from './roomsStorage'

// Alle ID-Zähler liegen zentral hier, weil IDs app-weit eindeutig sein müssen — Räume/Möbel/
// Trennwände entstehen sowohl beim normalen Bearbeiten (RoomsContext/FurnitureContext/
// TrennwandContext) als auch beim Duplizieren eines ganzen Projekts (ProjekteListeContext).

let naechsteRaumId = maxId(alleRaeume(loadProjekte()).map(r => r.id)) + 1
export const vergibRaumId = () => naechsteRaumId++

let naechsteProjektId = maxId(loadProjekte().map(p => p.id)) + 1
export const vergibProjektId = () => naechsteProjektId++

let naechsteMoebelId = maxId(alleRaeume(loadProjekte()).flatMap(r => (r.furniture || []).map(f => f.id))) + 1
export const vergibMoebelId = () => naechsteMoebelId++

let naechsteWandId = maxId(alleRaeume(loadProjekte()).flatMap(r => (r.trennwaende || []).map(w => w.id))) + 1
export const vergibWandId = () => naechsteWandId++
