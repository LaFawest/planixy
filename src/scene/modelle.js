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

const cache = new Map()
let ladePromise = null

// Lädt einmalig alle in MODELL_DATEIEN eingetragenen Modelle. Mehrfache Aufrufe (z.B. durch
// React StrictMode oder mehrere RoomView3D-Instanzen) liefern dieselbe Promise zurück, es wird
// nichts doppelt geladen.
export function ladeModelle() {
  if (ladePromise) return ladePromise
  const eintraege = Object.entries(MODELL_DATEIEN)
  ladePromise = Promise.all(
    eintraege.map(([name, pfad]) =>
      new Promise((resolve) => {
        gltfLoader.load(
          pfad,
          (gltf) => { cache.set(name, gltf.scene); resolve() },
          undefined,
          (fehler) => {
            console.warn(`3D-Modell für "${name}" konnte nicht geladen werden (${pfad}):`, fehler)
            resolve() // trotzdem auflösen — betroffenes Möbelstück fällt auf die Klötzchen-Bauweise zurück
          },
        )
      })
    )
  ).then(() => true)
  return ladePromise
}

// Synchroner Lookup für moebel.js — liefert null, solange ladeModelle() noch nicht abgeschlossen
// ist oder für diesen Namen kein Modell hinterlegt ist (dann greift die bestehende Klötzchen-Bauweise).
export function getModell(name) {
  return cache.get(name) || null
}
