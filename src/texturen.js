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

export function erzeugeHolzTextur() {
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
  return texture
}

export function erzeugeStoffTextur() {
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

// Blumentapete: 5-blättrige Blüten im Ziegelmuster versetzt angeordnet, wie bei echter
// Mustertapete. Naturfarben (creme + Terrakotta/Salbei-Akzent) statt Graustufen, damit sie bei
// Standard-Wandfarbe Weiß direkt gut aussieht — bei anderen Wandfarben wird sie wie der bisherige
// Putz zusätzlich eingefärbt (color × map in RoomView3D.jsx).
export function erzeugeBlumenTapete() {
  const groesse = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = groesse
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#F7F1E6'
  ctx.fillRect(0, 0, groesse, groesse)
  const raster = 8
  const zelle = groesse / raster
  for (let y = 0; y < raster; y++) {
    for (let x = 0; x < raster; x++) {
      const versatz = (y % 2) * (zelle / 2)
      const cx = x * zelle + versatz + zelle / 2 + (Math.random() - 0.5) * 6
      const cy = y * zelle + zelle / 2 + (Math.random() - 0.5) * 6
      const radius = zelle * 0.22
      for (let p = 0; p < 5; p++) {
        const winkel = (p / 5) * Math.PI * 2 + Math.random() * 0.3
        const px = cx + Math.cos(winkel) * radius * 0.6
        const py = cy + Math.sin(winkel) * radius * 0.6
        ctx.fillStyle = 'rgba(186,117,23,0.5)'
        ctx.beginPath()
        ctx.ellipse(px, py, radius * 0.5, radius * 0.32, winkel, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(122,150,90,0.6)'
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 0.22, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 1.5)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Streifentapete: schlichte vertikale Streifen in zwei Tönen.
export function erzeugeStreifenTapete() {
  const breite = 128, hoehe = 128
  const canvas = document.createElement('canvas')
  canvas.width = breite
  canvas.height = hoehe
  const ctx = canvas.getContext('2d')
  const streifenBreite = breite / 8
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#F7F1E6' : '#E4D9C4'
    ctx.fillRect(i * streifenBreite, 0, streifenBreite, hoehe)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 1)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Holzpaneele: wie erzeugeHolzTextur() (Holzmaserung per Zufalls-Linien), zusätzlich mit
// vertikalen Paneel-Fugen, damit einzelne Bretter/Paneele erkennbar sind statt einer
// durchgehenden Fläche.
export function erzeugeHolzpaneeleTextur() {
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
  return texture
}

// Akustikpaneele: abwechselnd Holzlamellen und dunkle Zwischenräume (Filzoptik), wie die
// aktuell verbreiteten Akustik-Wandpaneele aus dem Baumarkt.
export function erzeugeAkustikpaneeleTextur() {
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
  return texture
}

// Liefert die Textur für das gewählte Wandmaterial (siehe wandMaterialien in constants.js).
// Unbekannter/fehlender Typ (auch alte Räume ohne room.wandmaterial) fällt auf den bisherigen
// Putz zurück — kein Breaking Change für bestehende Räume.
export function erzeugeWandTextur(wandTyp) {
  if (wandTyp === 'wand-tapete-blumen') return erzeugeBlumenTapete()
  if (wandTyp === 'wand-tapete-streifen') return erzeugeStreifenTapete()
  if (wandTyp === 'wand-holzpaneele') return erzeugeHolzpaneeleTextur()
  if (wandTyp === 'wand-akustikpaneele') return erzeugeAkustikpaneeleTextur()
  return erzeugeWandputzTextur()
}

// Backstein-Einfassung für den Rundbogen-Durchgang (Phase 4, Teil 3b) — Ziegelsteine im
// klassischen Läuferverband (jede zweite Reihe um einen halben Stein versetzt), nach demselben
// Canvas-Zeichnen-Muster wie erzeugeHolzpaneeleTextur/erzeugeStreifenTapete oben, nur als
// eigenständiges Muster statt Teil des wandMaterialien-Auswahl-Dispatchers.
export function erzeugeBacksteinTextur() {
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
  return texture
}

export function erzeugeUmgebungsTextur() {
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
