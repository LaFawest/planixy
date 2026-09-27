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

// Zeichner-Tabelle statt zehn fast gleicher Funktionen mit je eigenem Cache — dasselbe Muster wie
// bei erzeugeRaufaserTextur(koernung) weiter unten.
const TAPETEN_ZEICHNER = {
  'streifen-schmal': zeichneStreifenSchmal,
  'streifen-block':  zeichneBlockstreifen,
  'kreise':          zeichneKreise,
  'rauten':          zeichneRauten,
  'blumen':          zeichneBlumen,
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

// Holzpaneele: wie erzeugeHolzTextur() (Holzmaserung per Zufalls-Linien), zusätzlich mit
// vertikalen Paneel-Fugen, damit einzelne Bretter/Paneele erkennbar sind statt einer
// durchgehenden Fläche.
let holzpaneeleTexturCache = null

export function erzeugeHolzpaneeleTextur() {
  if (holzpaneeleTexturCache) return holzpaneeleTexturCache
  const groesse = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#B8956A'
  ctx.fillRect(0, 0, groesse, groesse)
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * groesse
    const dunkel = 0.08 + Math.random() * 0.18
    ctx.strokeStyle = `rgba(80,52,22,${dunkel.toFixed(2)})`
    ctx.lineWidth = 0.6 + Math.random() * 1.6
    ctx.beginPath()
    let x = 0
    ctx.moveTo(x, y)
    while (x < groesse) {
      x += 6
      ctx.lineTo(x, y + Math.sin(x * 0.04 + i) * 3 + (Math.random() - 0.5) * 1.5)
    }
    ctx.stroke()
  }
  const anzahlPaneele = 4
  const paneelBreite = groesse / anzahlPaneele
  ctx.strokeStyle = 'rgba(50,32,14,0.4)'
  ctx.lineWidth = 2
  for (let i = 1; i < anzahlPaneele; i++) {
    ctx.beginPath()
    ctx.moveTo(i * paneelBreite, 0)
    ctx.lineTo(i * paneelBreite, groesse)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 1.5)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  holzpaneeleTexturCache = texture
  return texture
}

// Akustikpaneele: abwechselnd Holzlamellen und dunkle Zwischenräume (Filzoptik), wie die
// aktuell verbreiteten Akustik-Wandpaneele aus dem Baumarkt.
let akustikpaneeleTexturCache = null

export function erzeugeAkustikpaneeleTextur() {
  if (akustikpaneeleTexturCache) return akustikpaneeleTexturCache
  const groesse = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#2C2622'
  ctx.fillRect(0, 0, groesse, groesse)
  const lamellenAnzahl = 12
  const lamellenBreite = groesse / lamellenAnzahl
  for (let i = 0; i < lamellenAnzahl; i++) {
    const x = i * lamellenBreite
    ctx.fillStyle = '#B8956A'
    ctx.fillRect(x, 0, lamellenBreite * 0.7, groesse)
    for (let g = 0; g < 8; g++) {
      const gy = Math.random() * groesse
      ctx.strokeStyle = `rgba(80,52,22,${(0.1 + Math.random() * 0.15).toFixed(2)})`
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(x, gy)
      ctx.lineTo(x + lamellenBreite * 0.7, gy + (Math.random() - 0.5) * 4)
      ctx.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 1.5)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.userData.persistenteTextur = true
  akustikpaneeleTexturCache = texture
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
  if (wandTyp === 'wand-holzpaneele') return erzeugeHolzpaneeleTextur()
  if (wandTyp === 'wand-akustikpaneele') return erzeugeAkustikpaneeleTextur()
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
//   Holzpaneele     0,384 m = 4 Bretter à 9,6 cm. 9,6 cm ist die Standard-Deckbreite von
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
  'wand-akustikpaneele':  { breite: 0.60,  hoehe: 2.40 },
  'wand-holzpaneele':     { breite: 0.384, hoehe: 0.384 },
  'wand-tapete-streifen':       { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-streifen-breit': { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-kreise':         { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-rauten':         { breite: 0.53,  hoehe: 0.53 },
  'wand-tapete-blumen':         { breite: 0.53,  hoehe: 0.53 },
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
// Canvas-Zeichnen-Muster wie erzeugeHolzpaneeleTextur/erzeugeTapete oben, nur als
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
