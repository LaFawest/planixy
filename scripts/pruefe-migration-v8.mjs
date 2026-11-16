// Prüfskript für die Umrechnung Schema 7 -> 8 (src/context/migrationV8.js). Läuft außerhalb der
// App. Die Quelldateien importieren ohne Dateiendung (Vite-Stil), deshalb erst bündeln:
//   npx esbuild scripts/pruefe-migration-v8.mjs --bundle --platform=node --outfile=node_modules/.cache/pruefe-v8.cjs
//   node node_modules/.cache/pruefe-v8.cjs
// Prüft je Teil: Lage in 3D vorher (alte Formel mit Streckung) gegen nachher (neue Formel ohne
// Streckung). Nicht bündige Teile dürfen sich in 3D nicht bewegen; bündige rücken an die Wand,
// mit Fußleiste auf FUSSLEISTE_TIEFE_M davor, ohne Fußleiste direkt daran.
import { migriereRaumV7ZuV8 } from '../src/context/migrationV8.js'
import { WAND_DICKE_PX, FUSSLEISTE_TIEFE_M } from '../src/constants.js'
import { rechteckPolygon, raumformPolygon, boundingBox } from '../src/raumPolygon.js'

const W = WAND_DICKE_PX
let fehler = 0
const box2 = (it) => {
  const r = (it.rotation || 0) * Math.PI / 180
  return { b: it.width * Math.abs(Math.cos(r)) + it.height * Math.abs(Math.sin(r)), h: it.width * Math.abs(Math.sin(r)) + it.height * Math.abs(Math.cos(r)) }
}
// 3D-Mitte in Metern relativ zur Raummitte, alte Formel (baueMoebel bis Schema 7).
const alt3D = (it, B, T) => { const { b, h } = box2(it); return { x: -B / 2 + (it.left + b / 2) / (B * 60 - 2 * W) * B, z: -T / 2 + (it.top + h / 2) / (T * 60 - 2 * W) * T } }
// Neue Formel (ab Schema 8): ohne Streckung, Ursprung innere Wandecke.
const neu3D = (it, B, T) => { const { b, h } = box2(it); return { x: -B / 2 + (it.left + b / 2) / 60, z: -T / 2 + (it.top + h / 2) / 60 } }

const pruefe = (titel, raum, erwartet) => {
  const eck = raum.eckpunkte
  const bb = boundingBox(eck)
  const B = bb.breite, T = bb.tiefe
  const neu = migriereRaumV7ZuV8(raum)
  console.log(`\n== ${titel} (${B} × ${T} m, Fußleiste ${raum.fussleiste === false ? 'aus' : 'an'})`)
  raum.furniture.forEach((alt, i) => {
    const n = neu.furniture[i]
    if (alt.istWandElement) {
      console.log(`  ${alt.name.padEnd(16)} Wand ${alt.wandSegment}: left/top ${alt.left}/${alt.top} -> ${n.left.toFixed(1)}/${n.top.toFixed(1)}, wandPosition ${n.wandPosition} (unverändert: ${n.wandPosition === alt.wandPosition})`)
      if (n.wandPosition !== alt.wandPosition || n.bruestungshoehe !== alt.bruestungshoehe) { fehler++; console.log('    FEHLER: wandPosition/bruestungshoehe verändert') }
      return
    }
    const a = alt3D(alt, B, T), b = neu3D(n, B, T)
    const dx = (b.x - a.x) * 100, dz = (b.z - a.z) * 100
    const { b: bw, h: bh } = box2(n)
    // Abstand der neuen Box zu den Wänden eines Rechtecks (in cm), zur Kontrolle.
    const abstand = { nord: n.top / 60 * 100, sued: (T * 60 - n.top - bh) / 60 * 100, west: n.left / 60 * 100, ost: (B * 60 - n.left - bw) / 60 * 100 }
    const naechste = Object.entries(abstand).sort((p, q) => p[1] - q[1])[0]
    console.log(`  ${alt.name.padEnd(16)} ${String(alt.rotation || 0).padStart(3)}°  2D ${alt.left}/${alt.top} -> ${n.left.toFixed(1)}/${n.top.toFixed(1)}  3D verschoben ${dx.toFixed(1)} / ${dz.toFixed(1)} cm  nächste Wand ${naechste[0]} ${naechste[1].toFixed(1)} cm`)
    const e = erwartet[i]
    if (e === 'bleibt' && (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01)) { fehler++; console.log('    FEHLER: sollte in 3D stehen bleiben') }
    if (e && e.wand) {
      const soll = raum.fussleiste === false ? 0 : FUSSLEISTE_TIEFE_M * 100
      if (Math.abs(abstand[e.wand] - soll) > 0.01) { fehler++; console.log(`    FEHLER: Abstand zur ${e.wand}wand ${abstand[e.wand].toFixed(2)} cm, erwartet ${soll} cm`) }
    }
  })
  ;(raum.trennwaende || []).forEach((w, i) => {
    const n = neu.trennwaende[i]
    const ax = -B / 2 + w.x1 / (B * 60 - 2 * W) * B, nx = -B / 2 + n.x1 / 60
    console.log(`  Trennwand ${i}: x1 ${w.x1} -> ${n.x1.toFixed(1)}  3D ${(ax).toFixed(3)} -> ${(nx).toFixed(3)} m`)
    if (Math.abs(ax - nx) > 1e-6) { fehler++; console.log('    FEHLER: Trennwand bewegt sich in 3D') }
  })
}

// Raum 5 × 4 m. Alte Werte so, wie die App sie bis Schema 7 setzt: Innenfläche 284 × 224 px, mit
// Fußleiste Grenze 8..276 / 8..216.
const rechteck = rechteckPolygon(5, 4)
const moebel = (name, left, top, width, height, rotation = 0, extra = {}) => ({ id: name + left + top, name, left, top, width, height, rotation, ...extra })
const fenster = { id: 'f1', name: 'Fenster', istWandElement: true, wandSegment: 0, wandPosition: 2, bruestungshoehe: 0.9, width: 72, height: 10, left: 128, top: -9, rotation: 0 }
const tuerOst = { id: 't1', name: 'Zimmertür', istWandElement: true, wandSegment: 1, wandPosition: 1, width: 54, height: 10, left: 279, top: 60, rotation: 90 }

pruefe('Rechteck, Fußleiste an', { eckpunkte: rechteck, fussleiste: true, furniture: [
  moebel('Kleiderschrank', 97, 8, 90, 50),              // bündig Nord
  moebel('Sideboard', 8, 70, 90, 30, 90),               // bündig West, gedreht
  moebel('Sofa 3-Sitzer', 221, 60, 140, 55, 90),        // bündig Ost, gedreht (276 − 55)
  moebel('Esstisch', 120, 90, 80, 60),                  // frei
  moebel('Kommode', 8, 166, 60, 50),                    // Ecke Südwest: bündig West und Süd (216 − 50)
  moebel('Deckenlampe', 130, 100, 24, 24),              // Mitte, Deckenleuchte
  moebel('Fernseher', 20, 75, 60, 10, 0, { kategorie: 'Elektrogeräte' }),
  fenster, tuerOst,
], trennwaende: [{ x1: 142, y1: 0, x2: 142, y2: 100, dicke: 10 }] }, [
  { wand: 'nord' }, { wand: 'west' }, { wand: 'ost' }, 'bleibt', { wand: 'sued' }, 'bleibt', 'bleibt',
])

pruefe('Rechteck, Fußleiste aus', { eckpunkte: rechteck, fussleiste: false, furniture: [
  moebel('Kleiderschrank', 97, 0, 90, 50),              // bündig Nord (ohne Leiste bei 0)
  moebel('Sofa 3-Sitzer', 229, 60, 140, 55, 90),        // bündig Ost (284 − 55)
  moebel('Esstisch', 120, 90, 80, 60),
], trennwaende: [] }, [{ wand: 'nord' }, { wand: 'ost' }, 'bleibt'])

// L-Form 8 × 6 mit Ausschnitt 3 × 3 (nordost): Möbel an der Innenecken-Wand.
const lform = raumformPolygon({ raumForm: 'l-form', breite: 8, tiefe: 6, aussparungBreite: 3, aussparungTiefe: 3, ausrichtung: 'nordost' })
console.log('\nL-Form Eckpunkte:', JSON.stringify(lform))
pruefe('L-Form nordost', { eckpunkte: lform, fussleiste: true, furniture: [
  moebel('Kleiderschrank', 20, 8, 90, 50),              // bündig Nord im linken Schenkel
  moebel('Esstisch', 150, 250, 80, 60),                 // frei
  moebel('Regal', 186, 60, 90, 40),                     // bündig an der Innenecken-Wand x = 5 m (alt 284 − 8 − 90)
], trennwaende: [] }, [{ wand: 'nord' }, 'bleibt', null])
// Die Innenecken-Wand ist kein Außenrand des Rechtecks, deshalb hier eigens: Box-Rand soll bei
// 5 m − FUSSLEISTE_TIEFE_M liegen.
{
  const raum = { eckpunkte: lform, fussleiste: true, furniture: [moebel('Regal', 186, 60, 90, 40)], trennwaende: [] }
  const n = migriereRaumV7ZuV8(raum).furniture[0]
  const rand = (n.left + 90) / 60
  const soll = 5 - FUSSLEISTE_TIEFE_M
  console.log(`  Regal an der Innenecken-Wand: rechter Rand ${rand.toFixed(3)} m, erwartet ${soll.toFixed(3)} m`)
  if (Math.abs(rand - soll) > 1e-6) { fehler++; console.log('    FEHLER') }
}

console.log(fehler === 0 ? '\nAlles stimmt.' : `\n${fehler} Fehler.`)
// globalThis statt process direkt: ESLint kennt hier nur Browser-Globale.
globalThis.process.exitCode = fehler === 0 ? 0 : 1
