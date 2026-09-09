import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { erzeugeHolzTextur, erzeugeStoffTextur, erzeugeBodenTextur, erzeugeUmgebungsTextur, erzeugeWandTextur } from './texturen'
import { baueTrennwaende } from './scene/trennwaende'
import { baueWandElement } from './scene/wandelemente'
import { baueMoebel } from './scene/moebel'
import { ladeModelle } from './scene/modelle'
import { baueBeleuchtung } from './scene/beleuchtung'
import { rechteckPolygon, boundingBox, wandSegmente, punktInPolygon, versetztesPolygon, punktSicherImPolygon } from './raumPolygon'
import { useRooms } from './context/RoomsContext'
import { useFurniture } from './context/FurnitureContext'
import { useDesign } from './context/DesignContext'

export default function RoomView3D({ fokusWand = null, onWandElementBewegt } = {}) {
  const { activeRoom: room } = useRooms()
  const { furniture } = useFurniture()
  const { fussleiste, fussleisteFarbe, raumHoehe, tageszeit } = useDesign()
  const mountRef = useRef(null)

  // Kameramodus + Rundgang-Position leben unabhängig vom schweren Szenen-Effekt unten (der bei
  // jeder room/furniture/... Änderung die komplette Szene neu aufbaut) — ein Moduswechsel per
  // Button soll keinen Neuaufbau auslösen. kameraModusRef ist die von den Event-Handlern im
  // Effekt gelesene "Quelle der Wahrheit", kameraModus (State) dient nur der Button-Optik.
  const kameraModusRef = useRef('rundumblick')
  const [kameraModus, setKameraModus] = useState('rundumblick')
  const rundgangRef = useRef(null)
  const updateCameraRef = useRef(() => {})

  // Ausgewähltes Fenster/Tür-Element im Wand-Fokus-Modus + Live-Anzeige seiner Position beim
  // Ziehen. Lebt außerhalb des schweren Szenen-Effekts (wie kameraModus oben) — Auswählen/Ziehen
  // darf keinen kompletten Neuaufbau der Szene auslösen. ausgewaehltesElementRef ist die von den
  // Maus-Handlern im Effekt gelesene Quelle der Wahrheit; sie fließt aktuell nirgends ins Rendern
  // ein, deshalb reicht dafür ein reiner Ref ohne begleitenden State.
  const ausgewaehltesElementRef = useRef(null)
  const setAusgewaehltesElement = (id) => { ausgewaehltesElementRef.current = id }
  const [liveWerte, setLiveWerte] = useState(null) // { typ, horizontalCm, vertikalCm } | null

  // Analog zu kameraModusRef: ein reiner Wand-Wechsel soll NUR die Kamera neu positionieren,
  // nicht die komplette Szene neu aufbauen (siehe waehleKameraModus-Pattern weiter unten). Setzt
  // hier zugleich die Fenster/Tür-Auswahl zurück (reine Ref-Mutation, kein setState — deshalb als
  // Teil dieses Effects unproblematisch).
  const fokusWandRef = useRef(fokusWand)
  useEffect(() => {
    fokusWandRef.current = fokusWand
    ausgewaehltesElementRef.current = null
    updateCameraRef.current?.()
  }, [fokusWand])

  // Wandwechsel (Mini-Karte) oder Verlassen des Wand-Fokus-Modus: Live-Anzeige zurücksetzen.
  // Direkt beim Rendern verglichen (React-empfohlenes Muster fürs Zurücksetzen von State bei
  // einer Prop-Änderung, siehe react.dev "You Might Not Need an Effect") — vermeidet den
  // zusätzlichen Render-Zyklus/Lint-Fehler eines setState-in-Effect.
  const letzterFokusWandRef = useRef(fokusWand)
  if (letzterFokusWandRef.current !== fokusWand) {
    letzterFokusWandRef.current = fokusWand
    if (liveWerte !== null) setLiveWerte(null)
  }

  // Lädt die echten 3D-Modelle (siehe scene/modelle.js) einmalig beim ersten Mount. Sobald fertig,
  // triggert modelleBereit unten einen Neuaufbau der Szene, damit die Modelle auch dann erscheinen,
  // wenn sie beim allerersten Rendern noch nicht rechtzeitig fertig geladen waren.
  const [modelleBereit, setModelleBereit] = useState(false)
  useEffect(() => {
    ladeModelle().then(() => setModelleBereit(true))
  }, [])

  const waehleKameraModus = (modus) => {
    if (modus === kameraModusRef.current) return
    kameraModusRef.current = modus
    setKameraModus(modus)
    updateCameraRef.current()
  }

  useEffect(() => {
    const mount = mountRef.current
    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#F5F4F0')
    scene.fog = new THREE.Fog('#F5F4F0', 20, 40)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(8, 10, 12)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.VSMShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const wandHoehe = raumHoehe || 2.5
    const eckpunkte = room?.eckpunkte || rechteckPolygon(room?.breite || 6, room?.tiefe || 5)
    // Breite/Tiefe und der 3D-Nullpunkt (Raummitte) kommen aus der Bounding-Box der Eckpunkte,
    // nicht mehr aus room.breite/tiefe direkt — für ein Rechteck deckungsgleich, aber robust
    // falls diese Felder bei einer L-Form (Schritt 9) nicht mehr die tatsächliche Ausdehnung
    // abbilden. wandelemente.js/trennwaende.js bekommen raumBreite/raumTiefe weiterhin als
    // Parameter durchgereicht und bleiben unverändert, da mitteX/mitteZ für Rechtecke exakt
    // raumBreite/2, raumTiefe/2 entsprechen.
    const box = boundingBox(eckpunkte)
    const raumBreite = box.breite
    const raumTiefe = box.tiefe
    const mitteX = box.minX + raumBreite / 2
    const mitteZ = box.minY + raumTiefe / 2

    // === TEXTUREN (einmal pro Szene erzeugt, mehrfach verwendet) ===
    const holzTextur = erzeugeHolzTextur()
    const stoffTextur = erzeugeStoffTextur()
    // wandTextur wird jetzt pro Wand einzeln über wandTexturFuer() erzeugt (siehe unten), da
    // jede Wand ihr eigenes Material haben kann.
    scene.environment = erzeugeUmgebungsTextur()

    // === BELEUCHTUNG ===
    baueBeleuchtung(scene, eckpunkte, mitteX, mitteZ, raumBreite, raumTiefe, wandHoehe, tageszeit)

    // === BODEN & DECKE (aus dem Randpolygon, statt fester Rechteck-Ebenen) ===
    // THREE.Shape mit ShapeGeometry statt ExtrudeGeometry: Boden/Decke bleiben masselose
    // Flächen (keine Dicke), ShapeGeometry trianguliert per Ear-Clipping — das behandelt
    // konkave Ränder (L-/U-Form) automatisch korrekt, ohne Sonderfall.
    // Die Punkte werden mit gespiegeltem Y aufgebaut (mitteZ - p.y statt p.y - mitteZ): nur so
    // ergibt die anschließende Rotation um X dieselbe nach oben zeigende Normale wie die
    // bisherige PlaneGeometry (siehe Analyse Schritt 7). UV-Koordinaten normalisiert
    // ShapeGeometry automatisch auf die Bounding-Box der Form — für ein Rechteck deckungsgleich
    // mit PlaneGeometry, texture.repeat in erzeugeBodenTextur bleibt unverändert korrekt.
    const flaechenShape = new THREE.Shape(eckpunkte.map(p => new THREE.Vector2(p.x - mitteX, mitteZ - p.y)))
    const flaechenGeo = new THREE.ShapeGeometry(flaechenShape)

    const bodenMat = new THREE.MeshStandardMaterial({ map: erzeugeBodenTextur(room?.boden, raumBreite, raumTiefe), roughness: 0.8, metalness: 0.0 })
    const boden = new THREE.Mesh(flaechenGeo, bodenMat)
    boden.rotation.x = -Math.PI / 2
    boden.receiveShadow = true
    scene.add(boden)

    // Dieselbe Rotation wie boden, nicht ihr Gegenstück (+90°): eine Drehung um die X-Achse
    // spiegelt bei entgegengesetztem Vorzeichen zusätzlich die Z-Koordinate der Kontur (bei
    // -90° wird Punkt.y zu +Z, bei +90° zu -Z) — für ein zum Mittelpunkt symmetrisches Rechteck
    // unsichtbar, bei einer L-/U-Form landet die Decke dadurch spiegelverkehrt über der
    // Aussparung statt über der echten Bodenfläche. decke braucht die entgegengesetzte
    // Blickrichtung nicht durch eine eigene Rotation, weil ihr Material bereits DoubleSide ist —
    // Three.js beleuchtet die von unten sichtbare Rückseite dann automatisch korrekt.
    const deckeMat = new THREE.MeshStandardMaterial({ color: '#F0EDE8', roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide, transparent: true, opacity: 1 })
    const decke = new THREE.Mesh(flaechenGeo, deckeMat)
    decke.rotation.x = -Math.PI / 2
    decke.position.y = wandHoehe
    scene.add(decke)

    // === WÄNDE (eine je Wandsegment, Transparenz wird dynamisch gesetzt, jede Wand einzeln
    // einfärbbar) ===
    // Wandfarbe: room.wandfarben ist seit Schritt 9a nach Segmentindex geschlüsselt (statt nach
    // Himmelsrichtung) — funktioniert damit für jede Segmentanzahl/-form, nicht nur für die vier
    // festen Rechteckwände.
    const wandFarbeFuer = (index) => room?.wandfarben?.[index] || room?.wandfarbe || '#FFFFFF'
    const wandMaterialFuer = (index) => room?.wandmaterialien?.[index] || room?.wandmaterial || 'wand-putz'
    // Textur pro tatsächlich verwendetem Material erzeugen und zwischenspeichern (Map), statt pro
    // Wand neu — teilen sich z.B. 3 von 4 Wänden weiterhin Putz, entsteht dafür nur eine einzige
    // Textur-Instanz statt drei identischer.
    const wandTexturCache = new Map()
    const wandTexturFuer = (material) => {
      if (!wandTexturCache.has(material)) wandTexturCache.set(material, erzeugeWandTextur(material))
      return wandTexturCache.get(material)
    }
    // map + color: MeshStandardMaterial multipliziert beide miteinander, die Musterstruktur bleibt
    // dadurch mit jeder der 27 Wandfarben einfärbbar, ohne dass die Farbwahl selbst hier angefasst
    // werden muss.
    const wandMatFuer = (index) => new THREE.MeshStandardMaterial({ color: wandFarbeFuer(index), map: wandTexturFuer(wandMaterialFuer(index)), roughness: 0.9, metalness: 0.0, transparent: true, opacity: 1 })

    const segmente = wandSegmente(eckpunkte)
    // Für updateCamera unten: pro Wand Mesh + 3D-Normale (2D-Normale direkt auf X/Z übernommen,
    // wie schon bei allen anderen Konvertierungen in dieser Datei/trennwaende.js/wandelemente.js).
    const wandMeshe = segmente.map(segment => {
      const x1 = segment.start.x - mitteX, z1 = segment.start.y - mitteZ
      const x2 = segment.ende.x - mitteX, z2 = segment.ende.y - mitteZ
      const wandGeo = new THREE.PlaneGeometry(segment.laenge, wandHoehe)
      const wand = new THREE.Mesh(wandGeo, wandMatFuer(segment.index))
      wand.position.set((x1 + x2) / 2, wandHoehe / 2, (z1 + z2) / 2)
      wand.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
      wand.receiveShadow = true
      scene.add(wand)
      return {
        mesh: wand, normale: { x: segment.normale.x, z: segment.normale.y }, laenge: segment.laenge,
        x1, z1, dx: x2 - x1, dz: z2 - z1,
      }
    })

    // Sockelleisten — eine Leiste je Wandsegment, volle Segmentlänge, nach innen versetzt um die
    // halbe Dicke entlang der Segment-Normale (ersetzt die 4 festen ±0.02-Offsets). An Außenecken
    // überlappen sich zwei Leisten geringfügig, wie schon bei den bisherigen 4 Leisten — siehe
    // Notiz zu einspringenden Ecken für Schritt 9.
    if (fussleiste) {
      const sockelMat = new THREE.MeshLambertMaterial({ color: fussleisteFarbe || '#E0DDD8' })
      segmente.forEach(segment => {
        const x1 = segment.start.x - mitteX, z1 = segment.start.y - mitteZ
        const x2 = segment.ende.x - mitteX, z2 = segment.ende.y - mitteZ
        const sockel = new THREE.Mesh(new THREE.BoxGeometry(segment.laenge, 0.08, 0.04), sockelMat)
        sockel.position.set(
          (x1 + x2) / 2 - segment.normale.x * 0.02,
          0.04,
          (z1 + z2) / 2 - segment.normale.y * 0.02,
        )
        sockel.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
        scene.add(sockel)
      })
    }

    // === TRENNWÄNDE, WANDELEMENTE & MÖBEL ===
    baueTrennwaende(scene, room, raumBreite, raumTiefe, wandHoehe)

    // Referenz auf jede gebaute Fenster/Tür-Gruppe + ihr furniture-Item — Grundlage fürs
    // Anklicken/Ziehen im Wand-Fokus-Modus weiter unten.
    const wandElementGruppen = []
    furniture.forEach(item => {
      if (item.istWandElement) {
        const gruppe = baueWandElement(scene, item, raumBreite, raumTiefe, wandHoehe, eckpunkte, holzTextur)
        wandElementGruppen.push({ gruppe, item })
      } else {
        baueMoebel(scene, item, furniture, raumBreite, raumTiefe, wandHoehe, stoffTextur, holzTextur)
      }
    })

    // === KAMERA STEUERUNG ===
    // Zwei Modi: "rundumblick" (bestehende Orbit-Kamera, Standard) und "rundgang" (freie Kamera
    // auf Augenhöhe). Der aktuelle Modus wird bei jedem Handler-Aufruf frisch aus kameraModusRef
    // gelesen (siehe Komponentenkopf) statt hier als Dependency zu landen — ein Moduswechsel per
    // Button darf keinen Neuaufbau dieses (teuren) Effekts auslösen.
    const AUGENHOEHE = 1.65
    const RUNDGANG_SICHERHEITSABSTAND = 0.3
    const PITCH_LIMIT = 1.4

    // Nach innen versetztes Polygon als Lauf-Grenze (Sicherheitsabstand zu den Wänden). Kann bei
    // einem zu schmalen L-/U-Form-Schenkel werfen (siehe versetztesPolygon) — dann ohne
    // Sicherheitsabstand gegen die reine Raumkontur prüfen, statt das Laufen ganz zu blockieren.
    let sicherheitsPolygon = eckpunkte
    try {
      sicherheitsPolygon = versetztesPolygon(eckpunkte, RUNDGANG_SICHERHEITSABSTAND)
    } catch {
      sicherheitsPolygon = eckpunkte
    }

    // Startpunkt für den Rundgang-Modus: derselbe "garantiert im Raum liegende Punkt" wie bei der
    // Default-Möbelplatzierung (punktSicherImPolygon), Blickrichtung von dort zum 3D-Ursprung
    // (Raummitte der Bounding-Box).
    const berechneRundgangStart = () => {
      const punkt = punktSicherImPolygon(eckpunkte)
      const startX = punkt.x - mitteX
      const startZ = mitteZ - punkt.y
      const laenge = Math.hypot(startX, startZ) || 1
      const yaw = Math.atan2(-startX / laenge, -startZ / laenge)
      return { x: startX, z: startZ, yaw, pitch: 0 }
    }

    // rundgangRef lebt außerhalb dieses Effekts (siehe Komponentenkopf) und überlebt damit einen
    // Szenen-Neuaufbau (room/furniture-Änderung während eines laufenden Rundgangs). Nur wenn die
    // gespeicherte Position in der (evtl. neuen) Raumform nicht mehr gültig ist, neu berechnen.
    if (!rundgangRef.current) {
      rundgangRef.current = berechneRundgangStart()
    } else {
      const raumPunktAktuell = { x: rundgangRef.current.x + mitteX, y: mitteZ - rundgangRef.current.z }
      if (!punktInPolygon(raumPunktAktuell, sicherheitsPolygon)) {
        Object.assign(rundgangRef.current, berechneRundgangStart())
      }
    }
    const rundgang = rundgangRef.current

    let isDragging = false
    let previousMouse = { x: 0, y: 0 }
    let spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 18 }

    const updateOrbitCamera = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta)
      camera.position.y = spherical.radius * Math.cos(spherical.phi)
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta)
      camera.lookAt(0, 0, 0)

      // Decke ausblenden wenn Kamera von oben schaut (phi < 30°)
      const phiGrad = spherical.phi * 180 / Math.PI
      decke.material.opacity = phiGrad < 30 ? Math.max(0, phiGrad / 30) : 1
      decke.material.transparent = phiGrad < 30

      // Wände dynamisch ein/ausblenden je nach Kameraposition: eine Wand wird ausgeblendet,
      // sobald ihre nach außen zeigende Normale zur Kamera zeigt (Kamera steht "vor" ihrer
      // Außenseite). Für ein Rechteck reduziert sich das exakt auf die bisherigen 4 Sonderfälle
      // camX/camZ ></< 0 — siehe Analyse Schritt 7 zu Innenecken (dieselbe Vereinfachung wie
      // heute schon bei einer Diagonalansicht, keine echte Verdeckungsberechnung).
      wandMeshe.forEach(({ mesh, normale }) => {
        const versteckt = camera.position.x * normale.x + camera.position.z * normale.z > 0
        mesh.material.opacity = versteckt ? 0 : 1
        mesh.material.transparent = versteckt
      })
    }

    // Kamera steht innerhalb des Raums — die Ausblend-Logik der Orbit-Kamera (für eine Kamera
    // außerhalb des Raums gedacht) passt hier nicht: Wände und Decke bleiben immer voll sichtbar.
    const updateRundgangCamera = () => {
      camera.position.set(rundgang.x, AUGENHOEHE, rundgang.z)
      const zielX = rundgang.x + Math.sin(rundgang.yaw) * Math.cos(rundgang.pitch)
      const zielY = AUGENHOEHE + Math.sin(rundgang.pitch)
      const zielZ = rundgang.z + Math.cos(rundgang.yaw) * Math.cos(rundgang.pitch)
      camera.lookAt(zielX, zielY, zielZ)

      decke.material.opacity = 1
      decke.material.transparent = false
      wandMeshe.forEach(({ mesh }) => {
        mesh.material.opacity = 1
        mesh.material.transparent = false
      })
    }

    // Berechnet Kamera-Zielposition + Blickpunkt exakt senkrecht mittig vor einer Wand (klassisches
    // "Objekt in Frustum einpassen", primär an der Wandhöhe ausgerichtet — siehe MAX_BREITEN_AUFSCHLAG
    // unten). Reine Zielberechnung, keine Kamerabewegung selbst — die übernimmt updateWandFokusCamera
    // weiter unten (harter Sprung oder weicher Schwenk bei einem echten Wandwechsel).
    const berechneWandFokusZiel = (index) => {
      const eintrag = wandMeshe[index]
      if (!eintrag) return null
      const { mesh, normale, laenge } = eintrag
      const fovY = camera.fov * Math.PI / 180
      const fovX = 2 * Math.atan(Math.tan(fovY / 2) * camera.aspect)
      const RAND_FAKTOR = 1.2
      const hoehenFitDistanz = (wandHoehe / 2) / Math.tan(fovY / 2)
      const breitenFitDistanz = (laenge / 2) / Math.tan(fovX / 2)
      // Bei den meisten Räumen ist eine Wand deutlich breiter als hoch — reines "ganze Wand ins
      // Bild einpassen" würde dann von der Breite dominiert, die Kamera müsste so weit zurück,
      // dass oben/unten ein großer leerer Decken-/Boden-Streifen sichtbar wird (siehe Hassans
      // Screenshot-Feedback). Deshalb primär an der Wandhöhe ausrichten und die Distanz nur noch
      // begrenzt in Richtung Breiten-Fit erweitern (max. 35% mehr als der reine Höhen-Fit) — bei
      // sehr breiten Wänden ist dadurch nicht mehr zwingend die komplette Breite im Bild, dafür
      // füllt die Wand den Ausschnitt vertikal wie gewünscht. Bei normalen/schmalen Wänden (Höhen-
      // Fit ohnehin schon der größere Wert) ändert sich nichts.
      const MAX_BREITEN_AUFSCHLAG = 1.35
      const gewuenschteDistanz = Math.min(
        Math.max(hoehenFitDistanz, breitenFitDistanz),
        hoehenFitDistanz * MAX_BREITEN_AUFSCHLAG,
      ) * RAND_FAKTOR
      // Kamera darf nie so weit zurück, dass sie über die gegenüberliegende Seite des Raums
      // hinausgeht (sonst landet sie fast auf/hinter der gegenüberliegenden Wand — sichtbar als
      // extrem verzerrte Seitenwände und ein von hinten durchscheinendes Fenster/Tür dort, siehe
      // Bug-Report). Alle Wände in den bisher unterstützten Raumformen (Rechteck/L/U) sind
      // achsparallel, die Normale zeigt also rein in X- oder rein in Z-Richtung — die verfügbare
      // Tiefe in Blickrichtung entspricht deshalb der Bounding-Box-Ausdehnung der jeweils anderen
      // Achse (raumBreite bei einer Ost/West-Normale, raumTiefe bei einer Nord/Süd-Normale).
      const raumTiefeInRichtung = Math.abs(normale.x) > Math.abs(normale.z) ? raumBreite : raumTiefe
      const SICHERHEITSABSTAND = 0.4
      const maxDistanz = Math.max(0.3, raumTiefeInRichtung - SICHERHEITSABSTAND)
      const distanz = Math.min(gewuenschteDistanz, maxDistanz)
      return {
        x: mesh.position.x - normale.x * distanz,
        z: mesh.position.z - normale.z * distanz,
        zielX: mesh.position.x,
        zielZ: mesh.position.z,
      }
    }

    // Zustand für den weichen Wandwechsel — lebt als normale Variable im Effekt-Scope (wie
    // laufAnimation weiter unten für den Rundgang-Modus), nicht als React-State: soll bei jedem
    // Frame ohne Re-Render aktualisiert werden.
    const WAND_WECHSEL_DAUER = 550
    let wandFokusAnimation = null // { startPos:{x,z}, startZiel:{x,z}, endPos:{x,z}, endZiel:{x,z}, startZeit }
    let letzterFokusWand = fokusWandRef.current
    let letztesFokusZiel = null

    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

    // Interpoliert zwei Punkte auf einer Kreisbahn um den Ursprung (= Raummittelpunkt in den
    // lokalen Koordinaten dieser Datei) statt geradlinig — dadurch wirkt die Kamerabewegung wie
    // ein Schwenk/Drehen im Raum statt einer geraden Fahrt quer durch den Raum.
    const lerpUmUrsprung = (start, end, t) => {
      const r0 = Math.hypot(start.x, start.z), r1 = Math.hypot(end.x, end.z)
      const a0 = Math.atan2(start.z, start.x), a1 = Math.atan2(end.z, end.x)
      let diff = a1 - a0
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      const a = a0 + diff * t
      const r = r0 + (r1 - r0) * t
      return { x: Math.cos(a) * r, z: Math.sin(a) * r }
    }

    const setzeWandFokusKamera = (pos, ziel) => {
      camera.position.set(pos.x, wandHoehe / 2, pos.z)
      camera.lookAt(ziel.x, wandHoehe / 2, ziel.z)
      // Im Wand-Fokus-Modus sollen Decke/Wände immer voll sichtbar sein (kein Ausblenden wie beim
      // freien Rundumblick, wo die Kamerawinkel-abhängige Transparenz Durchblicke ermöglicht).
      decke.material.opacity = 1
      decke.material.transparent = false
      wandMeshe.forEach(({ mesh }) => { mesh.material.opacity = 1; mesh.material.transparent = false })
    }

    const updateWandFokusCamera = (index) => {
      const ziel = berechneWandFokusZiel(index)
      if (!ziel) return
      const endPos = { x: ziel.x, z: ziel.z }
      const endZiel = { x: ziel.zielX, z: ziel.zielZ }
      if (letzterFokusWand !== null && letzterFokusWand !== index) {
        wandFokusAnimation = {
          startPos: { x: camera.position.x, z: camera.position.z },
          startZiel: letztesFokusZiel || endZiel,
          endPos, endZiel,
          startZeit: performance.now(),
        }
      } else {
        setzeWandFokusKamera(endPos, endZiel)
      }
      letztesFokusZiel = endZiel
      letzterFokusWand = index
    }

    const updateCamera = () => {
      if (fokusWandRef.current != null) { updateWandFokusCamera(fokusWandRef.current); return }
      if (kameraModusRef.current === 'rundgang') updateRundgangCamera()
      else updateOrbitCamera()
    }
    updateCamera()
    updateCameraRef.current = updateCamera

    // Boden + Wände als gemeinsame Raycast-Ziele fürs Laufen: trifft der Klick-Strahl zuerst eine
    // Wand statt den Boden, wurde auf/durch eine Wand geklickt — kein Laufbefehl, sonst könnte die
    // Kamera durch eine Wand "hindurchlaufen" (siehe versucheLaufenZu).
    const laufZiele = [boden, ...wandMeshe.map(w => w.mesh)]
    const raycaster = new THREE.Raycaster()
    const zeigerNDC = new THREE.Vector2()

    let laufAnimation = null // { startX, startZ, zielX, zielZ, startZeit, dauer }
    const easeOut = (t) => 1 - Math.pow(1 - t, 3)

    const versucheLaufenZu = (clientX, clientY) => {
      const rect = mount.getBoundingClientRect()
      zeigerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
      zeigerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(zeigerNDC, camera)
      const treffer = raycaster.intersectObjects(laufZiele, false)
      if (treffer.length === 0 || treffer[0].object !== boden) return
      const punkt = treffer[0].point
      const raumPunkt = { x: punkt.x + mitteX, y: mitteZ - punkt.z }
      if (!punktInPolygon(raumPunkt, sicherheitsPolygon)) return
      laufAnimation = { startX: rundgang.x, startZ: rundgang.z, zielX: punkt.x, zielZ: punkt.z, startZeit: performance.now(), dauer: 700 }
    }

    // Klick/Tap-vs-Drag-Unterscheidung im Rundgang-Modus (analog zum Muster aus Kartenanwendungen):
    // kaum Bewegung + kurze Zeit zwischen Down- und Up-Event = Laufbefehl, sonst nur Umsehen.
    const KLICK_MAX_BEWEGUNG_PX = 6
    const KLICK_MAX_DAUER_MS = 400
    let rundgangZeiger = null // { startX, startY, letzteX, letzteY, bewegung, startZeit }

    // === FENSTER/TÜR ANKLICKEN + ZIEHEN (nur im Wand-Fokus-Modus) ===
    // Reine Positions-Mutation direkt am Three.js-Objekt während des Ziehens — KEIN
    // updateFurniture pro Mousemove, das würde `furniture` ändern und dadurch diesen kompletten
    // (teuren) Szenen-Aufbau-Effekt bei jeder Mausbewegung erneut auslösen (siehe Dependency-Array
    // ganz unten). Committed wird erst einmalig beim Loslassen über onWandElementBewegt.
    // FENSTER_HOEHE_3D/TUER_HOEHE_3D müssen mit FENSTER_HOEHE/TUER_HOEHE aus wandelemente.js
    // übereinstimmen (dort nicht exportiert, deshalb hier separat dupliziert).
    const FENSTER_HOEHE_3D = 1.2
    const TUER_HOEHE_3D = 2.1

    const wandElementRaycastZiele = wandElementGruppen.map(w => w.gruppe)
    let wandElementDrag = null // { eintrag, segment, elBreite, elHoehe, offsetU, offsetV, bewegt }

    const ebeneFuerSegment = (segmentIndex) => {
      const w = wandMeshe[segmentIndex]
      if (!w) return null
      const normale3 = new THREE.Vector3(w.normale.x, 0, w.normale.z)
      return new THREE.Plane().setFromNormalAndCoplanarPoint(normale3, w.mesh.position)
    }

    // Weltpunkt auf der Wandebene -> {u, v}: u = Meter ab Segmentanfang entlang der Wand
    // (dieselbe Konvention wie wandPosition/platziereAufSegment in raumPolygon.js), v = Meter
    // über dem Boden (= Welt-Y, alle Wände stehen senkrecht).
    const weltpunktZuUV = (punkt, w) => ({
      u: ((punkt.x - w.x1) * w.dx + (punkt.z - w.z1) * w.dz) / (w.laenge || 1),
      v: punkt.y,
    })

    const zeigerAufWeltpunkt = (clientX, clientY, ebene) => {
      const rect = mount.getBoundingClientRect()
      zeigerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
      zeigerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(zeigerNDC, camera)
      const schnitt = new THREE.Vector3()
      return raycaster.ray.intersectPlane(ebene, schnitt) ? schnitt : null
    }

    const meldeLiveWerte = (item, segment, gruppe, elBreite) => {
      const mitteU = ((gruppe.position.x - segment.x1) * segment.dx + (gruppe.position.z - segment.z1) * segment.dz) / (segment.laenge || 1)
      setLiveWerte({
        typ: item.typ,
        horizontalCm: Math.round((mitteU - elBreite / 2) * 100),
        vertikalCm: item.typ === 'fenster' ? Math.round(gruppe.position.y * 100) : null,
      })
    }

    const wandElementMausDown = (clientX, clientY) => {
      if (wandFokusAnimation) return
      const rect = mount.getBoundingClientRect()
      zeigerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
      zeigerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(zeigerNDC, camera)
      const treffer = raycaster.intersectObjects(wandElementRaycastZiele, true)
      if (treffer.length === 0) { setAusgewaehltesElement(null); setLiveWerte(null); return }
      let obj = treffer[0].object
      while (obj && !obj.userData?.wandElementId) obj = obj.parent
      const eintrag = wandElementGruppen.find(w => w.item.id === obj?.userData?.wandElementId)
      if (!eintrag) return
      const segment = wandMeshe[eintrag.item.wandSegment]
      const ebene = ebeneFuerSegment(eintrag.item.wandSegment)
      if (!segment || !ebene) return
      const schnitt = zeigerAufWeltpunkt(clientX, clientY, ebene)
      if (!schnitt) return
      const { u, v } = weltpunktZuUV(schnitt, segment)
      const elBreite = eintrag.item.width / 60
      const elHoehe = eintrag.item.typ === 'fenster' ? FENSTER_HOEHE_3D : TUER_HOEHE_3D
      const mitteUAktuell = ((eintrag.gruppe.position.x - segment.x1) * segment.dx + (eintrag.gruppe.position.z - segment.z1) * segment.dz) / (segment.laenge || 1)
      wandElementDrag = {
        eintrag, segment, elBreite, elHoehe,
        offsetU: mitteUAktuell - u,
        offsetV: eintrag.gruppe.position.y - v,
        bewegt: false,
      }
      setAusgewaehltesElement(eintrag.item.id)
      meldeLiveWerte(eintrag.item, segment, eintrag.gruppe, elBreite)
    }

    const wandElementMausMove = (clientX, clientY) => {
      if (!wandElementDrag) return
      const { eintrag, segment, elBreite, elHoehe, offsetU, offsetV } = wandElementDrag
      const ebene = ebeneFuerSegment(eintrag.item.wandSegment)
      const schnitt = zeigerAufWeltpunkt(clientX, clientY, ebene)
      if (!schnitt) return
      const { u, v } = weltpunktZuUV(schnitt, segment)
      const mitteU = Math.max(elBreite / 2, Math.min(segment.laenge - elBreite / 2, u + offsetU))
      const px = segment.x1 + segment.dx * (mitteU / segment.laenge)
      const pz = segment.z1 + segment.dz * (mitteU / segment.laenge)
      let neueY = eintrag.gruppe.position.y
      if (eintrag.item.typ === 'fenster') {
        neueY = Math.max(0, Math.min(wandHoehe - elHoehe, v + offsetV))
      }
      eintrag.gruppe.position.set(px, neueY, pz)
      wandElementDrag.bewegt = true
      meldeLiveWerte(eintrag.item, segment, eintrag.gruppe, elBreite)
    }

    const wandElementMausUp = () => {
      if (!wandElementDrag) return
      const { eintrag, segment, elBreite } = wandElementDrag
      if (wandElementDrag.bewegt) {
        const mitteU = ((eintrag.gruppe.position.x - segment.x1) * segment.dx + (eintrag.gruppe.position.z - segment.z1) * segment.dz) / (segment.laenge || 1)
        const patch = { wandPosition: mitteU - elBreite / 2 }
        if (eintrag.item.typ === 'fenster') patch.bruestungshoehe = eintrag.gruppe.position.y
        onWandElementBewegt?.(eintrag.item.id, patch)
      }
      wandElementDrag = null
    }

    const onMouseDown = (e) => {
      if (fokusWandRef.current != null) { wandElementMausDown(e.clientX, e.clientY); return }
      if (kameraModusRef.current === 'rundgang') {
        rundgangZeiger = { startX: e.clientX, startY: e.clientY, letzteX: e.clientX, letzteY: e.clientY, bewegung: 0, startZeit: performance.now() }
        return
      }
      isDragging = true
      previousMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => {
      if (fokusWandRef.current != null) { wandElementMausUp(); return }
      if (kameraModusRef.current === 'rundgang') {
        if (rundgangZeiger) {
          const dauer = performance.now() - rundgangZeiger.startZeit
          if (rundgangZeiger.bewegung < KLICK_MAX_BEWEGUNG_PX && dauer < KLICK_MAX_DAUER_MS) {
            versucheLaufenZu(rundgangZeiger.startX, rundgangZeiger.startY)
          }
        }
        rundgangZeiger = null
        return
      }
      isDragging = false
    }
    const onMouseMove = (e) => {
      if (fokusWandRef.current != null) { wandElementMausMove(e.clientX, e.clientY); return }
      if (kameraModusRef.current === 'rundgang') {
        if (!rundgangZeiger) return
        const dx = e.clientX - rundgangZeiger.letzteX
        const dy = e.clientY - rundgangZeiger.letzteY
        rundgangZeiger.bewegung += Math.abs(dx) + Math.abs(dy)
        rundgang.yaw -= dx * 0.01
        rundgang.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, rundgang.pitch - dy * 0.01))
        rundgangZeiger.letzteX = e.clientX
        rundgangZeiger.letzteY = e.clientY
        updateCamera()
        return
      }
      if (!isDragging) return
      const dx = e.clientX - previousMouse.x
      const dy = e.clientY - previousMouse.y
      spherical.theta -= dx * 0.01
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.2, spherical.phi + dy * 0.01))
      previousMouse = { x: e.clientX, y: e.clientY }
      updateCamera()
    }
    const onWheel = (e) => {
      if (fokusWandRef.current != null) return
      if (kameraModusRef.current === 'rundgang') return
      spherical.radius = Math.max(4, Math.min(30, spherical.radius + e.deltaY * 0.05))
      updateCamera()
    }

    let lastTouch = null
    const onTouchStart = (e) => {
      if (fokusWandRef.current != null) { wandElementMausDown(e.touches[0].clientX, e.touches[0].clientY); return }
      if (kameraModusRef.current === 'rundgang') {
        const t = e.touches[0]
        rundgangZeiger = { startX: t.clientX, startY: t.clientY, letzteX: t.clientX, letzteY: t.clientY, bewegung: 0, startZeit: performance.now() }
        return
      }
      lastTouch = e.touches[0]; isDragging = true
    }
    const onTouchMove  = (e) => {
      if (fokusWandRef.current != null) { wandElementMausMove(e.touches[0].clientX, e.touches[0].clientY); return }
      if (kameraModusRef.current === 'rundgang') {
        if (!rundgangZeiger) return
        const t = e.touches[0]
        const dx = t.clientX - rundgangZeiger.letzteX
        const dy = t.clientY - rundgangZeiger.letzteY
        rundgangZeiger.bewegung += Math.abs(dx) + Math.abs(dy)
        rundgang.yaw -= dx * 0.01
        rundgang.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, rundgang.pitch - dy * 0.01))
        rundgangZeiger.letzteX = t.clientX
        rundgangZeiger.letzteY = t.clientY
        updateCamera()
        return
      }
      if (!isDragging || !lastTouch) return
      const dx = e.touches[0].clientX - lastTouch.clientX
      const dy = e.touches[0].clientY - lastTouch.clientY
      spherical.theta -= dx * 0.01
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.2, spherical.phi + dy * 0.01))
      lastTouch = e.touches[0]
      updateCamera()
    }
    const onTouchEnd = () => {
      if (fokusWandRef.current != null) { wandElementMausUp(); return }
      if (kameraModusRef.current === 'rundgang') {
        if (rundgangZeiger) {
          const dauer = performance.now() - rundgangZeiger.startZeit
          if (rundgangZeiger.bewegung < KLICK_MAX_BEWEGUNG_PX && dauer < KLICK_MAX_DAUER_MS) {
            versucheLaufenZu(rundgangZeiger.startX, rundgangZeiger.startY)
          }
        }
        rundgangZeiger = null
        return
      }
      isDragging = false; lastTouch = null
    }

mount.addEventListener('mousedown', onMouseDown)
mount.addEventListener('touchstart', onTouchStart)
mount.addEventListener('touchmove', onTouchMove)
mount.addEventListener('touchend', onTouchEnd)
window.addEventListener('mouseup', onMouseUp)
window.addEventListener('mousemove', onMouseMove)
mount.addEventListener('wheel', onWheel)

// Rendergröße an Container anpassen (Fenster-Resize, Panel ein-/ausblenden, Mobile-Rotation)
const onResize = () => {
  const neueBreite = mount.clientWidth
  const neueHoehe = mount.clientHeight
  if (neueBreite === 0 || neueHoehe === 0) return
  camera.aspect = neueBreite / neueHoehe
  camera.updateProjectionMatrix()
  renderer.setSize(neueBreite, neueHoehe)
}
const resizeObserver = new ResizeObserver(onResize)
resizeObserver.observe(mount)

let frameId
const animate = () => {
  frameId = requestAnimationFrame(animate)
  if (laufAnimation) {
    const t = Math.min(1, (performance.now() - laufAnimation.startZeit) / laufAnimation.dauer)
    const fortschritt = easeOut(t)
    rundgang.x = laufAnimation.startX + (laufAnimation.zielX - laufAnimation.startX) * fortschritt
    rundgang.z = laufAnimation.startZ + (laufAnimation.zielZ - laufAnimation.startZ) * fortschritt
    updateCamera()
    if (t >= 1) laufAnimation = null
  }
  if (wandFokusAnimation) {
    const t = Math.min(1, (performance.now() - wandFokusAnimation.startZeit) / WAND_WECHSEL_DAUER)
    const fortschritt = easeInOut(t)
    const pos = lerpUmUrsprung(wandFokusAnimation.startPos, wandFokusAnimation.endPos, fortschritt)
    const ziel = lerpUmUrsprung(wandFokusAnimation.startZiel, wandFokusAnimation.endZiel, fortschritt)
    setzeWandFokusKamera(pos, ziel)
    if (t >= 1) wandFokusAnimation = null
  }
  renderer.render(scene, camera)
}
animate()

return () => {
  cancelAnimationFrame(frameId)
  mount.removeEventListener('mousedown', onMouseDown)
  mount.removeEventListener('touchstart', onTouchStart)
  mount.removeEventListener('touchmove', onTouchMove)
  mount.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('mousemove', onMouseMove)
  mount.removeEventListener('wheel', onWheel)
  resizeObserver.disconnect()

  // Die baue*-Helfer (Trennwände, Wandelemente, Möbel) legen ihre eigenen Geometrien/
  // Materialien/Texturen direkt in `scene` ab, ohne Referenzen nach außen zu geben — bei
  // jeder Änderung von room/furniture baut dieser Effekt die komplette Szene neu auf, daher
  // hier eine vollständige Traversierung statt einzeln benannter Handles.
  // Foto-Texturen (texturen.js, ladeFotoTextur) sind davon ausgenommen (userData.persistenteTextur)
  // — die leben im modulweiten Cache über diesen Neuaufbau hinaus, ein hier ausgelöstes dispose()
  // würde beim nächsten Szenenaufbau eine bereits GPU-seitig freigegebene (leere) Textur liefern.
  scene.environment?.dispose()
  scene.traverse(obj => {
    obj.geometry?.dispose()
    const materials = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : [])
    materials.forEach(mat => {
      Object.values(mat).forEach(wert => { if (wert?.isTexture && !wert.userData?.persistenteTextur) wert.dispose() })
      mat.dispose()
    })
  })

  mount.removeChild(renderer.domElement)
  renderer.dispose()
}
  }, [room, furniture, fussleiste, fussleisteFarbe, raumHoehe, tageszeit, modelleBereit, onWandElementBewegt])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: fokusWand == null ? 'grab' : 'default', position: 'relative' }}>
      {fokusWand == null && (
        <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, display: 'flex', border: '1px solid #E8E6E0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          {[
            { key: 'rundumblick', label: 'Rundumblick' },
            { key: 'rundgang', label: 'Rundgang' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => waehleKameraModus(key)} style={{
              padding: '6px 14px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
              background: kameraModus === key ? '#2F4B39' : 'white', color: kameraModus === key ? 'white' : '#888780',
              border: 'none', cursor: 'pointer', fontWeight: kameraModus === key ? '500' : '400',
            }}>{label}</button>
          ))}
        </div>
      )}
      {fokusWand != null && liveWerte && (
        <div style={{
          position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          padding: '6px 14px', borderRadius: '20px', background: 'white', border: '1px solid #E8E6E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: '12px', color: '#444441',
          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
        }}>
          {liveWerte.horizontalCm} cm von Wandanfang
          {liveWerte.typ === 'fenster' && ` · ${liveWerte.vertikalCm} cm Brüstungshöhe`}
        </div>
      )}
    </div>
  )
}

