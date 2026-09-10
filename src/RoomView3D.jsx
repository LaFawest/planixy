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
import { wandMaterialien } from './constants'

export default function RoomView3D({ fokusWand = null, onWandElementBewegt } = {}) {
  const { activeRoom: room } = useRooms()
  const { furniture } = useFurniture()
  const {
    fussleiste, fussleisteFarbe, raumHoehe, tageszeit,
    wandBereiche, fuegeWandBereichHinzu, aktualisiereWandBereich, entferneWandBereich,
  } = useDesign()
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
  const [massLinien, setMassLinien] = useState(null) // { id, links, rechts, unten } | null
  const [bearbeiteSeite, setBearbeiteSeite] = useState(null) // 'links' | 'rechts' | 'unten' | null
  const [bearbeiteWert, setBearbeiteWert] = useState('')
  const wandElementRechnerRef = useRef(() => {}) // setzeMass(id, seite, wertCm) — vom Effekt befüllt

  // Ausgewählter Wandmaterial-Bereich (Teil 3, überarbeitet nach Hassans Feedback) — eigener
  // Auswahlzustand, unabhängig von ausgewaehltesElementRef oben: ein Fenster/eine Tür und ein
  // Bereich sind gegenseitig exklusiv auswählbar. Statt CAD-Maßlinien mit eintippbaren Zahlen gibt
  // es jetzt vier Anfasser an den Ecken (wie eine Auswahl in einem Zeichenprogramm) — bereichAuswahl
  // hält deren Bildschirmposition + die aktuelle Breite/Höhe fürs Live-Label beim Ziehen.
  const ausgewaehlterBereichRef = useRef(null)
  const [bereichAuswahl, setBereichAuswahl] = useState(null) // { id, ecken:{tl,tr,bl,br}, breiteCm, hoeheCm } | null
  const wandBereichHandleStartRef = useRef(() => {}) // startBereichHandleDrag(id, ecke) — vom Effekt befüllt

  // Zeichen-Modus (Teil 3, überarbeitet): ein Material aus der Palette "armiert" das
  // Rechteck-Werkzeug — der nächste Ziehvorgang auf der fokussierten Wand zeichnet direkt einen
  // neuen Bereich auf, wie das Rechteck-Werkzeug in Paint, statt über einen "+"-Button eine
  // Default-Größe anzulegen. zeichenModusMaterialRef ist die vom Maus-Handler im Effekt gelesene
  // Quelle der Wahrheit, der State daneben dient nur der Paletten-Optik (aktiver Swatch) und dem
  // Cursor. Lebt aus demselben Grund wie die anderen Auswahl-Refs außerhalb des schweren Effekts.
  const zeichenModusMaterialRef = useRef(null)
  const [zeichenModusMaterial, setZeichenModusMaterialState] = useState(null)
  const setZeichenModusMaterial = (material) => { zeichenModusMaterialRef.current = material; setZeichenModusMaterialState(material) }
  const [zeichnenLiveGroesse, setZeichnenLiveGroesse] = useState(null) // { breiteCm, hoeheCm } | null, während des Aufziehens
  // Bricht einen laufenden Zeichenvorgang ab (siehe Escape-Effect unten) — muss das
  // Vorschau-Mesh und den wandZeichnenDrag-Zustand im Effekt-Scope erreichen, die als reine
  // Closure-Variablen dort leben und sonst für einen separaten Effect unerreichbar wären. Analog
  // zu wandElementRechnerRef/wandBereichHandleStartRef: vom schweren Effekt befüllt.
  const wandZeichnenAbbrechenRef = useRef(() => {})

  // Analog zu kameraModusRef: ein reiner Wand-Wechsel soll NUR die Kamera neu positionieren,
  // nicht die komplette Szene neu aufbauen (siehe waehleKameraModus-Pattern weiter unten). Setzt
  // hier zugleich die Fenster/Tür-Auswahl zurück (reine Ref-Mutation, kein setState — deshalb als
  // Teil dieses Effects unproblematisch).
  const fokusWandRef = useRef(fokusWand)
  useEffect(() => {
    fokusWandRef.current = fokusWand
    ausgewaehltesElementRef.current = null
    ausgewaehlterBereichRef.current = null
    zeichenModusMaterialRef.current = null
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
    if (massLinien !== null) setMassLinien(null)
    if (bearbeiteSeite !== null) setBearbeiteSeite(null)
    if (bereichAuswahl !== null) setBereichAuswahl(null)
    // Nur der State-Setter, nicht der Ref+State-Wrapper setZeichenModusMaterial — Refs dürfen
    // laut react-hooks/refs nicht während des Renderns mutiert werden (dieser Reset läuft direkt
    // im Render-Body, siehe Kommentar oben). Die Ref wird stattdessen im fokusWandRef-Sync-Effect
    // oben zurückgesetzt (reine Ref-Mutation dort, unproblematisch).
    if (zeichenModusMaterial !== null) setZeichenModusMaterialState(null)
    if (zeichnenLiveGroesse !== null) setZeichnenLiveGroesse(null)
  }

  // Lädt die echten 3D-Modelle (siehe scene/modelle.js) einmalig beim ersten Mount. Sobald fertig,
  // triggert modelleBereit unten einen Neuaufbau der Szene, damit die Modelle auch dann erscheinen,
  // wenn sie beim allerersten Rendern noch nicht rechtzeitig fertig geladen waren.
  const [modelleBereit, setModelleBereit] = useState(false)
  useEffect(() => {
    ladeModelle().then(() => setModelleBereit(true))
  }, [])

  // Escape bricht den Zeichen-Modus ab (kein neuer Bereich wird angelegt) — nur registriert,
  // solange ein Material armiert ist, damit dieser Listener nicht dauerhaft mitläuft.
  useEffect(() => {
    if (!zeichenModusMaterial) return
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setZeichenModusMaterial(null)
      // Bricht auch einen bereits laufenden Ziehvorgang ab (mousedown ist schon passiert,
      // wandZeichnenDrag im Effekt-Scope also schon gesetzt) — sonst würde ein nachfolgendes
      // mouseup trotz Escape noch einen Bereich committen, da dessen Prüfung nichts von diesem
      // State-Reset weiß (reine Closure-Variable, siehe wandZeichnenAbbrechenRef oben).
      wandZeichnenAbbrechenRef.current?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zeichenModusMaterial])

  const waehleKameraModus = (modus) => {
    if (modus === kameraModusRef.current) return
    kameraModusRef.current = modus
    setKameraModus(modus)
    updateCameraRef.current()
  }

  // Armiert/deaktiviert das Zeichnen-Werkzeug für ein Material — Klick auf denselben Swatch
  // schaltet wieder aus (wie ein Werkzeug in der Toolbar an-/abwählen). Das eigentliche Aufziehen
  // passiert per Maus direkt auf der Wand (siehe wandElementMausDown/Move/Up im Effekt unten).
  const armeZeichenModus = (klasse) => {
    setZeichenModusMaterial(zeichenModusMaterial === klasse ? null : klasse)
  }

  const loescheBereich = () => {
    if (!bereichAuswahl) return
    entferneWandBereich(bereichAuswahl.id)
    ausgewaehlterBereichRef.current = null
    setBereichAuswahl(null)
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

    // Wandmaterial-Bereiche (Teil 3): je Bereich ein eigenes, kleines PlaneGeometry-Mesh mit dem
    // gewählten Material als Textur (wandTexturFuer-Cache von oben wiederverwendet), leicht nach
    // innen (-normale) versetzt gegen Z-Fighting mit der Basiswand darunter. u/v-Konvention wie
    // bei Fenstern/Türen: u = Meter ab Segmentanfang zur LINKEN Kante, v = Meter über dem Boden
    // zur UNTEREN Kante (nicht Mittelpunkt).
    const WAND_BEREICH_VERSATZ = 0.01
    // Mindestgröße beim Aufziehen/Skalieren (10cm) — verhindert Flächen mit Breite/Höhe 0 und
    // unterscheidet einen echten Zeichenvorgang von einem versehentlichen Klick ohne Ziehen.
    const MIN_BEREICH_GROESSE = 0.1
    const wandBereichGruppen = []
    wandBereiche.forEach(bereich => {
      const segment = wandMeshe[bereich.wandSegment]
      if (!segment) return
      const geo = new THREE.PlaneGeometry(bereich.breite, bereich.hoehe)
      const mat = new THREE.MeshStandardMaterial({ map: wandTexturFuer(bereich.material), roughness: 0.9, metalness: 0.0 })
      const mesh = new THREE.Mesh(geo, mat)
      const t = (bereich.u + bereich.breite / 2) / (segment.laenge || 1)
      mesh.position.set(
        segment.x1 + segment.dx * t - segment.normale.x * WAND_BEREICH_VERSATZ,
        bereich.v + bereich.hoehe / 2,
        segment.z1 + segment.dz * t - segment.normale.z * WAND_BEREICH_VERSATZ,
      )
      mesh.rotation.copy(segment.mesh.rotation)
      mesh.userData.wandBereichId = bereich.id
      scene.add(mesh)
      wandBereichGruppen.push({ mesh, bereich, segment })
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
    // übereinstimmen (dort nicht exportiert, deshalb hier separat dupliziert). Türen mit eigener
    // Höhe (item.hoeheReal, z.B. Hauseingangstür) überschreiben TUER_HOEHE_3D an allen drei
    // Verwendungsstellen unten.
    const FENSTER_HOEHE_3D = 1.2
    const TUER_HOEHE_3D = 2.1

    const wandElementRaycastZiele = wandElementGruppen.map(w => w.gruppe)
    const wandBereichRaycastZiele = wandBereichGruppen.map(w => w.mesh)
    let wandElementDrag = null // { eintrag, segment, elBreite, elHoehe, offsetU, offsetV, bewegt }
    let wandBereichDrag = null // { eintrag, offsetU, offsetV, bewegt, aktuellU, aktuellV } — Verschieben (Klick auf die Fläche)
    let wandBereichHandleDrag = null // { eintrag, anchorU, anchorV, bewegt, aktuellU, aktuellV, aktuellBreite, aktuellHoehe } — Ecke ziehen
    let wandZeichnenDrag = null // { segment, startU, startV, material, mesh, aktuellU, aktuellV, aktuellBreite, aktuellHoehe } — neuen Bereich aufziehen

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

    // Freie Strecke links/rechts von einem Wand-Element bis zum nächsten Nachbarn auf derselben
    // Wand (oder bis zum Segmentanfang/-ende, wenn keiner da ist) — in Metern ab Segmentanfang
    // (u), dieselbe Konvention wie wandPosition. Grundlage für die Maßlinien-Anzeige UND für die
    // Zahlen-Eingabe (setzeMass unten).
    const ermittleNachbarGrenzen = (eintrag, segment, elBreite) => {
      const uStart = eintrag.item.wandPosition
      const uEnde = uStart + elBreite
      let uLinksRef = 0
      let uRechtsRef = segment.laenge
      wandElementGruppen.forEach(({ item }) => {
        if (item.id === eintrag.item.id || item.wandSegment !== eintrag.item.wandSegment) return
        const oStart = item.wandPosition
        const oEnde = oStart + item.width / 60
        if (oEnde <= uStart && oEnde > uLinksRef) uLinksRef = oEnde
        if (oStart >= uEnde && oStart < uRechtsRef) uRechtsRef = oStart
      })
      return { uLinksRef, uRechtsRef }
    }

    // Screen-Projektion eines Weltpunkts. Nur im Wand-Fokus-Modus gebraucht — die Kamera bewegt
    // sich dort außer während eines Wandwechsel-Schwenks nicht (wandFokusAnimation oben), ein
    // Neuberechnen bei jedem Frame ist deshalb nicht nötig, nur bei Auswahl/Ziehen/Resize.
    const projiziere = (punkt3D) => {
      const rect = mount.getBoundingClientRect()
      const p = punkt3D.clone().project(camera)
      return { x: (p.x * 0.5 + 0.5) * rect.width, y: (-p.y * 0.5 + 0.5) * rect.height }
    }

    // Ersetzt das bisherige meldeLiveWerte: berechnet weiterhin die Live-cm-Anzeige, zusätzlich
    // die drei Maßlinien (links/rechts zum Nachbarn bzw. zur Wandkante, bei Fenstern zusätzlich
    // die Brüstungshöhe). Aufrufstellen bleiben dieselben (Anklicken, Ziehen), dazu neu: einmalig
    // nach einem Szenen-Neuaufbau, falls die Auswahl ihn überlebt hat, und bei Resize (siehe unten).
    const berechneAnzeige = (eintrag, segment, elBreite) => {
      const mitteU = ((eintrag.gruppe.position.x - segment.x1) * segment.dx + (eintrag.gruppe.position.z - segment.z1) * segment.dz) / (segment.laenge || 1)
      const uStart = mitteU - elBreite / 2
      const elHoehe = eintrag.item.hoeheReal ?? (eintrag.item.typ === 'fenster' ? FENSTER_HOEHE_3D : TUER_HOEHE_3D)
      const elBoden = eintrag.item.typ === 'fenster' ? eintrag.gruppe.position.y : 0

      setLiveWerte({
        typ: eintrag.item.typ,
        horizontalCm: Math.round(uStart * 100),
        vertikalCm: eintrag.item.typ === 'fenster' ? Math.round(elBoden * 100) : null,
      })

      const { uLinksRef, uRechtsRef } = ermittleNachbarGrenzen(eintrag, segment, elBreite)
      const weltpunkt = (u, y) => {
        const t = u / (segment.laenge || 1)
        return new THREE.Vector3(segment.x1 + segment.dx * t, y, segment.z1 + segment.dz * t)
      }
      const linieY = elBoden + elHoehe / 2
      const linksA = projiziere(weltpunkt(uLinksRef, linieY))
      const linksB = projiziere(weltpunkt(uStart, linieY))
      const rechtsA = projiziere(weltpunkt(uStart + elBreite, linieY))
      const rechtsB = projiziere(weltpunkt(uRechtsRef, linieY))

      const linien = {
        id: eintrag.item.id,
        links: {
          x1: linksA.x, y1: linksA.y, x2: linksB.x, y2: linksB.y,
          labelX: (linksA.x + linksB.x) / 2, labelY: (linksA.y + linksB.y) / 2,
          wertCm: Math.round((uStart - uLinksRef) * 100),
        },
        rechts: {
          x1: rechtsA.x, y1: rechtsA.y, x2: rechtsB.x, y2: rechtsB.y,
          labelX: (rechtsA.x + rechtsB.x) / 2, labelY: (rechtsA.y + rechtsB.y) / 2,
          wertCm: Math.round((uRechtsRef - (uStart + elBreite)) * 100),
        },
        unten: null,
      }
      if (eintrag.item.typ === 'fenster') {
        const uUnten = Math.max(0, uStart - 0.1)
        const untenA = projiziere(weltpunkt(uUnten, 0))
        const untenB = projiziere(weltpunkt(uUnten, elBoden))
        linien.unten = {
          x1: untenA.x, y1: untenA.y, x2: untenB.x, y2: untenB.y,
          labelX: untenA.x, labelY: (untenA.y + untenB.y) / 2,
          wertCm: Math.round(elBoden * 100),
        }
      }
      setMassLinien(linien)
    }

    // Übernimmt eine per Zahlen-Eingabe getippte Maßlinien-Länge (siehe JSX unten): rechnet sie in
    // die neue wandPosition bzw. Brüstungshöhe um und committet über denselben Weg wie das
    // Loslassen nach einem Ziehvorgang (onWandElementBewegt). In wandElementRechnerRef hinterlegt
    // (analog zu updateCameraRef), damit die JSX-Eingabe außerhalb dieses Effekts darauf zugreift.
    const setzeMass = (id, seite, wertCm) => {
      const eintrag = wandElementGruppen.find(w => w.item.id === id)
      if (!eintrag) return
      const segment = wandMeshe[eintrag.item.wandSegment]
      if (!segment) return
      const elBreite = eintrag.item.width / 60
      const elHoehe = eintrag.item.hoeheReal ?? (eintrag.item.typ === 'fenster' ? FENSTER_HOEHE_3D : TUER_HOEHE_3D)
      const wertM = Math.max(0, wertCm) / 100

      if (seite === 'unten') {
        if (eintrag.item.typ !== 'fenster') return
        const neueHoehe = Math.max(0, Math.min(wandHoehe - elHoehe, wertM))
        onWandElementBewegt?.(id, { bruestungshoehe: neueHoehe })
        return
      }

      const { uLinksRef, uRechtsRef } = ermittleNachbarGrenzen(eintrag, segment, elBreite)
      let neuesUStart = seite === 'links' ? uLinksRef + wertM : uRechtsRef - wertM - elBreite
      neuesUStart = Math.max(uLinksRef, Math.min(uRechtsRef - elBreite, neuesUStart))
      onWandElementBewegt?.(id, { wandPosition: neuesUStart })
    }
    wandElementRechnerRef.current = setzeMass

    // Nach einem Neuaufbau (z.B. durch das Committen einer Zahlen-Eingabe oder eines Zieh-
    // vorgangs, beides ändert `furniture` und löst dadurch diesen ganzen Effekt erneut aus) die
    // Auswahl/Maßlinien-Anzeige mit den neuen Werten auffrischen — nur wenn das Element noch
    // existiert und weiterhin auf der fokussierten Wand sitzt, sonst Auswahl aufheben.
    if (ausgewaehltesElementRef.current) {
      const ausgewaehlterEintrag = wandElementGruppen.find(w => w.item.id === ausgewaehltesElementRef.current)
      if (ausgewaehlterEintrag && ausgewaehlterEintrag.item.wandSegment === fokusWandRef.current) {
        berechneAnzeige(ausgewaehlterEintrag, wandMeshe[ausgewaehlterEintrag.item.wandSegment], ausgewaehlterEintrag.item.width / 60)
      } else {
        ausgewaehltesElementRef.current = null
      }
    }

    // Ersetzt die bisherigen CAD-Maßlinien für einen ausgewählten Bereich (Teil 3, überarbeitet):
    // liefert die Bildschirmposition der vier Eckpunkte (für den gestrichelten Rahmen + die
    // Anfasser in der JSX unten) sowie die aktuelle Breite/Höhe in cm fürs Live-Label.
    const berechneBereichAuswahl = (eintrag) => {
      const { bereich, segment } = eintrag
      const weltpunkt = (u, y) => {
        const t = u / (segment.laenge || 1)
        return new THREE.Vector3(segment.x1 + segment.dx * t, y, segment.z1 + segment.dz * t)
      }
      const oben = bereich.v + bereich.hoehe
      const rechts = bereich.u + bereich.breite
      setBereichAuswahl({
        id: bereich.id,
        ecken: {
          tl: projiziere(weltpunkt(bereich.u, oben)),
          tr: projiziere(weltpunkt(rechts, oben)),
          bl: projiziere(weltpunkt(bereich.u, bereich.v)),
          br: projiziere(weltpunkt(rechts, bereich.v)),
        },
        breiteCm: Math.round(bereich.breite * 100),
        hoeheCm: Math.round(bereich.hoehe * 100),
      })
    }

    // Startet das Ziehen an einer Ecke (siehe JSX unten, Anfasser-Divs) — der diagonal
    // gegenüberliegende Punkt bleibt fix, dieselbe Logik wie ein Auswahlrechteck in einem
    // Zeichenprogramm. In wandBereichHandleStartRef hinterlegt (analog zu wandElementRechnerRef),
    // damit die JSX-Anfasser außerhalb dieses Effekts darauf zugreifen.
    const startBereichHandleDrag = (id, ecke) => {
      const eintrag = wandBereichGruppen.find(w => w.bereich.id === id)
      if (!eintrag) return
      const { bereich } = eintrag
      const anchorU = (ecke === 'tl' || ecke === 'bl') ? bereich.u + bereich.breite : bereich.u
      const anchorV = (ecke === 'bl' || ecke === 'br') ? bereich.v + bereich.hoehe : bereich.v
      wandBereichHandleDrag = { eintrag, anchorU, anchorV, bewegt: false }
    }
    wandBereichHandleStartRef.current = startBereichHandleDrag

    // Bricht einen laufenden Zeichenvorgang ab, ohne einen Bereich anzulegen (Escape, siehe
    // Effect am Komponentenkopf) — entfernt das Vorschau-Mesh und setzt wandZeichnenDrag zurück,
    // damit ein nachfolgendes mouseup (Maustaste war ja noch gedrückt) nichts mehr committet.
    const abbrichZeichnen = () => {
      if (!wandZeichnenDrag) return
      if (wandZeichnenDrag.mesh) {
        wandZeichnenDrag.mesh.geometry.dispose()
        wandZeichnenDrag.mesh.material.dispose()
        scene.remove(wandZeichnenDrag.mesh)
      }
      wandZeichnenDrag = null
      setZeichnenLiveGroesse(null)
    }
    wandZeichnenAbbrechenRef.current = abbrichZeichnen

    // Reselect nach Neuaufbau — analog zum Fenster/Tür-Block oben, für einen ausgewählten Bereich.
    if (ausgewaehlterBereichRef.current) {
      const ausgewaehlterBereichEintrag = wandBereichGruppen.find(w => w.bereich.id === ausgewaehlterBereichRef.current)
      if (ausgewaehlterBereichEintrag && ausgewaehlterBereichEintrag.bereich.wandSegment === fokusWandRef.current) {
        berechneBereichAuswahl(ausgewaehlterBereichEintrag)
      } else {
        ausgewaehlterBereichRef.current = null
      }
    }

    const wandElementMausDown = (clientX, clientY) => {
      if (wandFokusAnimation) return
      setBearbeiteSeite(null)

      // Zeichen-Modus (Teil 3, überarbeitet): ein Material ist über die Palette armiert — der
      // nächste Ziehvorgang zeichnet direkt ein neues Rechteck auf der fokussierten Wand, wie das
      // Rechteck-Werkzeug in Paint. Kein Raycast auf bestehende Fenster/Türen/Bereiche nötig, da
      // im Zeichen-Modus jeder Klick auf die Wand einen neuen Bereich beginnt.
      if (zeichenModusMaterialRef.current) {
        const segment = wandMeshe[fokusWandRef.current]
        const ebene = ebeneFuerSegment(fokusWandRef.current)
        if (!segment || !ebene) return
        const schnitt = zeigerAufWeltpunkt(clientX, clientY, ebene)
        if (!schnitt) return
        const { u, v } = weltpunktZuUV(schnitt, segment)
        wandZeichnenDrag = {
          segment,
          startU: Math.max(0, Math.min(segment.laenge, u)),
          startV: Math.max(0, Math.min(wandHoehe, v)),
          material: zeichenModusMaterialRef.current,
          mesh: null,
        }
        ausgewaehlterBereichRef.current = null
        setBereichAuswahl(null)
        setAusgewaehltesElement(null); setLiveWerte(null); setMassLinien(null)
        return
      }

      const rect = mount.getBoundingClientRect()
      zeigerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
      zeigerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(zeigerNDC, camera)

      const treffer = raycaster.intersectObjects(wandElementRaycastZiele, true)
      if (treffer.length > 0) {
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
        const elHoehe = eintrag.item.hoeheReal ?? (eintrag.item.typ === 'fenster' ? FENSTER_HOEHE_3D : TUER_HOEHE_3D)
        const mitteUAktuell = ((eintrag.gruppe.position.x - segment.x1) * segment.dx + (eintrag.gruppe.position.z - segment.z1) * segment.dz) / (segment.laenge || 1)
        wandElementDrag = {
          eintrag, segment, elBreite, elHoehe,
          offsetU: mitteUAktuell - u,
          offsetV: eintrag.gruppe.position.y - v,
          bewegt: false,
        }
        setAusgewaehltesElement(eintrag.item.id)
        ausgewaehlterBereichRef.current = null
        setBereichAuswahl(null)
        berechneAnzeige(eintrag, segment, elBreite)
        return
      }

      // Kein Fenster/Tür getroffen — als Zweites gegen die Wandmaterial-Bereiche testen (Teil 3).
      const bereichTreffer = raycaster.intersectObjects(wandBereichRaycastZiele, false)
      if (bereichTreffer.length === 0) {
        setAusgewaehltesElement(null); setLiveWerte(null); setMassLinien(null)
        ausgewaehlterBereichRef.current = null; setBereichAuswahl(null)
        return
      }
      const treffermesh = bereichTreffer[0].object
      const eintrag = wandBereichGruppen.find(w => w.mesh === treffermesh)
      if (!eintrag) return
      const ebene = ebeneFuerSegment(eintrag.bereich.wandSegment)
      if (!ebene) return
      const schnitt = zeigerAufWeltpunkt(clientX, clientY, ebene)
      if (!schnitt) return
      const { u, v } = weltpunktZuUV(schnitt, eintrag.segment)
      wandBereichDrag = { eintrag, offsetU: eintrag.bereich.u - u, offsetV: eintrag.bereich.v - v, bewegt: false }
      ausgewaehlterBereichRef.current = eintrag.bereich.id
      setAusgewaehltesElement(null)
      setLiveWerte(null)
      setMassLinien(null)
      berechneBereichAuswahl(eintrag)
    }

    const wandElementMausMove = (clientX, clientY) => {
      if (!wandElementDrag && !wandBereichDrag && !wandBereichHandleDrag && !wandZeichnenDrag) return

      if (wandElementDrag) {
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
        berechneAnzeige(eintrag, segment, elBreite)
        return
      }

      if (wandBereichHandleDrag) {
        // Ecke ziehen (Teil 3, neu): der diagonal gegenüberliegende Punkt (anchorU/V) bleibt fix,
        // die gezogene Ecke bestimmt die neue Breite/Höhe — Geometrie wird dafür pro Mousemove neu
        // erzeugt (ein einfaches Plane, unkritisch teuer) statt versucht per scale zu verzerren.
        const { eintrag, anchorU, anchorV } = wandBereichHandleDrag
        const { bereich, segment, mesh } = eintrag
        const ebene = ebeneFuerSegment(bereich.wandSegment)
        const schnitt = zeigerAufWeltpunkt(clientX, clientY, ebene)
        if (!schnitt) return
        const { u, v } = weltpunktZuUV(schnitt, segment)
        const uKlamm = Math.max(0, Math.min(segment.laenge, u))
        const vKlamm = Math.max(0, Math.min(wandHoehe, v))
        const neuU = Math.min(anchorU, uKlamm)
        const neuBreite = Math.max(MIN_BEREICH_GROESSE, Math.abs(uKlamm - anchorU))
        const neuV = Math.min(anchorV, vKlamm)
        const neuHoehe = Math.max(MIN_BEREICH_GROESSE, Math.abs(vKlamm - anchorV))
        wandBereichHandleDrag.aktuellU = neuU
        wandBereichHandleDrag.aktuellV = neuV
        wandBereichHandleDrag.aktuellBreite = neuBreite
        wandBereichHandleDrag.aktuellHoehe = neuHoehe
        mesh.geometry.dispose()
        mesh.geometry = new THREE.PlaneGeometry(neuBreite, neuHoehe)
        const t = (neuU + neuBreite / 2) / (segment.laenge || 1)
        mesh.position.set(
          segment.x1 + segment.dx * t - segment.normale.x * WAND_BEREICH_VERSATZ,
          neuV + neuHoehe / 2,
          segment.z1 + segment.dz * t - segment.normale.z * WAND_BEREICH_VERSATZ,
        )
        wandBereichHandleDrag.bewegt = true
        berechneBereichAuswahl({ ...eintrag, bereich: { ...bereich, u: neuU, v: neuV, breite: neuBreite, hoehe: neuHoehe } })
        return
      }

      if (wandZeichnenDrag) {
        // Neuen Bereich aufziehen (Teil 3, neu): startU/startV ist die feste Anfangsecke, die
        // aktuelle Mausposition die gegenüberliegende — daraus ergibt sich ein Live-Vorschau-Mesh
        // (halbtransparent, depthTest aus + hohe renderOrder, damit es immer sichtbar bleibt), erst
        // beim Loslassen wird daraus ein echter Bereich committet (siehe wandElementMausUp).
        const { segment, startU, startV } = wandZeichnenDrag
        const ebene = ebeneFuerSegment(fokusWandRef.current)
        const schnitt = zeigerAufWeltpunkt(clientX, clientY, ebene)
        if (!schnitt) return
        const { u, v } = weltpunktZuUV(schnitt, segment)
        const uKlamm = Math.max(0, Math.min(segment.laenge, u))
        const vKlamm = Math.max(0, Math.min(wandHoehe, v))
        const u0 = Math.min(startU, uKlamm)
        const breite = Math.abs(uKlamm - startU)
        const v0 = Math.min(startV, vKlamm)
        const hoehe = Math.abs(vKlamm - startV)
        wandZeichnenDrag.aktuellU = u0
        wandZeichnenDrag.aktuellV = v0
        wandZeichnenDrag.aktuellBreite = breite
        wandZeichnenDrag.aktuellHoehe = hoehe

        if (breite > 0.01 && hoehe > 0.01) {
          if (!wandZeichnenDrag.mesh) {
            const geo = new THREE.PlaneGeometry(breite, hoehe)
            const mat = new THREE.MeshBasicMaterial({ color: '#185FA5', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthTest: false })
            wandZeichnenDrag.mesh = new THREE.Mesh(geo, mat)
            wandZeichnenDrag.mesh.renderOrder = 999
            wandZeichnenDrag.mesh.rotation.copy(segment.mesh.rotation)
            scene.add(wandZeichnenDrag.mesh)
          } else {
            wandZeichnenDrag.mesh.geometry.dispose()
            wandZeichnenDrag.mesh.geometry = new THREE.PlaneGeometry(breite, hoehe)
          }
          const t = (u0 + breite / 2) / (segment.laenge || 1)
          wandZeichnenDrag.mesh.position.set(
            segment.x1 + segment.dx * t - segment.normale.x * (WAND_BEREICH_VERSATZ * 2),
            v0 + hoehe / 2,
            segment.z1 + segment.dz * t - segment.normale.z * (WAND_BEREICH_VERSATZ * 2),
          )
        }
        setZeichnenLiveGroesse({ breiteCm: Math.round(breite * 100), hoeheCm: Math.round(hoehe * 100) })
        return
      }

      // Bereich verschieben (Klick auf die Fläche, nicht auf eine Ecke): bewegt die linke/untere
      // Ecke, nicht den Mittelpunkt — dieselbe offsetU/offsetV-Logik wie bei Fenstern/Türen oben,
      // nur ohne deren Sonderfälle. bereich selbst wird NICHT mutiert (bliebe sonst während des
      // Ziehens ein direkt mutiertes React-State-Objekt) — die aktuelle Position lebt nur in
      // wandBereichDrag.aktuellU/V und im Mesh, committed wird erst beim Loslassen.
      const { eintrag, offsetU, offsetV } = wandBereichDrag
      const { bereich, segment, mesh } = eintrag
      const ebene = ebeneFuerSegment(bereich.wandSegment)
      const schnitt = zeigerAufWeltpunkt(clientX, clientY, ebene)
      if (!schnitt) return
      const { u, v } = weltpunktZuUV(schnitt, segment)
      const neuU = Math.max(0, Math.min(segment.laenge - bereich.breite, u + offsetU))
      const neuV = Math.max(0, Math.min(wandHoehe - bereich.hoehe, v + offsetV))
      wandBereichDrag.aktuellU = neuU
      wandBereichDrag.aktuellV = neuV
      const t = (neuU + bereich.breite / 2) / (segment.laenge || 1)
      mesh.position.set(
        segment.x1 + segment.dx * t - segment.normale.x * WAND_BEREICH_VERSATZ,
        neuV + bereich.hoehe / 2,
        segment.z1 + segment.dz * t - segment.normale.z * WAND_BEREICH_VERSATZ,
      )
      wandBereichDrag.bewegt = true
      berechneBereichAuswahl({ ...eintrag, bereich: { ...bereich, u: neuU, v: neuV } })
    }

    const wandElementMausUp = () => {
      if (wandElementDrag) {
        const { eintrag, segment, elBreite } = wandElementDrag
        if (wandElementDrag.bewegt) {
          const mitteU = ((eintrag.gruppe.position.x - segment.x1) * segment.dx + (eintrag.gruppe.position.z - segment.z1) * segment.dz) / (segment.laenge || 1)
          const patch = { wandPosition: mitteU - elBreite / 2 }
          if (eintrag.item.typ === 'fenster') patch.bruestungshoehe = eintrag.gruppe.position.y
          onWandElementBewegt?.(eintrag.item.id, patch)
        }
        wandElementDrag = null
        return
      }
      if (wandBereichHandleDrag) {
        const { eintrag } = wandBereichHandleDrag
        if (wandBereichHandleDrag.bewegt) {
          aktualisiereWandBereich(eintrag.bereich.id, {
            u: wandBereichHandleDrag.aktuellU, v: wandBereichHandleDrag.aktuellV,
            breite: wandBereichHandleDrag.aktuellBreite, hoehe: wandBereichHandleDrag.aktuellHoehe,
          })
        }
        wandBereichHandleDrag = null
        return
      }
      if (wandZeichnenDrag) {
        const { material, mesh, aktuellU, aktuellV, aktuellBreite, aktuellHoehe } = wandZeichnenDrag
        if (mesh) { mesh.geometry.dispose(); mesh.material.dispose(); scene.remove(mesh) }
        setZeichnenLiveGroesse(null)
        // Zeichen-Modus deaktiviert sich nach einem Versuch selbst (erfolgreich oder nicht) — wie
        // bei den meisten Zeichenprogrammen bleibt das Werkzeug nicht dauerhaft "scharf".
        setZeichenModusMaterial(null)
        if ((aktuellBreite || 0) >= MIN_BEREICH_GROESSE && (aktuellHoehe || 0) >= MIN_BEREICH_GROESSE) {
          const id = fuegeWandBereichHinzu?.({
            wandSegment: fokusWandRef.current, material,
            u: aktuellU, v: aktuellV, breite: aktuellBreite, hoehe: aktuellHoehe,
          })
          if (id) ausgewaehlterBereichRef.current = id
        }
        wandZeichnenDrag = null
        return
      }
      if (wandBereichDrag) {
        if (wandBereichDrag.bewegt) {
          aktualisiereWandBereich(wandBereichDrag.eintrag.bereich.id, { u: wandBereichDrag.aktuellU, v: wandBereichDrag.aktuellV })
        }
        wandBereichDrag = null
      }
    }

    const onMouseDown = (e) => {
      // mount enthält neben dem Canvas auch die React-gerenderten HTML-Overlays (Kameramodus-
      // Buttons, Maßlinien-Zahlen/-Eingabefelder) — deren mousedown bubbelt sonst hierher hoch und
      // würde z.B. beim Antippen einer Maßlinien-Zahl fälschlich als Klick "daneben" gewertet
      // (Raycast trifft nichts -> Auswahl wird sofort wieder aufgehoben, bevor der Klick das
      // Eingabefeld überhaupt erreicht). Nur echte Canvas-Klicks sollen die 3D-Interaktion auslösen.
      if (e.target !== renderer.domElement) return
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
      // Siehe onMouseDown oben: nur echte Canvas-Touches sollen die 3D-Interaktion auslösen, nicht
      // ein Antippen der HTML-Overlays (Maßlinien-Zahlen/-Eingabefelder, Kameramodus-Buttons).
      if (e.target !== renderer.domElement) return
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
  if (ausgewaehltesElementRef.current) {
    const eintrag = wandElementGruppen.find(w => w.item.id === ausgewaehltesElementRef.current)
    if (eintrag) berechneAnzeige(eintrag, wandMeshe[eintrag.item.wandSegment], eintrag.item.width / 60)
  }
  if (ausgewaehlterBereichRef.current) {
    const eintrag = wandBereichGruppen.find(w => w.bereich.id === ausgewaehlterBereichRef.current)
    if (eintrag) berechneBereichAuswahl(eintrag)
  }
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
  }, [room, furniture, fussleiste, fussleisteFarbe, raumHoehe, tageszeit, modelleBereit, onWandElementBewegt, wandBereiche, aktualisiereWandBereich, fuegeWandBereichHinzu])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: fokusWand == null ? 'grab' : (zeichenModusMaterial ? 'crosshair' : 'default'), position: 'relative' }}>
      {fokusWand != null && (
        // left: 220px statt der sonst üblichen 12/16px am linken Rand — dort sitzt bereits die
        // WandMiniKarte (190px breit, 16px Rand), siehe die Notiz dazu, die vorher beim
        // "+ Bereich"-Button stand. Palette ersetzt den Button: ein Material anklicken armiert das
        // Zeichen-Werkzeug (aktiver Swatch hervorgehoben), erneut anklicken oder Escape deaktiviert
        // es wieder. Das Rechteck selbst wird direkt mit der Maus auf der Wand aufgezogen (wie in
        // Paint), siehe wandElementMausDown/Move/Up.
        <div style={{
          position: 'absolute', top: '16px', left: '220px', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px',
          background: 'white', border: '1px solid #E8E6E0', borderRadius: '10px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          {wandMaterialien.map(material => (
            <div key={material.klasse} onClick={() => armeZeichenModus(material.klasse)} title={material.name} style={{
              width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', cursor: 'pointer',
              border: `${zeichenModusMaterial === material.klasse ? '2px' : '1px'} solid ${zeichenModusMaterial === material.klasse ? '#185FA5' : '#E8E6E0'}`,
              background: zeichenModusMaterial === material.klasse ? '#EEF4FC' : '#FAFAF8',
            }}>{material.icon}</div>
          ))}
        </div>
      )}
      {fokusWand != null && zeichnenLiveGroesse && (
        <div style={{
          position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          padding: '6px 14px', borderRadius: '20px', background: 'white', border: '1px solid #185FA5',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: '12px', color: '#185FA5',
          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
        }}>
          {zeichnenLiveGroesse.breiteCm} × {zeichnenLiveGroesse.hoeheCm} cm
        </div>
      )}
      {fokusWand != null && bereichAuswahl && (
        <>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 9, pointerEvents: 'none' }}>
            <polygon
              points={`${bereichAuswahl.ecken.tl.x},${bereichAuswahl.ecken.tl.y} ${bereichAuswahl.ecken.tr.x},${bereichAuswahl.ecken.tr.y} ${bereichAuswahl.ecken.br.x},${bereichAuswahl.ecken.br.y} ${bereichAuswahl.ecken.bl.x},${bereichAuswahl.ecken.bl.y}`}
              fill="none" stroke="#185FA5" strokeWidth={1.5} strokeDasharray="4 4" />
          </svg>
          {['tl', 'tr', 'bl', 'br'].map(ecke => (
            <div key={ecke}
              onMouseDown={() => wandBereichHandleStartRef.current(bereichAuswahl.id, ecke)}
              onTouchStart={() => wandBereichHandleStartRef.current(bereichAuswahl.id, ecke)}
              style={{
                position: 'absolute', left: bereichAuswahl.ecken[ecke].x, top: bereichAuswahl.ecken[ecke].y,
                transform: 'translate(-50%, -50%)', zIndex: 10,
                width: '14px', height: '14px', borderRadius: '3px', background: 'white',
                border: '2px solid #185FA5', cursor: ecke === 'tl' || ecke === 'br' ? 'nwse-resize' : 'nesw-resize',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
          ))}
          <div onClick={loescheBereich} title="Bereich löschen" style={{
            position: 'absolute', left: bereichAuswahl.ecken.tr.x, top: bereichAuswahl.ecken.tr.y,
            transform: 'translate(-50%, -150%)', zIndex: 10,
            width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', color: 'white', background: '#B4322E', cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}>✕</div>
          <div style={{
            position: 'absolute',
            left: (bereichAuswahl.ecken.tl.x + bereichAuswahl.ecken.tr.x) / 2,
            top: Math.min(bereichAuswahl.ecken.tl.y, bereichAuswahl.ecken.tr.y) - 14,
            transform: 'translate(-50%, -100%)', zIndex: 10, pointerEvents: 'none',
            padding: '3px 8px', borderRadius: '10px', background: 'white', border: '1px solid #185FA5',
            fontSize: '11px', color: '#185FA5', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
          }}>{bereichAuswahl.breiteCm} × {bereichAuswahl.hoeheCm} cm</div>
        </>
      )}
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
      {fokusWand != null && massLinien && (
        <>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 9, pointerEvents: 'none' }}>
            {['links', 'rechts', 'unten'].map(seite => massLinien[seite] && (
              <line key={seite}
                x1={massLinien[seite].x1} y1={massLinien[seite].y1}
                x2={massLinien[seite].x2} y2={massLinien[seite].y2}
                stroke="#185FA5" strokeWidth={1.5} strokeDasharray="3 3" />
            ))}
          </svg>
          {['links', 'rechts', 'unten'].map(seite => {
            const linie = massLinien[seite]
            if (!linie) return null
            return (
              <div key={seite} style={{
                position: 'absolute', left: linie.labelX, top: linie.labelY, transform: 'translate(-50%, -50%)',
                zIndex: 10, fontFamily: "'DM Sans', sans-serif",
              }}>
                {bearbeiteSeite === seite ? (
                  <input type="number" autoFocus value={bearbeiteWert}
                    onChange={e => setBearbeiteWert(e.target.value)}
                    onBlur={() => { wandElementRechnerRef.current(massLinien.id, seite, Number(bearbeiteWert) || 0); setBearbeiteSeite(null) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') setBearbeiteSeite(null)
                    }}
                    style={{ width: '54px', fontSize: '11px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #185FA5', textAlign: 'center' }} />
                ) : (
                  <span onClick={() => { setBearbeiteSeite(seite); setBearbeiteWert(String(linie.wertCm)) }}
                    style={{
                      cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', background: 'white',
                      border: '1px solid #185FA5', color: '#185FA5', fontSize: '11px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', whiteSpace: 'nowrap',
                    }}>{linie.wertCm} cm</span>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

