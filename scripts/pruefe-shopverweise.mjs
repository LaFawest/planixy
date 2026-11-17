// Prüft die Shop-Verweise in src/data/shopVerweise.js gegen Bauarten, Leuchtentypen und Räume.
// Aufruf (wie die anderen Prüfskripte, gebündelt, weil die Quelldateien Vite-Importe nutzen):
//   npx esbuild scripts/pruefe-shopverweise.mjs --bundle --platform=node --format=esm --outfile=node_modules/.cache/pruefe-shopverweise.mjs
//   node node_modules/.cache/pruefe-shopverweise.mjs
// Endet mit Code 1, sobald etwas nicht stimmt.
import { furnitureLibrary } from '../src/constants.js'
import { BAUARTEN, RAEUME } from '../src/data/bauarten.js'
import { HAENDLER, SHOP_VERWEISE } from '../src/data/shopVerweise.js'

// Planixys Publisher-id bei Awin. Steht bewusst hier und nicht in shopVerweise.js: Die Prüfung soll
// eine zweite, unabhängige Quelle sein, sonst würde ein Tippfehler dort sich selbst bestätigen.
const AWIN_AFFID = '3151150'
const AWIN_PREFIX = 'https://www.awin1.com/'
const MAX_JE_ZIEL = 3

const fehler = []
const melde = (text) => fehler.push(text)

const lichtTypen = new Set(furnitureLibrary.filter(f => f.kategorie === 'Licht').map(f => f.name))
const raumKeys = new Set(RAEUME.map(r => r.key))
const ZIEL_GIBT_ES = {
  bauart: (id) => Object.hasOwn(BAUARTEN, id),
  leuchte: (id) => lichtTypen.has(id),
  raum: (id) => raumKeys.has(id),
}

// Händler vollständig?
for (const [key, h] of Object.entries(HAENDLER)) {
  if (!h.name) melde(`Händler ${key}: name fehlt`)
  if (!h.domain) melde(`Händler ${key}: domain fehlt`)
  if (h.netzwerk === 'awin' && !Number.isInteger(h.awinmid)) melde(`Händler ${key}: awinmid fehlt`)
}

const gesehen = new Set()
const jeZiel = new Map()

SHOP_VERWEISE.forEach((v, i) => {
  const wo = `Verweis ${i + 1} (${v.art} ${v.id})`

  // Ziel
  if (!Object.hasOwn(ZIEL_GIBT_ES, v.art)) melde(`${wo}: unbekannte art "${v.art}"`)
  else if (!ZIEL_GIBT_ES[v.art](v.id)) melde(`${wo}: id "${v.id}" gibt es für art "${v.art}" nicht`)

  // Händler und Text
  const h = HAENDLER[v.haendler]
  if (!h) melde(`${wo}: unbekannter Händler "${v.haendler}"`)
  if (typeof v.text !== 'string' || v.text.trim() === '') melde(`${wo}: Text leer`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.geprueftAm || '')) melde(`${wo}: geprueftAm fehlt oder ist kein Datum`)

  // url
  if (typeof v.url !== 'string' || !v.url.startsWith(AWIN_PREFIX)) {
    melde(`${wo}: url beginnt nicht mit ${AWIN_PREFIX}`)
  } else {
    const p = new URL(v.url).searchParams
    if (h?.netzwerk === 'awin' && p.get('awinmid') !== String(h.awinmid)) melde(`${wo}: awinmid ${p.get('awinmid')} passt nicht zu ${v.haendler} (${h.awinmid})`)
    if (p.get('awinaffid') !== AWIN_AFFID) melde(`${wo}: awinaffid ${p.get('awinaffid')} statt ${AWIN_AFFID}`)
    if (p.has('clickref')) melde(`${wo}: clickref nicht erlaubt`)
    const ued = p.get('ued')
    let ziel = null
    try { ziel = new URL(ued) } catch { melde(`${wo}: ued fehlt oder ist keine Adresse`) }
    if (ziel && h) {
      if (ziel.protocol !== 'https:') melde(`${wo}: ued ist nicht https`)
      if (ziel.hostname !== h.domain && !ziel.hostname.endsWith('.' + h.domain)) melde(`${wo}: ued zeigt auf ${ziel.hostname}, nicht auf ${h.domain}`)
    }
  }

  // Doppelte Einträge und Anzahl je Ziel
  const schluessel = `${v.art}|${v.id}|${v.url}`
  if (gesehen.has(schluessel)) melde(`${wo}: doppelt`)
  gesehen.add(schluessel)
  const zielKey = `${v.art} ${v.id}`
  jeZiel.set(zielKey, (jeZiel.get(zielKey) || 0) + 1)
})

for (const [ziel, n] of jeZiel) if (n > MAX_JE_ZIEL) melde(`${ziel}: ${n} Verweise, höchstens ${MAX_JE_ZIEL}`)

// Übersicht
const jeArt = ['leuchte', 'bauart', 'raum'].map(a => `${a}: ${SHOP_VERWEISE.filter(v => v.art === a).length}`)
console.log(`Shop-Verweise geprüft: ${SHOP_VERWEISE.length} (${jeArt.join(', ')})`)
console.log(`Ziele: ${[...jeZiel.entries()].map(([z, n]) => n > 1 ? `${z} (${n})` : z).join(', ')}`)
console.log(`Händler: ${Object.keys(HAENDLER).join(', ')}`)

if (fehler.length) {
  console.error(`\n${fehler.length} Fehler:`)
  fehler.forEach(f => console.error('  - ' + f))
  process.exit(1)
}
console.log('\nAlles in Ordnung.')
