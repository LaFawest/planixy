// Prüft die Katalog-Ordnung in src/data/bauarten.js gegen den Möbelbestand und die 3D-Modelle.
// Aufruf (wie die anderen Prüfskripte, gebündelt, weil die Quelldateien Vite-Importe nutzen):
//   npx esbuild scripts/pruefe-bauarten.mjs --bundle --platform=node --format=esm --outfile=node_modules/.cache/pruefe-bauarten.mjs
//   node node_modules/.cache/pruefe-bauarten.mjs
// Endet mit Code 1, sobald etwas nicht stimmt.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { furnitureLibrary } from '../src/constants.js'
import { produktEmpfehlungen } from '../src/data/produktempfehlungen.js'
import { FAMILIEN, UNTERGRUPPEN, RAEUME, BAUARTEN, produktFuerKatalog } from '../src/data/bauarten.js'

const fehler = []
const melde = (text) => fehler.push(text)

// Bauarten mit 3D-Modell, direkt aus dem Text von scene/modelle.js gelesen: modelle.js lädt
// three.js und den GLTFLoader, die man für diese Prüfung nicht braucht. Pfad ab dem Repo-Ordner,
// weil das gebündelte Skript unter node_modules/.cache liegt — also aus dem Repo-Ordner aufrufen.
const modellText = readFileSync(join(process.cwd(), 'src', 'scene', 'modelle.js'), 'utf8')
const modellBlock = modellText.slice(modellText.indexOf('const MODELL_DATEIEN = {'))
const modellBlockEnde = modellBlock.indexOf('\n}')
const mitModell = new Set([...modellBlock.slice(0, modellBlockEnde).matchAll(/^\s*'([^']+)':\s*'\/modelle\//gm)].map(m => m[1]))

const kategorieJeName = new Map(furnitureLibrary.map(f => [f.name, f.kategorie]))
const familienKeys = new Set(FAMILIEN.map(f => f.key))
const raumKeys = new Set(RAEUME.map(r => r.key))

// 1. Jede Bauart mit Modell (außer Leuchten aus Schritt 3) ist eingeordnet.
for (const name of mitModell) {
  if (kategorieJeName.get(name) === 'Licht') continue
  if (!BAUARTEN[name]) melde(`Bauart mit Modell ohne Zuordnung: ${name}`)
}

// 2. Jede eingeordnete Bauart gibt es im Bestand, mit Modell, und sie ist vollständig.
for (const [name, info] of Object.entries(BAUARTEN)) {
  if (!kategorieJeName.has(name)) melde(`Unbekannte Bauart (nicht in furnitureLibrary): ${name}`)
  if (!mitModell.has(name)) melde(`Bauart ohne 3D-Modell eingeordnet: ${name}`)
  if (!familienKeys.has(info.familie)) melde(`${name}: unbekannte Familie "${info.familie}"`)
  const untergruppen = UNTERGRUPPEN[info.familie]
  if (untergruppen && !untergruppen.some(u => u.key === info.untergruppe)) melde(`${name}: Untergruppe fehlt oder ist unbekannt ("${info.untergruppe}")`)
  if (!untergruppen && info.untergruppe) melde(`${name}: Untergruppe "${info.untergruppe}", obwohl die Familie keine hat`)
  if (!Array.isArray(info.raeume) || info.raeume.length === 0) melde(`${name}: kein Raum`)
  for (const raum of info.raeume || []) if (!raumKeys.has(raum)) melde(`${name}: unbekannter Raum "${raum}"`)
  if (new Set(info.raeume).size !== (info.raeume || []).length) melde(`${name}: Raum doppelt`)
}

// 3. Keine Familie und kein Raum bleibt leer.
for (const f of FAMILIEN) if (!Object.values(BAUARTEN).some(b => b.familie === f.key)) melde(`Familie ohne Bauart: ${f.name}`)
for (const r of RAEUME) if (!Object.values(BAUARTEN).some(b => b.raeume.includes(r.key))) melde(`Raum ohne Bauart: ${r.name}`)

// 4. Produkte: Jedes verweist auf eine bekannte Bauart und hat nach der Umformung alle Felder.
const pflichtFelder = ['id', 'bauart', 'quelle', 'titel']
const ids = new Set()
for (const p of produktEmpfehlungen) {
  if (!kategorieJeName.has(p.moebelName)) melde(`Produkt ${p.id}: unbekannte Bauart "${p.moebelName}"`)
  if (ids.has(p.id)) melde(`Produkt-ID doppelt: ${p.id}`)
  ids.add(p.id)
  const k = produktFuerKatalog(p)
  for (const feld of pflichtFelder) if (!k[feld]) melde(`Produkt ${p.id}: Feld ${feld} leer`)
  if (k.bildUrl && k.bildUrl.includes('media-amazon')) melde(`Produkt ${p.id}: Amazon-Bildadresse`)
}

// Übersicht
const jeFamilie = FAMILIEN.map(f => `${f.name}: ${Object.values(BAUARTEN).filter(b => b.familie === f.key).length}`)
const jeRaum = RAEUME.map(r => `${r.name}: ${Object.values(BAUARTEN).filter(b => b.raeume.includes(r.key)).length}`)
const schritt4Bauarten = Object.keys(BAUARTEN).length
const mitProdukt = Object.keys(BAUARTEN).filter(n => produktEmpfehlungen.some(p => p.moebelName === n)).length
console.log(`Bauarten eingeordnet: ${schritt4Bauarten} (mit Modell, ohne Leuchten: ${[...mitModell].filter(n => kategorieJeName.get(n) !== 'Licht').length})`)
console.log(`davon mit mindestens einem Produkt: ${mitProdukt}`)
console.log(`Familien: ${jeFamilie.join(', ')}`)
console.log(`Räume: ${jeRaum.join(', ')}`)
console.log(`Produkte geprüft: ${produktEmpfehlungen.length}`)

if (fehler.length) {
  console.error(`\n${fehler.length} Fehler:`)
  fehler.forEach(f => console.error('  - ' + f))
  process.exit(1)
}
console.log('\nAlles in Ordnung.')
