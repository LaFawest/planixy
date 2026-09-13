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
}

// Normalerweise wird die Höhe eines geladenen Modells automatisch im selben Verhältnis wie die
// Breite skaliert (siehe moebel.js) — das erhält die echten Proportionen des 3D-Modells. Für
// Modelle, bei denen mitgeliefertes Deko-Beiwerk (z.B. eine Vase auf einem Esstisch) die
// Bounding-Box des Rohmodells künstlich in die Höhe zieht, hier stattdessen eine feste, reale
// Zielhöhe (Meter) hinterlegen, die auf das gesamte Modell (Möbelstück + Deko) angewendet wird.
export const MODELL_HOEHE_UEBERSCHREIBUNG = {
  'Esstisch': 0.75,
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
