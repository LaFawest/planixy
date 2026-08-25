// Alle ID-Vergaben liegen zentral hier, weil IDs app-weit eindeutig sein müssen — Räume/Möbel/
// Trennwände entstehen sowohl beim normalen Bearbeiten (RoomsContext/FurnitureContext/
// TrennwandContext) als auch beim Duplizieren/Importieren eines ganzen Projekts
// (ProjekteListeContext/projektExport.js).
//
// crypto.randomUUID() statt eines localStorage-weiten "größte ID + 1"-Zählers: der Zähler musste
// bei jedem neuen Element alle Projekte aus localStorage einlesen, um die nächste freie ID zu
// finden — rein lokal/sequenziell gedacht, und spätestens sobald zwei Geräte/Nutzer gleichzeitig
// schreiben (Supabase-Umbau), könnten zwei Clients dieselbe ID vergeben. Ein UUID braucht dagegen
// keinen gemeinsamen Zustand und keinen Lese-Zugriff, um eindeutig zu sein.
//
// Bestehende Projekte behalten ihre alten numerischen IDs unverändert (keine Migration) — neue
// und alte IDs sind einfach beides gültige, eindeutige Strings/Werte, die per === verglichen
// werden; nirgends in der App wird mit einer ID gerechnet oder nach ihr sortiert.
export const vergibProjektId = () => crypto.randomUUID()
export const vergibRaumId = () => crypto.randomUUID()
export const vergibMoebelId = () => crypto.randomUUID()
export const vergibWandId = () => crypto.randomUUID()
