import * as THREE from 'three'
import wandputzUrl from './assets/texturen/wandputz.jpg'
import bodenParkettUrl from './assets/texturen/boden-parkett.jpg'
import bodenFischgraetUrl from './assets/texturen/boden-fischgraet.jpg'
import bodenLaminatUrl from './assets/texturen/boden-laminat.jpg'
import bodenFliesenUrl from './assets/texturen/boden-fliesen.jpg'
import bodenBetonUrl from './assets/texturen/boden-beton.jpg'
import bodenMarmorUrl from './assets/texturen/boden-marmor.jpg'
import bodenSchieferUrl from './assets/texturen/boden-schiefer.jpg'
import bodenTeppichUrl from './assets/texturen/boden-teppich.jpg'
import bodenSchachbrettUrl from './assets/texturen/boden-schachbrett.jpg'
import bodenKorkUrl from './assets/texturen/boden-kork.jpg'

// Echte Foto-Texturen (CC0, polyhaven.com/ambientcg.com) statt weiterer prozeduraler
// Canvas-Zeichnungen — siehe erzeugeBodenTextur/erzeugeWandputzTextur unten. Geladen wird pro
// Datei nur einmal: fotoTexturCache hält die fertige THREE.Texture über Szenen-Neuaufbauten
// hinweg fest (RoomView3D.jsx baut die Szene bei jeder Room-/Furniture-Änderung komplett neu
// auf). Jede zurückgegebene Textur ist als "persistent" markiert (userData.persistenteTextur) —
// RoomView3D.jsx überspringt sie beim generischen Aufräumen der Szene beim Unmount/Neuaufbau,
// sonst würde das dortige scene.traverse() sie disposen und der nächste Neuaufbau bekäme aus
// dem Cache eine bereits GPU-seitig freigegebene (leere) Textur zurück.
const textureLoader = new THREE.TextureLoader()
const fotoTexturCache = new Map() // URL -> THREE.Texture

function ladeFotoTextur(url) {
  const gecached = fotoTexturCache.get(url)
  if (gecached) return gecached
  const texture = textureLoader.load(url, undefined, undefined, (fehler) => {
    console.error(`Foto-Textur konnte nicht geladen werden: ${url}`, fehler)
  })
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  fotoTexturCache.set(url, texture)
  return texture
}

// App schneller machen, Schritt 3, Teilpunkt 4.1: Die vier parameterlosen prozeduralen Texturen
// (Holz, Stoff, Backstein, Umgebung) werden jetzt nur noch beim ersten Aufruf gezeichnet und
// danach aus einem modulweiten Cache wiederverwendet — dasselbe Muster wie fotoTexturCache oben,
// inklusive userData.persistenteTextur, damit das generische scene.traverse()-Aufräumen in
// RoomView3D.jsx sie beim Szenen-Neuaufbau nicht disposed (sonst käme beim nächsten Aufruf eine
// bereits GPU-seitig freigegebene, leere Textur aus dem Cache zurück).
let holzTexturCache = null

export function erzeugeHolzTextur() {
  if (holzTexturCache) return holzTexturCache
  const groesse = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, groesse, groesse)
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * groesse
    const dunkel = 0.08 + Math.random() * 0.16
    ctx.strokeStyle = `rgba(90,60,25,${dunkel.toFixed(2)})`
    ctx.lineWidth = 0.6 + Math.random() * 1.8
    ctx.beginPath()
    let x = 0
    ctx.moveTo(x, y)
    while (x < groesse) {
      x += 6
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3 + (Math.random() - 0.5) * 1.5)
    }
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  holzTexturCache = texture
  return texture
}

let stoffTexturCache = null

export function erzeugeStoffTextur() {
  if (stoffTexturCache) return stoffTexturCache
  const groesse = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, groesse, groesse)
  const zellen = 24
  const zellGroesse = groesse / zellen
  for (let y = 0; y < zellen; y++) {
    for (let x = 0; x < zellen; x++) {
      const hell = 222 + Math.floor(Math.random() * 30)
      ctx.fillStyle = `rgb(${hell},${hell},${hell})`
      ctx.fillRect(x * zellGroesse, y * zellGroesse, zellGroesse, zellGroesse)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 6)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  stoffTexturCache = texture
  return texture
}

// Bodenbelag -> Datei, siehe bodenBelaege in constants.js. 'boden-standard' bleibt bewusst ohne
// Foto (schlichter neutraler Boden, dafür lohnt sich keine eigene Aufnahme) und läuft über den
// Canvas-Fallback unten, ebenso jeder unbekannte/zukünftige Typ.
const BODEN_TEXTUR_URLS = {
  'boden-parkett': bodenParkettUrl,
  'boden-fischgraet': bodenFischgraetUrl,
  'boden-laminat': bodenLaminatUrl,
  'boden-fliesen': bodenFliesenUrl,
  'boden-beton': bodenBetonUrl,
  'boden-marmor': bodenMarmorUrl,
  'boden-schiefer': bodenSchieferUrl,
  'boden-teppich': bodenTeppichUrl,
  'boden-schachbrett': bodenSchachbrettUrl,
  'boden-kork': bodenKorkUrl,
}

function erzeugeStandardBodenTextur(breiteM, tiefeM) {
  const groesse = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = getBodenFarbe('boden-standard')
  ctx.fillRect(0, 0, groesse, groesse)
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * groesse, y = Math.random() * groesse
    ctx.fillStyle = `rgba(0,0,0,${(Math.random() * 0.02).toFixed(2)})`
    ctx.fillRect(x, y, 2, 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(Math.max(1, Math.round(breiteM)), Math.max(1, Math.round(tiefeM)))
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function erzeugeBodenTextur(bodenTyp, breiteM, tiefeM) {
  const url = BODEN_TEXTUR_URLS[bodenTyp]
  if (!url) return erzeugeStandardBodenTextur(breiteM, tiefeM)
  const texture = ladeFotoTextur(url)
  // Kein manuelles needsUpdate hier: repeat/wrapS/wrapT sind Sampler-Uniforms, die bei jedem
  // Frame neu gelesen werden, keine Pixeldaten — ein needsUpdate direkt nach dem (asynchronen)
  // textureLoader.load() würde einen Upload-Versuch auslösen, bevor das Bild überhaupt geladen
  // ist ("Texture marked for update but no image data found"-Warnung). TextureLoader setzt
  // needsUpdate selbst, sobald das Bild tatsächlich da ist.
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(Math.max(1, Math.round(breiteM)), Math.max(1, Math.round(tiefeM)))
  return texture
}

// Putzstruktur für alle Wände — RoomView3D.jsx multipliziert diese Textur mit der jeweiligen
// Wandfarbe (MeshStandardMaterial color × map), der bestehende 27-Farben-Picker bleibt dadurch
// unangetastet. Feste Wiederholung statt einer pro Wandlänge berechneten: alle Wandsegmente
// einer Szene teilen sich dieselbe gecachte Textur-Instanz (siehe ladeFotoTextur), ein pro Wand
// unterschiedliches repeat würde sich gegenseitig überschreiben, weil sie am selben THREE.Texture-
// Objekt hängen.
export function erzeugeWandputzTextur() {
  const texture = ladeFotoTextur(wandputzUrl)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 2)
  return texture
}

// ---------------------------------------------------------------------------
// Tapetenmuster (Wandmaterial v2, Schritt 3)
//
// Nachgezeichnet nach dem, was in den Märkten tatsächlich im Regal liegt (Bauhaus, Hornbach,
// Toom): schmale Streifen, Blockstreifen, gestreute Kreise, Rautengitter, Streublümchen.
// Alle auf 53 cm Rapport — so breit ist eine Tapetenbahn, und weil das Muster an der Bahnkante
// aufgehen muss, ist der Rapport genau diese Breite (siehe WAND_MUSTER_GROESSE weiter unten).
// ---------------------------------------------------------------------------

// Deterministischer Zufall (linearer Kongruenzgenerator, Numerical Recipes). Math.random() hätte
// die Muster bei jedem Neuladen neu gewürfelt — dieselbe gespeicherte Wand sähe nach einem Reload
// anders aus, die Blüten säßen woanders. Für einen Raumplaner ist das inakzeptabel: Geplant ist
// geplant. Derselbe Startwert liefert dieselbe Folge, das Muster wirkt unregelmäßig und ist
// trotzdem jedes Mal identisch. Math.imul, weil die Multiplikation sonst die 53-Bit-Grenze von
// JavaScript-Zahlen überschreitet und die unteren Bits verloren gingen.
function zufallsfolge(startwert) {
  let zustand = startwert >>> 0
  return () => {
    zustand = (Math.imul(zustand, 1664525) + 1013904223) >>> 0
    return zustand / 4294967296
  }
}

// Papiergrund mit feiner Körnung. Ohne sie wirken die Flächen wie Farbfelder, nicht wie Papier —
// das war der Hauptmangel der alten Streifentapete.
function zeichnePapiergrund(ctx, groesse, farbe, zufall) {
  ctx.fillStyle = farbe
  ctx.fillRect(0, 0, groesse, groesse)
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = `rgba(92,76,56,${(0.015 + zufall() * 0.030).toFixed(3)})`
    ctx.fillRect(zufall() * groesse, zufall() * groesse, 1.4, 1.4)
  }
}

// Zeichnet ein gestreutes Element so, dass es über den Kachelrand hinaus auf der Gegenseite
// weiterläuft. Ohne das zeigt jede gekachelte Wand ein Gitter aus Kanten, weil an jeder Naht
// halbe Blüten abgeschnitten sind. Bis zu neun Aufrufe je Element — die acht Nachbarpositionen
// plus die eigene —, alles außerhalb wird sofort verworfen.
//
// ACHTUNG beim Schreiben neuer Muster: In `malen` darf NICHT gewürfelt werden. Die Funktion
// läuft für dasselbe Element mehrfach, und jeder Aufruf bekäme andere Zufallswerte — dasselbe
// Blatt hätte links der Naht eine andere Form als rechts, derselbe Ziegel eine andere Farbe.
// Alles Zufällige vorher ausrechnen und als fertigen Wert in `malen` hineinreichen (siehe
// `radien` bei zeichneTerrazzo und `lagen` bei zeichneAquarellBlaetter). Der Fehler fällt
// nicht beim Zeichnen auf, sondern erst als Naht auf einer langen Wand.
//
// Dieselbe Regel gilt für jedes Muster, das die Kachelgrenze auf eigene Faust überbrückt, auch
// ohne diese Funktion: zeichneZiegel setzt die Randsteine mit einer eigenen Schleife von -1 bis
// spalten fort, und derselbe Stein kommt darin zweimal vor. Deshalb liegen Farbe und Sprenkel
// dort je Spalte vorab in `steine`.
function gekachelt(groesse, x, y, radius, malen) {
  for (const dx of [-groesse, 0, groesse]) {
    for (const dy of [-groesse, 0, groesse]) {
      const px = x + dx, py = y + dy
      if (px < -radius || px > groesse + radius || py < -radius || py > groesse + radius) continue
      malen(px, py)
    }
  }
}

// Gemeinsamer Papierton aller Muster. Absichtlich nicht reinweiß: Tapetenpapier ist cremefarben,
// und ein weißer Grund neben einer weiß gestrichenen Wand sähe kalt aus.
const TAPETEN_PAPIER = '#F4EFE4'

// 1. Streifen schmal — 10 Bahnen à 5,3 cm.
function zeichneStreifenSchmal(ctx, g) {
  const z = zufallsfolge(11011)
  zeichnePapiergrund(ctx, g, TAPETEN_PAPIER, z)
  const anzahl = 10, breite = g / anzahl
  for (let i = 0; i < anzahl; i += 2) {
    ctx.fillStyle = 'rgba(190,170,136,0.50)'
    ctx.fillRect(i * breite, 0, breite, g)
  }
}

// 2. Blockstreifen — 4 Bahnen à 13,25 cm, zwei Töne.
function zeichneBlockstreifen(ctx, g) {
  const z = zufallsfolge(22022)
  zeichnePapiergrund(ctx, g, TAPETEN_PAPIER, z)
  const anzahl = 4, breite = g / anzahl
  for (let i = 0; i < anzahl; i += 2) {
    ctx.fillStyle = 'rgba(126,148,126,0.42)'
    ctx.fillRect(i * breite, 0, breite, g)
  }
}

// 3. Kreise — gestreute Ringe im Versatzraster, 4 x 4 je Kachel (rund 13 cm Abstand). Teils
// gefüllt, teils nur umrandet, mit leichtem Versatz: ein exaktes Raster sähe gedruckt aus.
function zeichneKreise(ctx, g) {
  const z = zufallsfolge(33033)
  zeichnePapiergrund(ctx, g, TAPETEN_PAPIER, z)
  const raster = 4, zelle = g / raster
  for (let y = 0; y < raster; y++) {
    for (let x = 0; x < raster; x++) {
      const versatz = (y % 2) * (zelle / 2)
      const cx = x * zelle + versatz + zelle / 2 + (z() - 0.5) * 10
      const cy = y * zelle + zelle / 2 + (z() - 0.5) * 10
      // Einheitliche Größe und ein fester Wechsel zwischen gefüllt und umrandet statt Zufall:
      // Mit zufälliger Größe und Füllung klumpten sich die gefüllten Kreise in manchen Zeilen,
      // und weil sich die Kachel alle 53 cm wiederholt, wurde daraus auf der Wand ein sichtbares
      // Streifenmuster. Der Versatz der Position bleibt zufällig — der sorgt weiter dafür, dass
      // es nicht gedruckt-regelmäßig aussieht.
      const radius = zelle * 0.27
      const gefuellt = (x + y) % 2 === 0
      gekachelt(g, cx, cy, radius + 4, (px, py) => {
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        if (gefuellt) {
          ctx.fillStyle = 'rgba(198,132,102,0.34)'
          ctx.fill()
        } else {
          ctx.strokeStyle = 'rgba(160,104,78,0.62)'
          ctx.lineWidth = 2.6
          ctx.stroke()
        }
      })
    }
  }
}

// 4. Rauten — Gitter aus Diagonalen, 2 Rauten je Bahnbreite (rund 26 cm je Raute). Die Diagonalen
// laufen bewusst über den Kachelrand hinaus (-teilung bis teilung*2), sonst blieben die Ecken leer.
function zeichneRauten(ctx, g) {
  const z = zufallsfolge(44044)
  zeichnePapiergrund(ctx, g, TAPETEN_PAPIER, z)
  // 2 statt 4 Rauten je Bahnbreite, also rund 26 cm je Raute. Mit 13 cm lagen auf einer Wand von
  // vier Metern dreißig Rauten nebeneinander — das sah aus wie Millimeterpapier. Die dickere
  // Linie gehört dazu: Ein größeres Feld braucht einen kräftigeren Rand, sonst wirkt das Gitter
  // dünn und zufällig.
  const teilung = 2, abstand = g / teilung
  ctx.strokeStyle = 'rgba(122,120,110,0.60)'
  ctx.lineWidth = 3.4
  for (let i = -teilung; i <= teilung * 2; i++) {
    ctx.beginPath()
    ctx.moveTo(i * abstand, 0)
    ctx.lineTo(i * abstand + g, g)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(i * abstand, 0)
    ctx.lineTo(i * abstand - g, g)
    ctx.stroke()
  }
  for (let y = 0; y < teilung; y++) {
    for (let x = 0; x < teilung; x++) {
      // Rautenmitte statt Kreuzung: Die beiden Diagonalenscharen schneiden sich bei
      // (abstand/2, abstand/2) — genau dort saß der Punkt vorher und verschwand unter der
      // Linie, die ohnehin dort liegt. Die Mitte einer Raute liegt eine halbe Zelle darüber,
      // bei (abstand/2, 0).
      //
      // Und deutlich größer: rund 2 cm Durchmesser auf der Wand. Mit den vorherigen 4 Pixeln
      // war der Punkt auf einer vier Meter langen Wand nicht zu sehen — eine Variante ganz
      // ohne Punkte sah identisch aus. Jetzt ist es ein Motiv in jeder zweiten Raute.
      //
      // Jede zweite Raute heißt: in JEDER Zelle genau diese eine Mitte. Eine Kachel enthält acht
      // Rauten (Kachel 2a x 2a, Raute a²/2), das ergibt vier Punkte. Mit (x + y) % 2 gefiltert
      // waren es nur zwei, also jede vierte Raute. Die andere Mitte derselben Zelle,
      // (0, abstand/2), gehört zur Nachbarraute mit gemeinsamer Kante — beide zu setzen hätte
      // Punkte direkt nebeneinander ergeben statt eines Schachbretts. Nummeriert man die Rauten
      // nach i = floor((x - y) / a) und j = floor((x + y) / a), haben alle Punkte hier eine
      // gerade Summe i + j, und Nachbarn mit gemeinsamer Kante unterscheiden sich immer in genau
      // einem Index — das ist das Schachbrett, auch über die Kachelgrenzen hinweg.
      const cx = x * abstand + abstand / 2, cy = y * abstand
      gekachelt(g, cx, cy, 13, (px, py) => {
        ctx.beginPath()
        ctx.arc(px, py, 10, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(122,120,110,0.55)'
        ctx.fill()
      })
    }
  }
}

// 5. Blumenmotiv — Streublümchen im Versatzraster, 5 x 5 je Kachel (rund 10,6 cm Abstand).
// Ein Blatt am Stiel statt zwei abstehender: mit zwei Blättern sah die Blüte aus wie ein Insekt.
function zeichneBlumen(ctx, g) {
  const z = zufallsfolge(55055)
  zeichnePapiergrund(ctx, g, TAPETEN_PAPIER, z)
  const raster = 5, zelle = g / raster
  for (let y = 0; y < raster; y++) {
    for (let x = 0; x < raster; x++) {
      const versatz = (y % 2) * (zelle / 2)
      const cx = x * zelle + versatz + zelle / 2 + (z() - 0.5) * 10
      const cy = y * zelle + zelle / 2 + (z() - 0.5) * 10
      const radius = zelle * 0.28
      const drehung = z() * Math.PI
      gekachelt(g, cx, cy, radius * 2, (px, py) => {
        ctx.fillStyle = 'rgba(116,142,88,0.50)'
        ctx.beginPath()
        ctx.ellipse(px + Math.cos(drehung + 1.9) * radius * 1.05,
                    py + Math.sin(drehung + 1.9) * radius * 1.05,
                    radius * 0.40, radius * 0.20, drehung + 1.9, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(200,132,102,0.62)'
        for (let p = 0; p < 5; p++) {
          const winkel = drehung + (p / 5) * Math.PI * 2
          ctx.beginPath()
          ctx.ellipse(px + Math.cos(winkel) * radius * 0.52,
                      py + Math.sin(winkel) * radius * 0.52,
                      radius * 0.44, radius * 0.38, winkel, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(px, py, radius * 0.26, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(190,150,60,0.90)'
        ctx.fill()
      })
    }
  }
}

// 6. Aquarell-Blätter — weiche, lasierte Blattformen wie bei den Aquarell-Tapeten im Handel.
// Jedes Blatt besteht aus fünf übereinanderliegenden, sehr durchsichtigen Ellipsen mit leichtem
// Versatz; erst die Überlagerung ergibt den wolkigen Rand, den eine einzelne Ellipse nie hätte.
// Fünf Farbtöne statt einem: Aquarell lebt davon, dass kein Blatt aussieht wie das nächste.
function zeichneAquarellBlaetter(ctx, g) {
  const z = zufallsfolge(66066)
  zeichnePapiergrund(ctx, g, TAPETEN_PAPIER, z)
  const raster = 2, zelle = g / raster
  const toene = ['rgba(122,152,118,0.13)', 'rgba(150,172,132,0.12)', 'rgba(104,138,126,0.12)',
                 'rgba(168,150,110,0.11)', 'rgba(96,126,140,0.11)']
  for (let y = 0; y < raster * 2; y++) {
    for (let x = 0; x < raster; x++) {
      const versatz = (y % 2) * (zelle / 2)
      const cx = x * zelle + versatz + zelle / 2 + (z() - 0.5) * 30
      const cy = y * (zelle / 2) + zelle / 4 + (z() - 0.5) * 20
      const laenge = zelle * (0.34 + z() * 0.20)
      const drehung = z() * Math.PI * 2
      const ton = toene[Math.floor(z() * toene.length)]
      // Versatz der fünf Lagen vorher auswürfeln, nicht erst beim Zeichnen — dieselbe Regel wie
      // bei den Eckradien des Terrazzo: gekachelt() malt das Blatt bis zu neunmal, und jede Kopie
      // muss exakt gleich aussehen, sonst passt an der Kachelgrenze links nicht zu rechts.
      const lagen = []
      for (let lage = 0; lage < 5; lage++) {
        lagen.push([(z() - 0.5) * laenge * 0.34, (z() - 0.5) * laenge * 0.34])
      }
      gekachelt(g, cx, cy, laenge * 1.6, (px, py) => {
        ctx.fillStyle = ton
        for (const [dx, dy] of lagen) {
          const vx = px + dx
          const vy = py + dy
          ctx.beginPath()
          ctx.ellipse(vx, vy, laenge, laenge * 0.40, drehung, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.strokeStyle = 'rgba(88,118,86,0.22)'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(px - Math.cos(drehung) * laenge * 0.9, py - Math.sin(drehung) * laenge * 0.9)
        ctx.lineTo(px + Math.cos(drehung) * laenge * 0.9, py + Math.sin(drehung) * laenge * 0.9)
        ctx.stroke()
      })
    }
  }
}

// 7. Dschungel — große Palmwedel, satte Grüntöne, dicht gestellt. Ein Wedel entsteht aus einem
// Mittelstiel und elf paarweise ansetzenden Fiedern, die zu den Enden hin kürzer werden.
function zeichneDschungel(ctx, g) {
  const z = zufallsfolge(77077)
  zeichnePapiergrund(ctx, g, '#EFE9DC', z)
  const raster = 2, zelle = g / raster
  const toene = ['rgba(62,104,66,0.82)', 'rgba(94,134,78,0.78)', 'rgba(44,84,68,0.80)']
  for (let y = 0; y < raster * 2; y++) {
    for (let x = 0; x < raster; x++) {
      const versatz = (y % 2) * (zelle / 2)
      const cx = x * zelle + versatz + zelle / 2 + (z() - 0.5) * 40
      const cy = y * (zelle / 2) + zelle / 4 + (z() - 0.5) * 30
      const laenge = zelle * (0.56 + z() * 0.18)
      const drehung = z() * Math.PI * 2
      const ton = toene[Math.floor(z() * toene.length)]
      gekachelt(g, cx, cy, laenge * 1.3, (px, py) => {
        const ax = Math.cos(drehung), ay = Math.sin(drehung)
        ctx.strokeStyle = ton
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(px - ax * laenge, py - ay * laenge)
        ctx.lineTo(px + ax * laenge, py + ay * laenge)
        ctx.stroke()
        ctx.fillStyle = ton
        const fiedern = 11
        for (let i = 0; i < fiedern; i++) {
          const t = -0.85 + (i / (fiedern - 1)) * 1.7
          const bx = px + ax * laenge * t
          const by = py + ay * laenge * t
          const spanne = laenge * 0.46 * (1 - Math.abs(t) * 0.55)
          for (const seite of [-1, 1]) {
            const winkel = drehung + seite * 1.05
            ctx.beginPath()
            ctx.ellipse(bx + Math.cos(winkel) * spanne * 0.5,
                        by + Math.sin(winkel) * spanne * 0.5,
                        spanne * 0.5, spanne * 0.16, winkel, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      })
    }
  }
}

// 8. Betonoptik — grauer Grund mit feiner Wolkigkeit und Poren, ohne erkennbares Motiv.
//
// Bewusst kleinteilig, und das ist der Kern dieses Musters: Eine Fläche ohne Motiv verrät ihre
// Wiederholung am stärksten. Sobald etwas Großes darin vorkommt, sieht man auf der Wand alle
// 53 cm dasselbe Gebilde. Eine Zwischenfassung mit großflächiger Helligkeitsschwankung sah in
// der Kachel besser aus und auf einer vier Meter langen Wand deutlich schlechter — die Wolken
// haben das Kachelraster sichtbar gemacht. Deshalb hier nur viele kleine Flecken, dazu dichte
// Körnung und ein paar helle Striche.
//
// Die Flecken sind Farbverläufe, keine Kreise: Ein Betonfleck hat keinen Rand.
function zeichneBeton(ctx, g) {
  const z = zufallsfolge(88088)
  ctx.fillStyle = '#CFCBC4'
  ctx.fillRect(0, 0, g, g)
  for (let i = 0; i < 260; i++) {
    const cx = z() * g, cy = z() * g
    const radius = g * (0.02 + z() * 0.07)
    const dunkel = z() > 0.5
    gekachelt(g, cx, cy, radius, (px, py) => {
      const verlauf = ctx.createRadialGradient(px, py, 0, px, py, radius)
      verlauf.addColorStop(0, dunkel ? 'rgba(120,116,110,0.13)' : 'rgba(234,231,225,0.15)')
      verlauf.addColorStop(1, 'rgba(207,203,196,0)')
      ctx.fillStyle = verlauf
      ctx.beginPath()
      ctx.arc(px, py, radius, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(70,68,64,${(0.03 + z() * 0.09).toFixed(3)})`
    ctx.fillRect(z() * g, z() * g, 1.4, 1.4)
  }
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = `rgba(248,246,242,${(0.05 + z() * 0.10).toFixed(3)})`
    ctx.fillRect(z() * g, z() * g, 2.2, 1.2)
  }
}

// 9. Ziegelmauer — Läuferverband. 2 Steine je Bahnbreite und 6 Schichten je Kachel ergeben
// 24,5 cm Breite und 7,8 cm Höhe je Stein plus 1 cm Fuge — nah am Normalformat aus dem
// Baustoffhandel. Die Schichtzahl muss gerade sein, sonst geht der halbe Versatz an der
// Kachelgrenze nicht auf und die Mauer bekäme dort eine durchgehende senkrechte Fuge.
//
// Nicht zu verwechseln mit erzeugeBacksteinTextur weiter unten: Das ist die Einfassung des
// Rundbogen-Durchgangs, also echtes Mauerwerk. Hier geht es um Steinoptik-Tapete.
//
// Die Schleife läuft von -1 bis spalten, damit der versetzte Stein am linken Rand nicht fehlt.
// Dabei ist in den versetzten Schichten derselbe Stein zweimal angeschnitten zu sehen: sein
// rechtes Stück am rechten Rand (i = 1) und sein linkes Stück am linken Rand (i = -1). Beide
// müssen denselben Ton und dieselben Poren haben, sonst wechselt der Stein an der Kachelgrenze
// mitten im Stein die Farbe — alle 53 cm eine sichtbare Naht. Deshalb wird je Schicht einmal
// pro Spalte gewürfelt, und i wird beim Zeichnen auf seine Spalte zurückgerechnet.
function zeichneZiegel(ctx, g) {
  const z = zufallsfolge(99099)
  ctx.fillStyle = '#B9AFA4'
  ctx.fillRect(0, 0, g, g)
  const spalten = 2, schichten = 6
  const breite = g / spalten, hoehe = g / schichten
  const fuge = g * (0.01 / 0.53)
  const toene = [[176, 96, 74], [158, 84, 66], [190, 112, 86], [166, 92, 78], [148, 78, 62]]
  for (let s = 0; s < schichten; s++) {
    const versatz = (s % 2) * (breite / 2)
    const steine = []
    for (let i = 0; i < spalten; i++) {
      const [r, gr, b] = toene[Math.floor(z() * toene.length)]
      const abweichung = Math.floor((z() - 0.5) * 16)
      const poren = []
      for (let p = 0; p < 26; p++) poren.push([z(), z(), (0.03 + z() * 0.07).toFixed(3)])
      steine.push({ farbe: `rgb(${r + abweichung},${gr + abweichung},${b + abweichung})`, poren })
    }
    for (let i = -1; i <= spalten; i++) {
      const stein = steine[((i % spalten) + spalten) % spalten]
      const x = i * breite + versatz
      const y = s * hoehe
      ctx.fillStyle = stein.farbe
      ctx.fillRect(x + fuge / 2, y + fuge / 2, breite - fuge, hoehe - fuge)
      for (const [px, py, deckkraft] of stein.poren) {
        ctx.fillStyle = `rgba(60,34,26,${deckkraft})`
        ctx.fillRect(x + fuge + px * (breite - fuge * 2), y + fuge + py * (hoehe - fuge * 2), 2, 2)
      }
    }
  }
}

// 10. Terrazzo — Splitter in sechs Farben auf hellem Grund. Unregelmäßige Vielecke mit
// schwankenden Eckradien, keine Kreise: runde Flecken sähen nach Konfetti aus, Terrazzo besteht
// aus gebrochenem Stein.
function zeichneTerrazzo(ctx, g) {
  const z = zufallsfolge(10110)
  ctx.fillStyle = '#EFEBE3'
  ctx.fillRect(0, 0, g, g)
  const toene = [
    'rgba(180,104,86,0.70)', 'rgba(96,120,102,0.70)', 'rgba(70,70,68,0.62)',
    'rgba(206,186,140,0.70)', 'rgba(150,150,146,0.60)', 'rgba(122,138,158,0.60)',
  ]
  for (let i = 0; i < 300; i++) {
    const cx = z() * g, cy = z() * g
    const groesse = g * (0.018 + z() * 0.040)
    const ecken = 5 + Math.floor(z() * 3)
    const drehung = z() * Math.PI * 2
    const ton = toene[Math.floor(z() * toene.length)]
    // Die Eckradien vorher ausrechnen, nicht erst beim Zeichnen: gekachelt() malt denselben
    // Splitter bis zu neunmal, und mit Zufallswerten im Zeichnen sähe jede Kopie anders aus —
    // an der Kachelgrenze wäre dann links ein anderer Stein als rechts.
    const radien = []
    for (let e = 0; e < ecken; e++) radien.push(groesse * (0.6 + z() * 0.7))
    gekachelt(g, cx, cy, groesse * 1.5, (px, py) => {
      ctx.fillStyle = ton
      ctx.beginPath()
      for (let e = 0; e < ecken; e++) {
        const winkel = drehung + (e / ecken) * Math.PI * 2
        const rx = px + Math.cos(winkel) * radien[e]
        const ry = py + Math.sin(winkel) * radien[e]
        if (e === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry)
      }
      ctx.closePath()
      ctx.fill()
    })
  }
}

// Zeichner-Tabelle statt zehn fast gleicher Funktionen mit je eigenem Cache — dasselbe Muster wie
// bei erzeugeRaufaserTextur(koernung) weiter unten.
const TAPETEN_ZEICHNER = {
  'streifen-schmal': zeichneStreifenSchmal,
  'streifen-block':  zeichneBlockstreifen,
  'kreise':          zeichneKreise,
  'rauten':          zeichneRauten,
  'blumen':          zeichneBlumen,
  'aquarell':        zeichneAquarellBlaetter,
  'dschungel':       zeichneDschungel,
  'beton':           zeichneBeton,
  'ziegel':          zeichneZiegel,
  'terrazzo':        zeichneTerrazzo,
}

// Cache je Muster, wie bei allen anderen Texturen hier: beim ersten Aufruf gezeichnet, danach
// wiederverwendet, als persistenteTextur markiert, damit das Aufräumen in RoomView3D.jsx sie nicht
// entsorgt. 512 Pixel je Kachel für 53 cm — fein genug für die Blütenblätter, klein genug, dass
// zehn Muster zusammen die Grafikkarte nicht belasten.
const tapetenCache = {}

export function erzeugeTapete(muster) {
  if (tapetenCache[muster]) return tapetenCache[muster]
  const zeichner = TAPETEN_ZEICHNER[muster] || zeichneStreifenSchmal
  const groesse = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  zeichner(canvas.getContext('2d'), groesse)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  // Nur ein Rückfallwert: Die tatsächliche Wiederholung rechnet erzeugeWandTexturFuerFlaeche aus
  // der realen Wandgröße aus, weil jede Tapete in WAND_MUSTER_GROESSE steht.
  texture.repeat.set(1, 1)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  tapetenCache[muster] = texture
  return texture
}

// ---------------------------------------------------------------------------
// Wandpaneele (Wandmaterial v2, Schritt 4)
//
// Zwei Bauarten, jede in mehreren Ausführungen: Profilholz aus senkrechten Brettern und
// Akustikpaneele aus Lamellen auf Filz. Die Farben stecken in den Tabellen weiter unten, der
// Zeichner kennt nur die Form.
//
// Die Maserung läuft LÄNGS des Bretts, also senkrecht. Bisher lief sie quer — ein Brett, dessen
// Maserung quer läuft, gibt es nicht.
// ---------------------------------------------------------------------------

// Profilholz: acht Bretter à 9,6 cm je Kachel, Nut-und-Feder-Fuge dazwischen.
//
// Acht und nicht vier: Jedes Brett bekommt eine leicht andere Helligkeit, und bei vier Brettern
// je Kachel sah man auf der Wand die Wiederholung dieser vier deutlich. Die Kachel ist dafür
// 0,768 m breit statt 0,384 m (siehe WAND_MUSTER_GROESSE), die Bretter bleiben gleich breit.
//
// farben: { grund, maserung, fuge, kante }. In `maserung` steht ALPHA als Platzhalter, weil jede
// Linie ihre eigene Deckkraft bekommt.
function zeichneProfilholz(ctx, g, farben, startwert) {
  const z = zufallsfolge(startwert)
  ctx.fillStyle = farben.grund
  ctx.fillRect(0, 0, g, g)
  const bretter = 8, breite = g / bretter

  for (let b = 0; b < bretter; b++) {
    const x0 = b * breite
    // Jedes Brett etwas anders hell — echtes Profilholz ist nie einheitlich.
    const helligkeit = (z() - 0.5) * 0.10
    ctx.fillStyle = `rgba(${helligkeit > 0 ? '255,255,255' : '0,0,0'},${Math.abs(helligkeit).toFixed(3)})`
    ctx.fillRect(x0, 0, breite, g)

    for (let i = 0; i < 16; i++) {
      const x = x0 + 3 + z() * (breite - 6)
      const staerke = 0.06 + z() * 0.16
      ctx.strokeStyle = farben.maserung.replace('ALPHA', staerke.toFixed(2))
      ctx.lineWidth = 0.5 + z() * 1.4
      // Die Welle muss über die Kachelhöhe periodisch sein, sonst hat die Maserlinie oben einen
      // anderen seitlichen Versatz als unten und springt an jeder Naht. Drei volle Perioden je
      // Kachel: Bei y = 0 und y = g ist der Sinus damit gleich.
      //
      // Deshalb beginnt die Linie auch schon MIT dem Versatz: moveTo(x, 0) ohne Sinus hätte oben
      // bei x angefangen und unten bei x + sin(phase) · 2,2 aufgehört — derselbe Sprung, nur
      // über den Startpunkt eingeschleppt.
      const phase = z() * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(x + Math.sin(phase) * 2.2, 0)
      let y = 0
      while (y <= g) {
        y += 8
        ctx.lineTo(x + Math.sin((y / g) * Math.PI * 6 + phase) * 2.2, y)
      }
      ctx.stroke()
    }
    // Astansatz auf etwa jedem zweiten Brett. Über gekachelt(), weil ay überall in der Höhe
    // liegen kann: Ein Ast nah am oberen Rand muss unten weiterlaufen, sonst ist er an der Naht
    // halb abgeschnitten.
    if (z() > 0.55) {
      const ax = x0 + breite * (0.3 + z() * 0.4), ay = z() * g
      gekachelt(g, ax, ay, 12, (px, py) => {
        ctx.strokeStyle = farben.maserung.replace('ALPHA', '0.30')
        ctx.lineWidth = 1.2
        for (let r = 3; r < 11; r += 2.5) {
          ctx.beginPath()
          ctx.ellipse(px, py, r * 0.55, r, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
      })
    }
  }

  // Nut-und-Feder-Fuge: dunkler Schatten plus heller Grat daneben. Das ist das, was man an einer
  // Profilholzwand tatsächlich sieht — nicht eine Linie, sondern eine Kante mit Licht und
  // Schatten. Die Schleife läuft bis einschließlich `bretter`, damit auch die Fuge am rechten
  // Kachelrand gezeichnet wird; sie trifft dort auf die der nächsten Kachel.
  for (let b = 0; b <= bretter; b++) {
    const x = b * breite
    ctx.fillStyle = farben.fuge
    ctx.fillRect(x - 2.4, 0, 4.8, g)
    ctx.fillStyle = farben.kante
    ctx.fillRect(x + 2.4, 0, 1.6, g)
  }
}

// Akustikpaneele: 12 Lamellen auf Filz, Lamellenbreite 70 % der Teilung.
//
// Die Kachel ist 0,60 m breit und 2,40 m hoch, das Bild wird beim Auflegen also senkrecht
// gestreckt. Deshalb hier nur zwei Wellenperioden statt drei: gestreckt würden mehr unruhig.
//
// farben: { filz, lamelle, maserung, kante }
function zeichneAkustik(ctx, g, farben, startwert) {
  const z = zufallsfolge(startwert)
  ctx.fillStyle = farben.filz
  ctx.fillRect(0, 0, g, g)
  const lamellen = 12, teilung = g / lamellen, breite = teilung * 0.70

  for (let i = 0; i < lamellen; i++) {
    const x = i * teilung
    ctx.fillStyle = farben.lamelle
    ctx.fillRect(x, 0, breite, g)
    const helligkeit = (z() - 0.5) * 0.08
    ctx.fillStyle = `rgba(${helligkeit > 0 ? '255,255,255' : '0,0,0'},${Math.abs(helligkeit).toFixed(3)})`
    ctx.fillRect(x, 0, breite, g)
    for (let m = 0; m < 10; m++) {
      const mx = x + 2 + z() * (breite - 4)
      ctx.strokeStyle = farben.maserung.replace('ALPHA', (0.05 + z() * 0.12).toFixed(2))
      ctx.lineWidth = 0.6 + z() * 1.0
      // Startpunkt mit Versatz, aus demselben Grund wie beim Profilholz oben.
      const phase = z() * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(mx + Math.sin(phase) * 1.4, 0)
      let y = 0
      while (y <= g) {
        y += 14
        ctx.lineTo(mx + Math.sin((y / g) * Math.PI * 4 + phase) * 1.4, y)
      }
      ctx.stroke()
    }
    // Kantenlicht links, Schatten rechts: Die Lamelle steht vor dem Filz, und genau diese
    // Plastizität macht den Unterschied zu aufgemalten Streifen.
    ctx.fillStyle = farben.kante
    ctx.fillRect(x, 0, 1.4, g)
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(x + breite - 1.4, 0, 1.4, g)
  }
}

// Die Ausführungen. startwert legt das Zufallsmuster fest — feste Werte, damit jede Ausführung
// anders aussieht und jede einzelne nach jedem Neuladen gleich.
const HOLZ_AUSFUEHRUNGEN = {
  'eiche':        { startwert: 1137, grund: '#B8956A', maserung: 'rgba(80,52,22,ALPHA)',    fuge: 'rgba(50,32,14,0.42)',   kante: 'rgba(255,245,225,0.20)' },
  'fichte':       { startwert: 1274, grund: '#DFC79C', maserung: 'rgba(146,104,52,ALPHA)',  fuge: 'rgba(120,88,44,0.36)',  kante: 'rgba(255,250,235,0.26)' },
  'fichte-weiss': { startwert: 1411, grund: '#EFEAE1', maserung: 'rgba(150,140,124,ALPHA)', fuge: 'rgba(136,128,116,0.30)', kante: 'rgba(255,255,255,0.40)' },
}

// Der Filz ist bei den hellen Ausführungen bewusst nicht schwarz, sondern mittelgrau: Ein weißes
// Paneel mit schwarzen Fugen gibt es so nicht, dort ist auch der Filz hell.
const AKUSTIK_AUSFUEHRUNGEN = {
  'eiche':        { startwert: 1548, filz: '#2C2622', lamelle: '#B8956A', maserung: 'rgba(80,52,22,ALPHA)',    kante: 'rgba(255,245,225,0.16)' },
  'eiche-dunkel': { startwert: 1685, filz: '#241F1C', lamelle: '#8A653F', maserung: 'rgba(52,32,14,ALPHA)',    kante: 'rgba(255,240,215,0.12)' },
  'nussbaum':     { startwert: 1822, filz: '#241F1C', lamelle: '#6E4A32', maserung: 'rgba(38,22,12,ALPHA)',    kante: 'rgba(255,238,212,0.12)' },
  'schwarz':      { startwert: 1959, filz: '#1A1715', lamelle: '#33302C', maserung: 'rgba(0,0,0,ALPHA)',       kante: 'rgba(255,255,255,0.10)' },
  'weiss':        { startwert: 2096, filz: '#9E9A94', lamelle: '#F2F0EB', maserung: 'rgba(150,145,138,ALPHA)', kante: 'rgba(255,255,255,0.45)' },
}

// Cache je Bauart und Ausführung, wie erzeugeTapete(muster) weiter oben.
const paneelCache = {}

export function erzeugePaneel(bauart, ausfuehrung) {
  const schluessel = `${bauart}|${ausfuehrung}`
  if (paneelCache[schluessel]) return paneelCache[schluessel]
  const holz = bauart === 'holz'
  const tabelle = holz ? HOLZ_AUSFUEHRUNGEN : AKUSTIK_AUSFUEHRUNGEN
  const farben = tabelle[ausfuehrung] || tabelle['eiche']
  const groesse = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const zeichner = holz ? zeichneProfilholz : zeichneAkustik
  zeichner(canvas.getContext('2d'), groesse, farben, farben.startwert)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  // Nur ein Rückfallwert, die tatsächliche Wiederholung kommt aus WAND_MUSTER_GROESSE.
  texture.repeat.set(1, 1)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  paneelCache[schluessel] = texture
  return texture
}

// Raufaser: die häufigste Wandoberfläche in deutschen Wohnungen und in jedem Baumarkt
// Standardware. Technisch ist sie der Glücksfall dieses Systems — Raufaser wird überstrichen, die
// Wandfarbe als Tönung über die Struktur zu legen ist hier also nicht nur erlaubt, sondern genau
// richtig. Deshalb bleibt der gezeichnete Grund fast weiß: Nur so ergibt color × map in
// RoomView3D.jsx am Ende wirklich den gewählten Ton und nicht eine schmutzige Mischung.
//
// Drei Körnungen wie im Handel. Der Unterschied steckt allein in Größe und Dichte der Holzspäne —
// gröbere Späne sind größer und liegen weiter auseinander.
const RAUFASER_KOERNUNGEN = {
  fein:   { spanMin: 1.6, spanMax: 3.0, anzahl: 2800 },
  mittel: { spanMin: 2.6, spanMax: 5.0, anzahl: 1900 },
  grob:   { spanMin: 4.0, spanMax: 8.0, anzahl: 1300 },
}

const raufaserCache = {}

export function erzeugeRaufaserTextur(koernung) {
  if (raufaserCache[koernung]) return raufaserCache[koernung]
  const { spanMin, spanMax, anzahl } = RAUFASER_KOERNUNGEN[koernung] || RAUFASER_KOERNUNGEN.mittel
  const groesse = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FBFAF8'
  ctx.fillRect(0, 0, groesse, groesse)
  for (let i = 0; i < anzahl; i++) {
    const laenge = spanMin + Math.random() * (spanMax - spanMin)
    const dicke = Math.max(0.8, laenge * 0.35)
    const x = Math.random() * groesse
    const y = Math.random() * groesse
    const winkel = Math.random() * Math.PI
    // Mal heller, mal dunkler als der Grund: Ein Span wirft einen Schatten und fängt zugleich
    // Licht. Nur dunkle Striche sähen aus wie Schmutz statt wie Struktur.
    const heller = Math.random() < 0.45
    ctx.fillStyle = heller
      ? `rgba(255,255,255,${(0.5 + Math.random() * 0.4).toFixed(2)})`
      : `rgba(150,142,130,${(0.12 + Math.random() * 0.18).toFixed(2)})`
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(winkel)
    ctx.beginPath()
    ctx.ellipse(0, 0, laenge / 2, dicke / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  // Nur ein Notnagel für einen direkten Aufruf — die tatsächliche Wiederholung rechnet
  // erzeugeWandTexturFuerFlaeche aus der Kachelgröße weiter unten aus.
  texture.repeat.set(6, 3)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  raufaserCache[koernung] = texture
  return texture
}

// ---------------------------------------------------------------------------
// Wandtattoos (Wandmaterial v2, Schritt 5)
//
// Anders als alle Materialien darüber: ein einzelnes Motiv auf leerem Grund, kein gekacheltes
// Muster. Der Grund bleibt durchsichtig, damit die Wand ringsum sichtbar bleibt; das Material
// des Wandbereichs setzt dafür transparent (siehe wandBereiche in RoomView3D.jsx).
//
// Einfarbig anthrazit, so wie geplottete Klebefolie aussieht. Eine Farbwahl je Tattoo braucht
// ein eigenes Feld am Wandbereich und ist deshalb ein eigener Schritt.
//
// Die Tattoo-Klassen stehen bewusst NICHT in WAND_MUSTER_GROESSE: Dadurch gibt
// erzeugeWandTexturFuerFlaeche die Grundtextur unverändert zurück, und die wiederholt sich
// genau einmal über die Fläche. Ein Tattoo, das sich kachelt, wäre eine Tapete.
// ---------------------------------------------------------------------------

const TATTOO_FARBE = '#2E2C28'

// 1. Baum — Stamm mit sich gabelnden Ästen, ohne Blattmasse. Rekursiv: Jeder Ast bringt zwei
// dünnere hervor, ab der vierten Ebene zusätzlich einen kurzen dritten, damit die Krone nicht
// zu gleichmäßig wird. Abbruch bei zu dünn oder zu tief, sonst liefe die Rekursion endlos.
function zeichneTattooBaum(ctx, g) {
  ctx.fillStyle = TATTOO_FARBE
  ctx.strokeStyle = TATTOO_FARBE
  ctx.lineCap = 'round'
  const ast = (x, y, laenge, winkel, dicke, tiefe) => {
    if (tiefe === 0 || dicke < 0.9) return
    const x2 = x + Math.cos(winkel) * laenge
    const y2 = y + Math.sin(winkel) * laenge
    ctx.lineWidth = dicke
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke()
    ast(x2, y2, laenge * 0.74, winkel - 0.42, dicke * 0.68, tiefe - 1)
    ast(x2, y2, laenge * 0.74, winkel + 0.40, dicke * 0.68, tiefe - 1)
    if (tiefe > 3) ast(x2, y2, laenge * 0.52, winkel + 0.05, dicke * 0.52, tiefe - 2)
  }
  ast(g * 0.5, g * 0.98, g * 0.22, -Math.PI / 2, 24, 6)
}

function tattooKreis(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
}

// Ein Blatt als zwei gespiegelte Bögen, die am Stielansatz zusammenlaufen.
function tattooBlatt(ctx, x, y, laenge, breite, winkel) {
  ctx.save()
  ctx.translate(x, y); ctx.rotate(winkel)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(breite, -laenge * 0.35, 0, -laenge)
  ctx.quadraticCurveTo(-breite, -laenge * 0.35, 0, 0)
  ctx.fill()
  ctx.restore()
}

// 2. Eukalyptuszweig — geschwungener Stiel, ovale Blätter wechselständig, zur Spitze kleiner.
function zeichneTattooZweig(ctx, g) {
  ctx.fillStyle = TATTOO_FARBE; ctx.strokeStyle = TATTOO_FARBE; ctx.lineCap = 'round'
  // Der Stiel ist eine Bezierkurve. Für jedes Blatt werden Punkt UND Richtung der Kurve
  // gebraucht, damit es quer zum Stiel sitzt statt beliebig gedreht — die Richtung kommt aus
  // der Differenz zu einem Punkt ein Stück weiter.
  const p0 = [g * 0.12, g * 0.94], p1 = [g * 0.34, g * 0.74], p2 = [g * 0.58, g * 0.42], p3 = [g * 0.86, g * 0.12]
  const punkt = (t) => {
    const u = 1 - t
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]
  }
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(p0[0], p0[1])
  ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1])
  ctx.stroke()
  const anzahl = 13
  for (let i = 0; i < anzahl; i++) {
    const t = 0.05 + (i / (anzahl - 1)) * 0.92
    const [x, y] = punkt(t)
    const [x2, y2] = punkt(Math.min(1, t + 0.01))
    const richtung = Math.atan2(y2 - y, x2 - x)
    const seite = i % 2 === 0 ? 1 : -1
    const laenge = g * (0.135 - t * 0.075)
    const breite = laenge * 0.46
    const winkel = richtung + seite * 1.15
    // Der Mittelpunkt des Blatts liegt ein Stück vom Stiel weg, sonst läge das Blatt auf dem
    // Stiel statt daran.
    ctx.save()
    ctx.translate(x + Math.cos(winkel) * laenge * 0.55, y + Math.sin(winkel) * laenge * 0.55)
    ctx.rotate(winkel)
    ctx.beginPath()
    ctx.ellipse(0, 0, laenge * 0.55, breite * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// 3. Vogelschwarm — sieben Vögel als offene Doppelbögen in verschiedenen Größen. Mehr braucht
// ein Vogel aus der Ferne nicht; alles Weitere würde die Silhouette nur unruhig machen.
function zeichneTattooVoegel(ctx, g) {
  ctx.strokeStyle = TATTOO_FARBE; ctx.lineCap = 'round'
  // Der größte Vogel steht bei 0,17 statt 0,12: Seine Flügel reichen 1,6 · b = 0,16 der
  // Kachelbreite zur Seite, bei 0,12 lag die linke Flügelspitze also außerhalb der Textur und
  // war abgeschnitten.
  const tiere = [
    [0.17, 0.62, 1.00], [0.30, 0.38, 0.80], [0.46, 0.66, 0.62],
    [0.60, 0.26, 0.92], [0.74, 0.54, 0.54], [0.86, 0.34, 0.74], [0.24, 0.84, 0.44],
  ]
  for (const [fx, fy, s] of tiere) {
    const x = g * fx, y = g * fy, b = g * 0.10 * s
    ctx.lineWidth = Math.max(2.5, 7 * s)
    ctx.beginPath()
    ctx.moveTo(x - b * 1.6, y + b * 0.5)
    ctx.quadraticCurveTo(x - b * 0.7, y - b * 0.7, x, y)
    ctx.quadraticCurveTo(x + b * 0.7, y - b * 0.7, x + b * 1.6, y + b * 0.5)
    ctx.stroke()
  }
}

// 4. Bergkette — drei Gipfel, die Schneekappen werden HERAUSGESCHNITTEN.
//
// destination-out zeichnet nicht, sondern löscht aus dem bereits Gezeichneten. Auf dem
// durchsichtigen Grund heißt das: An den Kappen scheint die Wand durch. Genau so funktioniert
// geplottete Klebefolie — was nicht Folie ist, ist Wand. Am Ende wieder auf source-over
// zurückstellen, sonst löscht das nächste Motiv im selben Kontext ebenfalls.
function zeichneTattooBerge(ctx, g) {
  ctx.fillStyle = TATTOO_FARBE
  ctx.beginPath()
  ctx.moveTo(g * 0.02, g * 0.82)
  ctx.lineTo(g * 0.26, g * 0.34)
  ctx.lineTo(g * 0.42, g * 0.60)
  ctx.lineTo(g * 0.58, g * 0.20)
  ctx.lineTo(g * 0.76, g * 0.56)
  ctx.lineTo(g * 0.88, g * 0.42)
  ctx.lineTo(g * 0.98, g * 0.82)
  ctx.closePath()
  ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.lineWidth = 4
  ctx.strokeStyle = '#000'
  for (const [px, py, w] of [[0.26, 0.34, 0.07], [0.58, 0.20, 0.08]]) {
    ctx.beginPath()
    ctx.moveTo(g * (px - w), g * (py + 0.11))
    ctx.lineTo(g * (px - w * 0.3), g * (py + 0.05))
    ctx.lineTo(g * px, g * (py + 0.10))
    ctx.lineTo(g * (px + w * 0.4), g * (py + 0.04))
    ctx.lineTo(g * (px + w), g * (py + 0.12))
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}

// 5. Pusteblume — Stiel, Blütenboden mit Schirmchen, fünf davonfliegende daneben.
function zeichneTattooPusteblume(ctx, g) {
  ctx.fillStyle = TATTOO_FARBE; ctx.strokeStyle = TATTOO_FARBE; ctx.lineCap = 'round'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(g * 0.30, g * 0.98)
  ctx.quadraticCurveTo(g * 0.26, g * 0.70, g * 0.34, g * 0.52)
  ctx.stroke()
  const cx = g * 0.34, cy = g * 0.50
  for (let i = 0; i < 26; i++) {
    const w = -Math.PI * 0.95 + (i / 25) * Math.PI * 1.9
    const laenge = g * (0.14 + (i % 3) * 0.012)
    const ex = cx + Math.cos(w) * laenge, ey = cy + Math.sin(w) * laenge
    ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke()
    tattooKreis(ctx, ex, ey, 3)
  }
  tattooKreis(ctx, cx, cy, 5)
  for (const [fx, fy, s] of [[0.56, 0.36, 1], [0.66, 0.24, 0.85], [0.78, 0.30, 0.7], [0.86, 0.14, 0.6], [0.72, 0.44, 0.5]]) {
    const x = g * fx, y = g * fy, r = g * 0.035 * s
    ctx.lineWidth = 1.6
    for (let i = 0; i < 7; i++) {
      const w = -Math.PI * 0.9 + (i / 6) * Math.PI * 1.8
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(w) * r, y + Math.sin(w) * r); ctx.stroke()
    }
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.2, y + r * 1.3); ctx.stroke()
  }
}

// 6. Blätterranke — senkrecht, mit wechselständigen Blättern, nach oben kleiner werdend.
function zeichneTattooRanke(ctx, g) {
  ctx.fillStyle = TATTOO_FARBE; ctx.strokeStyle = TATTOO_FARBE; ctx.lineCap = 'round'
  // Die Blätter sitzen auf Punkten DER Stielkurve, wie beim Zweig. Eine eigene Sinuslinie für
  // ihre Position lief neben dem Stiel her statt auf ihm — bis zu 0,11 der Kachelbreite
  // daneben, die Blätter schwebten.
  const p0 = [g * 0.5, g * 0.99], p1 = [g * 0.38, g * 0.72], p2 = [g * 0.62, g * 0.40], p3 = [g * 0.48, g * 0.04]
  const punkt = (s) => {
    const u = 1 - s
    return [
      u * u * u * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s * s * s * p3[0],
      u * u * u * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s * s * s * p3[1],
    ]
  }
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(p0[0], p0[1])
  ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1])
  ctx.stroke()
  // Die Blätter zeigen schräg nach OBEN, in die Wuchsrichtung. tattooBlatt zeichnet entlang
  // -y, ein zusätzliches Math.PI im Winkel würde sie umdrehen — dann sähe die Ranke aus wie
  // eine Trauerweide, und unten lägen die Blätter auf dem Stiel statt an ihm.
  for (let i = 0; i < 14; i++) {
    const t = i / 13
    const [x, y] = punkt(0.02 + t * 0.94)
    const seite = i % 2 === 0 ? 1 : -1
    const l = g * (0.17 - t * 0.06)
    tattooBlatt(ctx, x, y, l, l * 0.34, seite * 1.15)
  }
}

// 7. Katze — sitzende Silhouette von hinten, Schwanz als eigener Strich. Ein geschlossener
// Umriss von Fuß über Ohren zurück zum Fuß; die Ohren sind zwei Ecken darin, keine Anbauten.
function zeichneTattooKatze(ctx, g) {
  ctx.fillStyle = TATTOO_FARBE
  ctx.beginPath()
  ctx.moveTo(g * 0.36, g * 0.92)
  ctx.quadraticCurveTo(g * 0.30, g * 0.62, g * 0.36, g * 0.44)
  ctx.lineTo(g * 0.33, g * 0.24)
  ctx.lineTo(g * 0.44, g * 0.33)
  ctx.quadraticCurveTo(g * 0.50, g * 0.30, g * 0.56, g * 0.33)
  ctx.lineTo(g * 0.67, g * 0.24)
  ctx.lineTo(g * 0.64, g * 0.44)
  ctx.quadraticCurveTo(g * 0.74, g * 0.66, g * 0.68, g * 0.92)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = TATTOO_FARBE; ctx.lineCap = 'round'; ctx.lineWidth = g * 0.045
  ctx.beginPath()
  ctx.moveTo(g * 0.67, g * 0.90)
  ctx.bezierCurveTo(g * 0.86, g * 0.94, g * 0.90, g * 0.70, g * 0.80, g * 0.60)
  ctx.stroke()
}

// 8. Sterne — elf Fünfzacksterne in drei Größen. Ein Stern entsteht aus zehn Punkten auf
// abwechselnd großem und kleinem Radius.
function zeichneTattooSterne(ctx, g) {
  ctx.fillStyle = TATTOO_FARBE
  const stellen = [
    [0.16, 0.22, 1.0], [0.42, 0.12, 0.6], [0.68, 0.26, 0.85], [0.88, 0.14, 0.5],
    [0.28, 0.48, 0.7], [0.56, 0.52, 1.0], [0.82, 0.58, 0.65], [0.12, 0.70, 0.55],
    [0.40, 0.80, 0.9], [0.70, 0.86, 0.6], [0.94, 0.80, 0.45],
  ]
  for (const [fx, fy, s] of stellen) {
    const x = g * fx, y = g * fy, r = g * 0.075 * s
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const w = -Math.PI / 2 + (i / 10) * Math.PI * 2
      const rr = i % 2 === 0 ? r : r * 0.42
      const px = x + Math.cos(w) * rr, py = y + Math.sin(w) * rr
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.closePath(); ctx.fill()
  }
}

// 9. Punkte — fünfzehn Kreise in verschiedenen Größen, fürs Kinderzimmer.
function zeichneTattooPunkte(ctx, g) {
  ctx.fillStyle = TATTOO_FARBE
  const stellen = [
    [0.12, 0.18, 1.0], [0.34, 0.10, 0.55], [0.58, 0.20, 0.8], [0.82, 0.12, 0.6],
    [0.22, 0.40, 0.7], [0.48, 0.44, 1.0], [0.74, 0.38, 0.5], [0.92, 0.48, 0.75],
    [0.14, 0.64, 0.85], [0.38, 0.70, 0.6], [0.62, 0.66, 0.95], [0.86, 0.74, 0.55],
    [0.26, 0.90, 0.65], [0.54, 0.88, 0.8], [0.78, 0.94, 0.5],
  ]
  for (const [fx, fy, s] of stellen) tattooKreis(ctx, g * fx, g * fy, g * 0.048 * s)
}

// 10. Schriftzug — „home" in kursiver Serifenschrift, darunter ein kleines Herz.
//
// Georgia und Times New Roman liegen auf Windows und macOS; `serif` als letzter Rückfall sorgt
// dafür, dass auch ohne beide etwas Vernünftiges erscheint statt einer Ersatzschrift ohne
// Serifen. Die Schriftgröße hängt an der Kachelgröße, damit das Wort immer gleich viel Platz
// einnimmt.
function zeichneTattooSchriftzug(ctx, g) {
  ctx.fillStyle = TATTOO_FARBE
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `italic ${Math.round(g * 0.34)}px Georgia, 'Times New Roman', serif`
  ctx.fillText('home', g * 0.5, g * 0.46)
  const hx = g * 0.5, hy = g * 0.74, s = g * 0.07
  ctx.beginPath()
  ctx.moveTo(hx, hy + s * 0.75)
  ctx.bezierCurveTo(hx - s * 1.4, hy - s * 0.3, hx - s * 0.45, hy - s * 1.1, hx, hy - s * 0.25)
  ctx.bezierCurveTo(hx + s * 0.45, hy - s * 1.1, hx + s * 1.4, hy - s * 0.3, hx, hy + s * 0.75)
  ctx.fill()
}

const TATTOO_ZEICHNER = {
  'baum':       zeichneTattooBaum,
  'zweig':      zeichneTattooZweig,
  'ranke':      zeichneTattooRanke,
  'pusteblume': zeichneTattooPusteblume,
  'berge':      zeichneTattooBerge,
  'voegel':     zeichneTattooVoegel,
  'katze':      zeichneTattooKatze,
  'sterne':     zeichneTattooSterne,
  'punkte':     zeichneTattooPunkte,
  'schriftzug': zeichneTattooSchriftzug,
}

const tattooCache = {}

export function erzeugeWandtattoo(motiv) {
  if (tattooCache[motiv]) return tattooCache[motiv]
  const zeichner = TATTOO_ZEICHNER[motiv] || zeichneTattooBaum
  const groesse = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  // Kein fillRect: Der Grund bleibt leer und damit durchsichtig. Genau das ist der Unterschied
  // zu allen Mustern weiter oben, die als Erstes ihren Grund füllen.
  zeichner(canvas.getContext('2d'), groesse)
  const texture = new THREE.CanvasTexture(canvas)
  // ClampToEdge statt Repeat: Das Motiv soll sich an keiner Kante fortsetzen, auch dann nicht,
  // wenn die Wiederholung durch Rundung minimal über 1 liegt.
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  tattooCache[motiv] = texture
  return texture
}

// Liefert die Textur für das gewählte Wandmaterial (siehe wandMaterialien in constants.js).
// Unbekannter/fehlender Typ (auch alte Räume ohne room.wandmaterial) fällt auf den bisherigen
// Putz zurück — kein Breaking Change für bestehende Räume.
export function erzeugeWandTextur(wandTyp) {
  // Die beiden ersten Klassennamen stammen aus der Zeit vor Wandmaterial v2 und bleiben
  // absichtlich, wie sie sind: Gespeicherte Räume tragen genau diese Werte.
  if (wandTyp === 'wand-tapete-blumen') return erzeugeTapete('blumen')
  if (wandTyp === 'wand-tapete-streifen') return erzeugeTapete('streifen-schmal')
  if (wandTyp === 'wand-tapete-streifen-breit') return erzeugeTapete('streifen-block')
  if (wandTyp === 'wand-tapete-kreise') return erzeugeTapete('kreise')
  if (wandTyp === 'wand-tapete-rauten') return erzeugeTapete('rauten')
  if (wandTyp === 'wand-tapete-aquarell') return erzeugeTapete('aquarell')
  if (wandTyp === 'wand-tapete-dschungel') return erzeugeTapete('dschungel')
  if (wandTyp === 'wand-tapete-beton') return erzeugeTapete('beton')
  if (wandTyp === 'wand-tapete-ziegel') return erzeugeTapete('ziegel')
  if (wandTyp === 'wand-tapete-terrazzo') return erzeugeTapete('terrazzo')
  // Die beiden namenlosen Klassen sind die aus der Zeit vor Wandmaterial v2 und bleiben, wie sie
  // sind: Gespeicherte Räume tragen sie. Inhaltlich sind es Eiche bzw. Eiche natur.
  if (wandTyp === 'wand-tattoo-baum') return erzeugeWandtattoo('baum')
  if (wandTyp === 'wand-tattoo-zweig') return erzeugeWandtattoo('zweig')
  if (wandTyp === 'wand-tattoo-ranke') return erzeugeWandtattoo('ranke')
  if (wandTyp === 'wand-tattoo-pusteblume') return erzeugeWandtattoo('pusteblume')
  if (wandTyp === 'wand-tattoo-berge') return erzeugeWandtattoo('berge')
  if (wandTyp === 'wand-tattoo-voegel') return erzeugeWandtattoo('voegel')
  if (wandTyp === 'wand-tattoo-katze') return erzeugeWandtattoo('katze')
  if (wandTyp === 'wand-tattoo-sterne') return erzeugeWandtattoo('sterne')
  if (wandTyp === 'wand-tattoo-punkte') return erzeugeWandtattoo('punkte')
  if (wandTyp === 'wand-tattoo-schriftzug') return erzeugeWandtattoo('schriftzug')
  if (wandTyp === 'wand-holzpaneele') return erzeugePaneel('holz', 'eiche')
  if (wandTyp === 'wand-holzpaneele-fichte') return erzeugePaneel('holz', 'fichte')
  if (wandTyp === 'wand-holzpaneele-fichte-weiss') return erzeugePaneel('holz', 'fichte-weiss')
  if (wandTyp === 'wand-akustikpaneele') return erzeugePaneel('akustik', 'eiche')
  if (wandTyp === 'wand-akustikpaneele-dunkel') return erzeugePaneel('akustik', 'eiche-dunkel')
  if (wandTyp === 'wand-akustikpaneele-nussbaum') return erzeugePaneel('akustik', 'nussbaum')
  if (wandTyp === 'wand-akustikpaneele-schwarz') return erzeugePaneel('akustik', 'schwarz')
  if (wandTyp === 'wand-akustikpaneele-weiss') return erzeugePaneel('akustik', 'weiss')
  if (wandTyp === 'wand-raufaser-fein') return erzeugeRaufaserTextur('fein')
  if (wandTyp === 'wand-raufaser-mittel') return erzeugeRaufaserTextur('mittel')
  if (wandTyp === 'wand-raufaser-grob') return erzeugeRaufaserTextur('grob')
  return erzeugeWandputzTextur()
}

// Optimierung 3: Reale Größe einer Musterkachel in Metern. Vorher steckte in jeder Muster-Funktion
// ein fester Wiederholungswert (z.B. repeat.set(4, 1.5)) — weil sich alle Wände EINE Textur-Instanz
// teilen, wurde das Muster damit über die jeweilige Wandlänge gestreckt: auf einer langen Wand
// breite Lamellen, auf einer kurzen schmale. Mit einer realen Kachelgröße lässt sich die
// Wiederholung stattdessen pro Fläche ausrechnen (siehe erzeugeWandTexturFuerFlaeche unten), das
// Muster ist dann überall gleich groß.
// breite/hoehe beziehen sich auf EINE Kachel des jeweiligen Musters. Die Werte sind seit
// Wandmaterial v2 an dem ausgerichtet, was tatsächlich im Baumarkt liegt — vorher waren sie
// geschätzt und entsprechend daneben:
//   Akustikpaneele  0,60 m = 12 Lamellen à 5 cm (mit Hassan abgestimmt, gröber als echte
//                   Paneele, aber bewusst so). Höhe 2,40 m, weil ein echtes Paneel so hoch ist:
//                   Bei üblicher Raumhöhe liegt die Wiederholung damit praktisch außerhalb der
//                   Wand, statt wie bei den früheren 1,60 m eine Fuge vorzutäuschen, die es nicht
//                   gibt.
//   Holzpaneele     0,768 m = 8 Bretter à 9,6 cm. 9,6 cm ist die Standard-Deckbreite von
//                   Profilholz im Handel. Vorher standen hier 20 cm je Brett — damit sah man
//                   keine Bretter, sondern breite Felder.
//   Streifentapete  0,53 m = 8 Streifen à 6,6 cm
//   Blumentapete    0,53 m = 8 Blüten à 6,6 cm
//   Raufaser        0,40 m je Kachel, in allen drei Körnungen gleich — die Spangröße steckt im
//                   gezeichneten Bild, nicht im Maßstab.
// 0,53 m ist bei beiden Tapeten kein Zufall: So breit ist eine Tapetenbahn, und weil das Muster
// an der Bahnkante aufgehen muss, ist der Rapport genau diese Breite (oder die Hälfte davon).
//
// Der Wandputz steht bewusst NICHT in dieser Liste: feine Foto-Struktur ohne erkennbares Muster,
// dort fällt der Maßstab nicht auf — und er würde als Foto-Textur pro Wand erneut auf die
// Grafikkarte geladen. Die Raufaser dagegen zeichnen wir selbst, sie kann deshalb gefahrlos pro
// Fläche geklont werden und bekommt dadurch auf jeder Wand dieselbe Spangröße.
export const WAND_MUSTER_GROESSE = {
  'wand-akustikpaneele':          { breite: 0.60,  hoehe: 2.40 },
  'wand-akustikpaneele-dunkel':   { breite: 0.60,  hoehe: 2.40 },
  'wand-akustikpaneele-nussbaum': { breite: 0.60,  hoehe: 2.40 },
  'wand-akustikpaneele-schwarz':  { breite: 0.60,  hoehe: 2.40 },
  'wand-akustikpaneele-weiss':    { breite: 0.60,  hoehe: 2.40 },
  // 0,768 m statt bisher 0,384 m: acht Bretter à 9,6 cm je Kachel statt vier. Die Deckbreite
  // des einzelnen Bretts ändert sich dadurch nicht, nur die Wiederholung liegt weiter
  // auseinander — bei vier Brettern sah man die Helligkeitsfolge der vier auf der Wand.
  'wand-holzpaneele':              { breite: 0.768, hoehe: 0.768 },
  'wand-holzpaneele-fichte':       { breite: 0.768, hoehe: 0.768 },
  'wand-holzpaneele-fichte-weiss': { breite: 0.768, hoehe: 0.768 },
  'wand-tapete-streifen':       { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-streifen-breit': { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-kreise':         { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-rauten':         { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-blumen':         { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-aquarell':       { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-dschungel':      { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-beton':          { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-ziegel':         { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-terrazzo':       { breite: 0.53,  hoehe: 0.53 },
  'wand-raufaser-fein':   { breite: 0.40,  hoehe: 0.40 },
  'wand-raufaser-mittel': { breite: 0.40,  hoehe: 0.40 },
  'wand-raufaser-grob':   { breite: 0.40,  hoehe: 0.40 },
}

// Liefert die Textur für eine konkrete Wandfläche: gleiche Musterkachel wie erzeugeWandTextur(),
// aber mit einer aus der realen Flächengröße berechneten Wiederholung. Jede Fläche bekommt dafür
// eine eigene Kopie — clone() teilt sich das bereits gezeichnete Bild mit dem Original aus dem
// modulweiten Cache (Restpunkt 5), es wird also nichts neu gezeichnet, nur ein eigener
// Wiederholungswert gesetzt.
// Wichtig: Die Kopie wird ausdrücklich NICHT als persistenteTextur markiert (clone() übernimmt
// userData vom Original, wo die Markierung steht). Sonst würde das Aufräumen in RoomView3D.jsx sie
// überspringen und bei jedem Szenen-Neuaufbau bliebe eine Kopie je Wand zurück.
export function erzeugeWandTexturFuerFlaeche(wandTyp, breiteM, hoeheM) {
  const basis = erzeugeWandTextur(wandTyp)
  const kachel = WAND_MUSTER_GROESSE[wandTyp]
  if (!kachel) return basis
  const textur = basis.clone()
  textur.userData = { ...textur.userData, persistenteTextur: false }
  textur.wrapS = textur.wrapT = THREE.RepeatWrapping
  textur.repeat.set(
    Math.max(0.1, (breiteM || 0) / kachel.breite),
    Math.max(0.1, (hoeheM || 0) / kachel.hoehe),
  )
  textur.needsUpdate = true
  return textur
}

// Backstein-Einfassung für den Rundbogen-Durchgang (Phase 4, Teil 3b) — Ziegelsteine im
// klassischen Läuferverband (jede zweite Reihe um einen halben Stein versetzt), nach demselben
// Canvas-Zeichnen-Muster wie erzeugePaneel/erzeugeTapete oben, nur als
// eigenständiges Muster statt Teil des wandMaterialien-Auswahl-Dispatchers.
let backsteinTexturCache = null

export function erzeugeBacksteinTextur() {
  if (backsteinTexturCache) return backsteinTexturCache
  const breite = 256, hoehe = 128
  const canvas = document.createElement('canvas')
  canvas.width = breite
  canvas.height = hoehe
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#B0806A' // Fugenfarbe (Mörtel)
  ctx.fillRect(0, 0, breite, hoehe)
  const steinBreite = 32, steinHoehe = 14, fuge = 3
  for (let y = 0, reihe = 0; y < hoehe; y += steinHoehe + fuge, reihe++) {
    const versatz = (reihe % 2) * (steinBreite / 2)
    for (let x = -steinBreite; x < breite + steinBreite; x += steinBreite + fuge) {
      const helligkeit = 0.85 + Math.random() * 0.3
      const r = Math.round(150 * helligkeit), g = Math.round(78 * helligkeit), b = Math.round(58 * helligkeit)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x + versatz, y, steinBreite, steinHoehe)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 1)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  backsteinTexturCache = texture
  return texture
}

let umgebungsTexturCache = null

export function erzeugeUmgebungsTextur() {
  if (umgebungsTexturCache) return umgebungsTexturCache
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, 16)
  gradient.addColorStop(0, '#dfe9f0')
  gradient.addColorStop(0.5, '#f5f4f0')
  gradient.addColorStop(1, '#c9c2b0')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 16, 16)
  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  umgebungsTexturCache = texture
  return texture
}

// Nur noch für erzeugeStandardBodenTextur relevant (die anderen Bodenbeläge sind echte
// Foto-Texturen, siehe BODEN_TEXTUR_URLS) — bleibt trotzdem generisch nach Typ statt fest
// verdrahtet, für jeden unbekannten/zukünftigen Belag ohne eigenes Foto.
export function getBodenFarbe(boden) {
  const farben = {
    'boden-standard': '#F5F4F0',
  }
  return farben[boden] || '#F5F4F0'
}

export function getMoebelHoehe(name) {
  const hoehen = {
    'Sofa': 0.4, 'Sessel': 0.4, 'Sofa 2-Sitzer': 0.4, 'Sofa 3-Sitzer': 0.4, 'Ecksofa': 0.42,
    'Einzelbett': 0.6, 'Doppelbett': 0.6, 'Boxspringbett': 0.65,
    'Esstisch': 0.75, 'Couchtisch': 0.45,
    'Schreibtisch': 0.75, 'TV-Board': 0.5, 'Sideboard': 0.8,
    'Kleiderschrank': 2.1, 'Regal': 1.8, 'Bücherregal': 1.8,
    'Kühlschrank': 1.8, 'Herd': 0.9, 'Spüle': 0.9,
    'WC': 0.8, 'Badewanne': 0.6, 'Dusche': 2.0,
    'Waschmaschine': 0.85, 'Pflanze': 1.2, 'Großpflanze': 1.8,
    'Lampe': 1.5, 'Stehlampe': 1.7, 'TV': 0.1,
    'Lautsprecher': 0.4, 'Spielekonsole': 0.08, 'Laptop': 0.02,
    'Router': 0.04, 'Toaster': 0.2, 'Wasserkocher': 0.25,
    'Kaffeemaschine': 0.35, 'Ventilator': 0.9,
    'Teppich klein': 0.02, 'Teppich groß': 0.02, 'Bild': 0.03,
    'Sitzbank': 0.45, 'Barhocker': 0.75, 'Sofa 1-Sitzer': 0.4, 'Schminktisch': 0.75, 'Bettbank': 0.45,
    'Rollcontainer': 0.6, 'Konferenztisch': 0.75, 'Backofen': 0.6, 'Dunstabzugshaube': 0.15,
    'Duschkabine Eck': 2.0, 'Bidet': 0.8,
    'Vase': 0.3, 'Kerzenständer': 0.25, 'Wanduhr': 0.03, 'Kissen': 0.15,
    'Globus': 0.4, 'Skulptur': 0.5, 'Kaktus': 0.6, 'Lichterkette': 0.05,
    'Deckenlampe': 0.3, 'Pendelleuchte': 0.35, 'Wandleuchte': 0.2, 'Kronleuchter': 0.45, 'Tischlampe': 0.45,
    'Monitor': 0.35, 'Spiegel': 0.7, 'Kücheninsel': 0.9, 'Geschirrspüler': 0.82,
    'Mikrowelle': 0.3, 'Drucker': 0.3,
  }
  return hoehen[name] || 0.75
}
