// Prüfskript: Liegt ein Fenster im Grundriss dort, wo 3D es zeigt? Für jede Wand von Rechteck,
// allen L- und allen U-Formen: Element an mehreren Stellen setzen (platziereAufWandSegment), Mitte
// im Grundriss gegen die Mitte in 3D (Rechnung wie scene/wandelemente.js) vergleichen, und am selben
// Mittelpunkt neu einrasten (snappeWandElement) — das muss dieselbe wandPosition ergeben.
// Bündeln und laufen lassen:
//   npx esbuild scripts/pruefe-wandposition.mjs --bundle --platform=node --outfile=node_modules/.cache/pruefe-wandposition.cjs
//   node node_modules/.cache/pruefe-wandposition.cjs
import { platziereAufWandSegment, snappeWandElement, wandSegmente, rechteckPolygon, raumformPolygon, innenKonturen } from '../src/raumPolygon.js'
const W = 8
const raum = (eck) => innenKonturen(eck.map(p => ({ x: p.x * 60, y: p.y * 60 })), 2.4).innenEckpunkte
// 3D-Lage wie scene/wandelemente.js: Mitte = wandPosition + w/2 ab Segmentanfang, entlang der Richtung.
const mitte3D = (segs, it, w) => { const s = segs[it.wandSegment]; const t = (it.wandPosition * 60 + w / 2) / s.laenge; return { x: s.start.x + (s.ende.x - s.start.x) * t, y: s.start.y + (s.ende.y - s.start.y) * t } }
const mitte2D = (it, w, h) => it.rotation === 90 ? { x: it.left + h / 2, y: it.top + w / 2 } : { x: it.left + w / 2, y: it.top + h / 2 }
let fehler = 0
const pruefe = (titel, eck) => {
  const innen = raum(eck); const segs = wandSegmente(innen)
  segs.forEach(s => {
    for (const pos of [0, 0.5, (s.laenge / 60 - 0.72) / 2, s.laenge / 60 - 0.72]) {
      const it = platziereAufWandSegment(s.index, pos, 72, 10, innen, W)
      if (!it) continue
      const a = mitte3D(segs, it, 72), b = mitte2D(it, 72, 10)
      // Entlang der Wand vergleichen (quer liegt 2D in der Wand, 3D auf der Linie).
      const horiz = s.start.y === s.ende.y
      const diff = horiz ? Math.abs(a.x - b.x) : Math.abs(a.y - b.y)
      // Einrasten am selben Mittelpunkt muss dieselbe wandPosition ergeben.
      const neu = snappeWandElement(b.x, b.y, 72, 10, innen, W)
      const dpos = Math.abs(neu.wandPosition - it.wandPosition)
      if (diff > 1e-6 || dpos > 1e-9 || neu.wandSegment !== s.index || Math.abs(it.wandPosition - pos) > 1e-9) { fehler++; console.log(`  FEHLER ${titel} Seg ${s.index} pos ${pos.toFixed(3)}: 2D/3D ${diff.toFixed(2)} px, Snap ${neu.wandSegment}/${neu.wandPosition.toFixed(3)}, gespeichert ${it.wandPosition.toFixed(3)}`) }
    }
  })
  console.log(`${titel}: ${segs.length} Wände geprüft`)
}
pruefe('Rechteck 5x4', rechteckPolygon(5, 4))
for (const a of ['nordost','nordwest','suedost','suedwest']) pruefe('L ' + a, raumformPolygon({ raumForm: 'l-form', breite: 8, tiefe: 6, aussparungBreite: 3, aussparungTiefe: 3, ausrichtung: a }))
for (const a of ['nord','ost','sued','west']) pruefe('U ' + a, raumformPolygon({ raumForm: 'u-form', breite: 8, tiefe: 6, aussparungBreite: 3, aussparungTiefe: 3, ausrichtung: a }))
console.log(fehler ? `${fehler} Fehler` : 'Alles stimmt.')
// globalThis statt process direkt: ESLint kennt hier nur Browser-Globale.
globalThis.process.exitCode = fehler ? 1 : 0
