import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

// Zuordnung: exakter Möbel-Name (wie in furnitureLibrary/constants.js) -> Datei in /public/modelle/.
// Neues Möbelstück mit echtem 3D-Modell hinzufügen = hier eine Zeile ergänzen + Datei in
// public/modelle/ ablegen. Kein weiterer Code nötig, moebel.js und RoomView3D.jsx greifen
// automatisch darauf zu, sobald der Name hier eingetragen ist.
const MODELL_DATEIEN = {
  'Sofa 3-Sitzer': '/modelle/sofa-3-sitzer.glb',
  'Doppelbett': '/modelle/doppelbett.glb',
  'Esstisch': '/modelle/esstisch.glb',
  'Sessel': '/modelle/sessel.glb',
  'Couchtisch': '/modelle/couchtisch.glb',
  'Essstuhl': '/modelle/essstuhl.glb',
  'Sideboard': '/modelle/sideboard.glb',
  'Bücherregal': '/modelle/buecherregal.glb',
  'TV': '/modelle/tv.glb',
  'Sitzbank': '/modelle/sitzbank-01.glb',
  'TV-Board': '/modelle/tv-board.glb',
  'Nachttisch': '/modelle/nachttisch.glb',
  'Kommode': '/modelle/kommode.glb',
  'Kleiderschrank': '/modelle/kleiderschrank.glb',
  'Spiegel': '/modelle/spiegel.glb',
  'Hocker': '/modelle/hocker.glb',
  'Schminktisch': '/modelle/schminktisch.glb',
  'Bettbank': '/modelle/sitzbank.glb',
  'Vitrine': '/modelle/vitrine-01.glb',
  'Bürostuhl': '/modelle/buerostuhl-02.glb',
  'Backofen': '/modelle/backofen-01.glb',
  'Drucker': '/modelle/drucker-01.glb',
  'Dunstabzugshaube': '/modelle/dunstabzugshaube-01.glb',
  'Kücheninsel': '/modelle/kuecheninsel-01.glb',
  'Kühlschrank': '/modelle/kuehlschrank-01.glb',
  'Mikrowelle': '/modelle/mikrowelle-01.glb',
  'Regal': '/modelle/regal-01.glb',
  'Rollcontainer': '/modelle/rollcontainer-01.glb',
  'Unterschrank': '/modelle/unterschrank-01.glb',
  'Badewanne': '/modelle/badewanne-01.glb',
  'Barhocker': '/modelle/barhocker-01.glb',
  'Duschkabine Eck': '/modelle/duschkabine-eck-01.glb',
  'Globus': '/modelle/globus-01.glb',
  'Großpflanze': '/modelle/grosspflanze-01.glb',
  'Kaffeemaschine': '/modelle/kaffeemaschine-01.glb',
  'Kaktus': '/modelle/kaktus-01.glb',
  'Kamin': '/modelle/kamin-01.glb',
  'Kerzenständer': '/modelle/kerzenstaender-01.glb',
  'Kissen': '/modelle/kissen-01.glb',
  'Lampe': '/modelle/lampe-01.glb',
  'Laptop': '/modelle/laptop-01.glb',
  'Lautsprecher': '/modelle/lautsprecher-01.glb',
  'Monitor': '/modelle/monitor-02.glb',
  'Pflanze': '/modelle/pflanze-01.glb',
  'Router': '/modelle/router-01.glb',
  'Skulptur': '/modelle/skulptur-01.glb',
  'Spielekonsole': '/modelle/spielekonsole-01.glb',
  'Tischlampe': '/modelle/tischlampe-01.glb',
  'Toaster': '/modelle/toaster-01.glb',
  'Vase': '/modelle/vase-01.glb',
  'Ventilator': '/modelle/ventilator-01.glb',
  'Wandleuchte': '/modelle/wandleuchte-01.glb',
  'Wanduhr': '/modelle/wanduhr-01.glb',
  'Waschbecken': '/modelle/waschbecken-01.glb',
  'Waschmaschine': '/modelle/waschmaschine-01.glb',
  'Wasserkocher': '/modelle/wasserkocher-01.glb',
  'WC': '/modelle/wc-01.glb',
  'Sofa 2-Sitzer': '/modelle/sofa-2-sitzer-01.glb',
  'Boxspringbett': '/modelle/boxspringbett-01.glb',
  'Einzelbett': '/modelle/einzelbett-01.glb',
  'Oberschrank': '/modelle/oberschrank-01.glb',
  'Herd': '/modelle/herd-02.glb',
}

// Normalerweise wird die Höhe eines geladenen Modells automatisch im selben Verhältnis wie die
// Breite skaliert (siehe moebel.js) — das erhält die echten Proportionen des 3D-Modells. Für
// Modelle, bei denen mitgeliefertes Deko-Beiwerk (z.B. eine Vase auf einem Esstisch) die
// Bounding-Box des Rohmodells künstlich in die Höhe zieht, hier stattdessen eine feste, reale
// Zielhöhe (Meter) hinterlegen, die auf das gesamte Modell (Möbelstück + Deko) angewendet wird.
export const MODELL_HOEHE_UEBERSCHREIBUNG = {
  'Esstisch': 0.75,
  'Kleiderschrank': 2.35,
  // Paket 5: Modell-Proportionen passen nicht zum Standard-Produkt (Werte = echte Produkthöhe)
  'Kaktus': 0.26,          // Produkt ohne Breite → Katalogbreite würde ihn auf ~76 cm aufblasen
  'Kerzenständer': 0.36,
  'Pflanze': 0.40,
  'Vase': 0.25,
  'Ventilator': 1.40,
  'Wanduhr': 0.54,
  'Duschkabine Eck': 1.95,
  // Paket 6
  'Boxspringbett': 0.88,
  'Einzelbett': 0.95,
}

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

const cache = new Map()      // Möbel-Name -> geladenes THREE-Objekt
const promises = new Map()   // Möbel-Name -> Promise (lädt gerade oder ist fertig geladen)

function ladeEinzelnesModell(name) {
  if (promises.has(name)) return promises.get(name)
  const promise = new Promise((resolve) => {
    gltfLoader.load(
      MODELL_DATEIEN[name],
      (gltf) => { cache.set(name, gltf.scene); resolve() },
      undefined,
      (fehler) => {
        console.warn(`3D-Modell für "${name}" konnte nicht geladen werden (${MODELL_DATEIEN[name]}):`, fehler)
        resolve() // trotzdem auflösen — betroffenes Möbelstück fällt auf die Klötzchen-Bauweise zurück
      },
    )
  })
  promises.set(name, promise)
  return promise
}

// Lädt gezielt nur die übergebenen Möbel-Namen, für die in MODELL_DATEIEN ein Modell hinterlegt
// ist — NICHT mehr pauschal alle auf einmal (App-schneller-machen, Schritt 2): ein einzelner Raum
// braucht meist nur einen Bruchteil der inzwischen hinterlegten Modelle, und mit jedem neuen
// Meshy-Modell aus dem laufenden 3D-Objekt-Tag-Workflow würde das sonst immer unnötiger. Bereits
// geladene oder gerade ladende Namen werden nicht erneut angefordert (siehe ladeEinzelnesModell),
// wiederholte Aufrufe mit denselben Namen sind also günstig.
export function ladeModelle(benoetigteNamen) {
  const relevante = benoetigteNamen.filter(name => MODELL_DATEIEN[name])
  return Promise.all(relevante.map(ladeEinzelnesModell)).then(() => true)
}

// Synchroner Lookup für moebel.js — liefert null, solange das Modell für diesen Namen noch nicht
// fertig geladen ist oder kein Modell hinterlegt ist (dann greift die bestehende Klötzchen-Bauweise).
export function getModell(name) {
  return cache.get(name) || null
}

// Gibt es für diesen Möbelnamen überhaupt ein Modell? Unabhängig davon, ob es schon geladen ist —
// getModell() oben beantwortet die Ladefrage, diese hier die Katalogfrage. Genutzt von
// data/moebelFilter.js, damit Schritt 4 nur anbietet, was auch als Modell erscheint.
export function hatModell(name) {
  return Boolean(MODELL_DATEIEN[name])
}
