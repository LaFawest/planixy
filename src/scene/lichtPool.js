import * as THREE from 'three'

// Fester Licht-Vorrat statt einer eigenen Lichtquelle je Leuchte.
//
// Three.js backt die ANZAHL der Lichter fest in die Shader jedes Materials ein. Ändert sich diese
// Anzahl — eine Leuchte an- oder ausgeschaltet, ein Möbelstück verschoben, wodurch der Möbel-Effekt
// in RoomView3D.jsx die ganze Gruppe neu baut —, muss die Grafikkarte sämtliche Materialien der
// Szene neu übersetzen. Das ist das kurze Hängen beim Bearbeiten, und es passiert selbst dann, wenn
// am Ende gleich viele Lichter dastehen.
//
// Deshalb liegen die Lichter jetzt hier: als Vorrat in der dauerhaften Szene. Eine Leuchte bestellt
// nur noch Licht (scene/moebel.js hängt dafür einen leeren Platzhalter mit userData.lichtWunsch in
// ihre Gruppe), und dieser Vorrat wird pro Bild auf die Bestellungen verteilt. Eine unbenutzte
// Stelle bekommt Intensität 0 statt entfernt zu werden — sie zählt weiter als Licht, der Shader
// bleibt unverändert.
//
// Der Vorrat wächst dabei nicht mit jeder Bestellung, sondern nur in Stufen. Das ist ein bewusster
// Kompromiss: Ein Licht mit Intensität 0 leuchtet zwar nicht, wird aber trotzdem für jeden
// Bildpunkt durchgerechnet. Ein dauerhaft großer Vorrat würde also auch einen leeren Raum
// verteuern. Mit den Stufen zahlt ein Raum mit zwei Lampen nur zwei Lichter, und die teure
// Neuübersetzung passiert höchstens beim Überschreiten einer Stufengrenze.
export const LICHT_STUFEN = [0, 2, 4, 8]

export const MAX_LICHTER = LICHT_STUFEN[LICHT_STUFEN.length - 1]

function passendeStufe(anzahl) {
  return LICHT_STUFEN.find(stufe => stufe >= anzahl) ?? MAX_LICHTER
}

// Bringt den Vorrat auf die zur gewünschten Anzahl passende Stufe. NUR diese Funktion fügt Lichter
// hinzu oder entfernt sie — jeder Aufruf, der die Stufe nicht ändert, lässt die Szene und damit die
// Shader unangetastet. pool ist ein Feld, das der Aufrufer hält (in RoomView3D.jsx eine Ref) und
// das hier an Ort und Stelle verändert wird.
export function stelleLichtPoolBereit(scene, pool, anzahlGewuenscht) {
  const ziel = passendeStufe(anzahlGewuenscht)
  while (pool.length < ziel) {
    // Kein castShadow: Schattenwurf kostet je Licht einen eigenen Renderdurchgang. In der Szene
    // wirft nur noch die Sonne Schatten (scene/beleuchtung.js); die einzelnen Leuchten taten es nie.
    const licht = new THREE.PointLight(0xfff0c8, 0, 1)
    scene.add(licht)
    pool.push(licht)
  }
  while (pool.length > ziel) {
    const licht = pool.pop()
    scene.remove(licht)
    licht.dispose?.()
  }
  return pool
}

// Räumt den ganzen Vorrat ab — gehört zum Abräumen der dauerhaften Szene beim Unmount.
export function raeumeLichtPoolAb(scene, pool) {
  pool.forEach(licht => {
    scene.remove(licht)
    licht.dispose?.()
  })
  pool.length = 0
}

const hilfsPosition = new THREE.Vector3()

// Verteilt die Bestellungen auf den Vorrat. Wird pro Bild aufgerufen und ist absichtlich billig: Es
// werden nur Werte gesetzt, nie Objekte erzeugt oder entfernt. Die Weltposition kommt frisch vom
// Platzhalter, damit das Licht beim Ziehen einer Deckenleuchte mitwandert statt nachzuspringen.
//
// Reihenfolge: Wer in der Möbelliste zuerst steht, bekommt zuerst eine Stelle. Das ist bewusst
// schlicht und dadurch vorhersehbar — ein Licht springt nie von selbst zwischen Leuchten hin und
// her, während man sich im Raum bewegt. Gibt es mehr eingeschaltete Leuchten als Stellen im Vorrat,
// leuchten die übrigen weiterhin sichtbar (ihre Glühfläche gehört zur Geometrie), spenden aber kein
// Licht.
export function verteileLichter(pool, platzhalter) {
  for (let i = 0; i < pool.length; i++) {
    const licht = pool[i]
    const quelle = platzhalter[i]
    if (!quelle) {
      licht.intensity = 0
      continue
    }
    const wunsch = quelle.userData.lichtWunsch
    quelle.getWorldPosition(hilfsPosition)
    licht.position.copy(hilfsPosition)
    licht.color.set(wunsch.farbe)
    licht.intensity = wunsch.intensitaet
    licht.distance = wunsch.reichweite
  }
}
