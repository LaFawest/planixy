// Verkleinert/komprimiert die Foto-Texturen unter src/assets/texturen/ (Boden- und
// Wandmaterialien). Diese werden im 3D immer als sich wiederholende Kachel verwendet
// (texture.repeat.set(...) in src/texturen.js) und brauchen deshalb keine volle Foto-Auflösung —
// die Originale kamen mit 2000px+ Kantenlänge direkt von polyhaven/ambientcg. Wiederverwendbar
// für künftig neu hinzugefügte Textur-Fotos, nicht nur ein Einmal-Skript.
//
// Aufruf: node scripts/optimiere-texturen.mjs
import sharp from 'sharp'
import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'

const ORDNER = path.join(process.cwd(), 'src/assets/texturen')
const MAX_KANTE = 1536   // lange Kante in px — reicht für die Wiederholungen in der App locker
const QUALITAET = 78     // JPEG-Qualität, bei einer wiederholten Kachel visuell praktisch nicht vom Original zu unterscheiden

const dateien = (await readdir(ORDNER)).filter(f => f.toLowerCase().endsWith('.jpg'))
let gesamtVorher = 0
let gesamtNachher = 0

for (const datei of dateien) {
  const pfad = path.join(ORDNER, datei)
  const vorherBytes = (await stat(pfad)).size
  const original = await readFile(pfad)
  const puffer = await sharp(original)
    .resize({ width: MAX_KANTE, height: MAX_KANTE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: QUALITAET })
    .toBuffer()
  await writeFile(pfad, puffer)
  const nachherBytes = puffer.length
  gesamtVorher += vorherBytes
  gesamtNachher += nachherBytes
  console.log(`${datei}: ${(vorherBytes / 1024).toFixed(0)} KB -> ${(nachherBytes / 1024).toFixed(0)} KB`)
}

console.log(`\nGesamt: ${(gesamtVorher / 1024 / 1024).toFixed(2)} MB -> ${(gesamtNachher / 1024 / 1024).toFixed(2)} MB`)
