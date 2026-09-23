import * as THREE from 'three'

// Untergrenzen für Umgebungslicht bei Nacht — der Raum soll auch ganz ohne platzierte Leuchte
// nie unbenutzbar dunkel werden (siehe Analyse Phase 4), aber deutlich unter der Tageshelligkeit
// bleiben, damit eine eingeschaltete Lampe noch einen sichtbaren Unterschied macht.
const MIN_AMBIENT = 0.12
const MIN_HIMMEL = 0.05
const MIN_HEMISPHERE = 0.08

// Tageszeit (Stunden, 0–24) → Sonnenstand und Umgebungslicht. sonnenhoeheRoh ist eine einzige
// Sinusschwingung über 24 Stunden (Minimum -1 um Mitternacht, Maximum 1 um 12 Uhr Mittag) — daraus
// leiten sich zwei unterschiedlich geformte Größen ab:
// - sonnenhoehe (die direkte Sonne) klemmt bei 0, da die Sonne nachts nicht mehr direkt beiträgt.
// - tagAnteil (Umgebungs-/Himmelslicht) bleibt dagegen die ganze Nacht über kontinuierlich in
//   Bewegung statt ab Sonnenuntergang sofort auf einem Plateau zu verharren — sonst sähen 20 Uhr
//   und 3 Uhr nachts identisch aus, weil beide sonnenhoehe=0 hätten. Smoothstep sorgt zusätzlich
//   für einen knackigeren Tag/Nacht-Kontrast als die reine Sinuskurve, ohne einen harten Sprung.
function tageslichtWerte(tageszeit) {
  const sonnenhoeheRoh = Math.sin((tageszeit - 6) / 12 * Math.PI)
  const sonnenhoehe = Math.max(0, sonnenhoeheRoh)
  const t = (sonnenhoeheRoh + 1) / 2
  const tagAnteil = t * t * (3 - 2 * t)
  // Warmton (Morgen-/Abendrot) nimmt zum Horizont hin zu, am Zenit neutralweiß wie bisher.
  const warmton = 1 - sonnenhoehe
  return {
    sonnenhoehe,
    sonneIntensitaet: sonnenhoehe * 1.3,
    sonneFarbe: new THREE.Color(0xfff5e6).lerp(new THREE.Color(0xff9d4d), warmton * 0.7),
    ambientIntensitaet: MIN_AMBIENT + tagAnteil * (0.6 - MIN_AMBIENT),
    himmelIntensitaet: MIN_HIMMEL + tagAnteil * (0.6 - MIN_HIMMEL),
    himmelFarbe: new THREE.Color(0x8fb0e8).lerp(new THREE.Color(0xc8e8ff), tagAnteil),
    hemisphereIntensitaet: MIN_HEMISPHERE + tagAnteil * (0.3 - MIN_HEMISPHERE),
  }
}

// === BELEUCHTUNG (Sonne, Himmelslicht, Aufhellung) ===
//
// Bewusst OHNE allgemeine Deckenleuchte: Hier hing lange ein PointLight zwanzig Zentimeter unter
// der Decke in der Raummitte, fest eingebaut und unabhängig davon, ob überhaupt eine Lampe im Raum
// steht. Das stammte aus der Zeit vor den echten Deckenleuchten und hat zwei Dinge falsch gemacht —
// es zeichnete einen hellen weißen Fleck an die Decke, den niemand erklären konnte, und es spendete
// Licht, wo keine Leuchte war. Licht gibt es jetzt nur noch dort, wo jemand eine hingestellt hat;
// die einzelnen Leuchten bestellen es über scene/moebel.js beim Vorrat in scene/lichtPool.js.
//
// Was hier bleibt, ist ausschließlich Umgebungslicht: Sonne, Himmel durchs Fenster und eine
// allgemeine Aufhellung. Die Untergrenzen ganz oben sorgen dafür, dass ein Raum auch nachts ohne
// Lampe nicht unbenutzbar dunkel wird.
export function baueBeleuchtung(scene, raumBreite, raumTiefe, tageszeit) {
  const {
    sonnenhoehe, sonneIntensitaet, sonneFarbe, ambientIntensitaet,
    himmelIntensitaet, himmelFarbe, hemisphereIntensitaet,
  } = tageslichtWerte(tageszeit)

  const ambientLight = new THREE.AmbientLight(sonneFarbe, ambientIntensitaet)
  scene.add(ambientLight)

  // Schatten-Frustum an die tatsächliche Raumgröße anpassen (statt fixer ±10 Einheiten) –
  // so bleibt die Schattenkarte bei kleinen Räumen scharf und bei großen Räumen vollständig
  const schattenReichweite = Math.max(raumBreite, raumTiefe) / 2 + 2

  // Sonnenhöhe (0 = Horizont, 1 = Zenit) hebt die Lichtquelle zusätzlich an — bei niedrigem
  // Stand (Morgen/Abend) kommt das Licht dadurch flacher herein, wie bei echtem Streiflicht.
  const sunLight = new THREE.DirectionalLight(sonneFarbe, sonneIntensitaet)
  sunLight.position.set(raumBreite * 0.8, 2 + sonnenhoehe * 8, raumTiefe * 0.8)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 4096
  sunLight.shadow.mapSize.height = 4096
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = schattenReichweite * 2 + 20
  sunLight.shadow.camera.left = -schattenReichweite
  sunLight.shadow.camera.right = schattenReichweite
  sunLight.shadow.camera.top = schattenReichweite
  sunLight.shadow.camera.bottom = -schattenReichweite
  sunLight.shadow.bias = -0.001
  sunLight.shadow.radius = 4
  sunLight.shadow.camera.updateProjectionMatrix()
  scene.add(sunLight)

  const windowLight = new THREE.DirectionalLight(himmelFarbe, himmelIntensitaet)
  windowLight.position.set(-raumBreite, 4, 0)
  scene.add(windowLight)

  const fillLight = new THREE.HemisphereLight(0xffffff, 0xC8A97A, hemisphereIntensitaet)
  scene.add(fillLight)

  // Rückgabe der erzeugten Lichter (App schneller machen, Schritt 3, Teilpunkt 2): RoomView3D.jsx
  // merkt sich diese in einer Ref, damit aktualisiereBeleuchtung() unten sie bei einer
  // Tageszeit-Änderung direkt anpassen kann, ohne dass die komplette Szene neu gebaut wird.
  return { ambientLight, sunLight, windowLight, fillLight }
}

// Passt die Werte bereits vorhandener Lichter an eine neue Tageszeit an, OHNE neue Lichtobjekte
// zu erzeugen (App schneller machen, Schritt 3, Teilpunkt 2 — Schnellpfad für den Tageszeit-Regler,
// der bisher über baueBeleuchtung() einen kompletten Szenen-Neuaufbau ausgelöst hat). `lichter` ist
// das von baueBeleuchtung() zurückgegebene Objekt.
export function aktualisiereBeleuchtung(lichter, tageszeit) {
  const {
    sonnenhoehe, sonneIntensitaet, sonneFarbe, ambientIntensitaet,
    himmelIntensitaet, himmelFarbe, hemisphereIntensitaet,
  } = tageslichtWerte(tageszeit)
  const { ambientLight, sunLight, windowLight, fillLight } = lichter

  ambientLight.color.copy(sonneFarbe)
  ambientLight.intensity = ambientIntensitaet

  sunLight.color.copy(sonneFarbe)
  sunLight.intensity = sonneIntensitaet
  // Nur die Höhe folgt dem Sonnenstand (siehe baueBeleuchtung oben) — x/z hängen von der
  // Raumgröße ab und bleiben hier unangetastet.
  sunLight.position.y = 2 + sonnenhoehe * 8

  windowLight.color.copy(himmelFarbe)
  windowLight.intensity = himmelIntensitaet

  fillLight.intensity = hemisphereIntensitaet
}
