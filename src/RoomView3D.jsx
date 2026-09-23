import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { erzeugeHolzTextur, erzeugeStoffTextur, erzeugeBodenTextur, erzeugeUmgebungsTextur, erzeugeWandTexturFuerFlaeche, erzeugeBacksteinTextur } from './texturen'
import { baueTrennwaende } from './scene/trennwaende'
import { baueWandElement } from './scene/wandelemente'
import { baueMoebel } from './scene/moebel'
import { ladeModelle, getModell } from './scene/modelle'
import { baueBeleuchtung, aktualisiereBeleuchtung } from './scene/beleuchtung'
import { stelleLichtPoolBereit, verteileLichter, raeumeLichtPoolAb } from './scene/lichtPool'
import { rechteckPolygon, boundingBox, wandSegmente, punktInPolygon, versetztesPolygon, punktSicherImPolygon } from './raumPolygon'
import { useRooms } from './context/RoomsContext'
import { useFurniture } from './context/FurnitureContext'
import { useDesign } from './context/DesignContext'
import { useUI } from './context/UIContext'
import { wandMaterialien, istDeckenleuchte, istVerschiebbareDeckenleuchte, istEndpunktVerstellbareDeckenleuchte, istEckSkalierbareDeckenleuchte, berechneInnenmasse, bogenMasse } from './constants'

export default function RoomView3D({ fokusWand = null, onWandElementBewegt, deckenFokus = false, onDeckenleuchteAusgewaehlt, onDeckenleuchteBewegt } = {}) {
  const { activeRoom: room } = useRooms()
  const { furniture } = useFurniture()
  const {
    fussleiste, fussleisteFarbe, raumHoehe, tageszeit,
    wandBereiche, fuegeWandBereichHinzu, aktualisiereWandBereich, entferneWandBereich,
  } = useDesign()
  // Phase 4, Teil 2 (Seitenleiste): Setter für die geteilte Fenster-Auswahl — Sidebar.jsx ist ein
  // Geschwister-Element ohne direkten Props-Weg zu dieser Komponente, liest von dort mit useUI().
  const { setAusgewaehltesWandElement } = useUI()
  // Beim Verlassen aufräumen (z.B. Schritt-Wechsel weg von „Fenster & Türen") — sonst bliebe eine
  // alte Auswahl im geteilten Context hängen und die Seitenleiste würde beim nächsten Mal kurz
  // veraltete Maße zeigen, obwohl im 3D-Bild nichts mehr ausgewählt ist.
  useEffect(() => () => setAusgewaehltesWandElement(null), [setAusgewaehltesWandElement])
  const mountRef = useRef(null)

  // App schneller machen, Schritt 3, Teilpunkt 1: onWandElementBewegt/onDeckenleuchteBewegt/
  // aktualisiereWandBereich/fuegeWandBereichHinzu bekommen bei JEDER Raum-Änderung eine neue
  // Funktions-Identität (siehe FurnitureContext.jsx/DesignContext.jsx — dort jeweils useCallback
  // mit activeRoom in den Abhängigkeiten). Würde man sie weiterhin direkt in der Abhängigkeitsliste
  // des schweren Szenen-Effekts unten führen, löst das auch dann einen kompletten Neuaufbau aus,
  // wenn sich inhaltlich nichts an diesen Funktionen geändert hat (z.B. bei jedem Tageszeit-Tick).
  // callbacksRef hält deshalb immer die aktuellste Version — Vorbild: updateCameraRef weiter unten,
  // dasselbe Muster.
  const callbacksRef = useRef({})
  useEffect(() => {
    callbacksRef.current = { onWandElementBewegt, onDeckenleuchteBewegt, aktualisiereWandBereich, fuegeWandBereichHinzu }
  }, [onWandElementBewegt, onDeckenleuchteBewegt, aktualisiereWandBereich, fuegeWandBereichHinzu])

  // App schneller machen, Schritt 3, Teilpunkt 2: beleuchtungRef merkt sich die von
  // baueBeleuchtung() erzeugten Lichter, damit der Tageszeit-Schnellpfad-Effekt weiter unten sie
  // direkt anpassen kann, ohne die Szene neu zu bauen. tageszeitRef hält denselben Zweck wie
  // fokusWandRef/deckenFokusRef weiter unten: der schwere Szenen-Effekt liest beim (seltenen)
  // vollständigen Neuaufbau den aktuellen Wert darüber, OHNE tageszeit selbst als Abhängigkeit zu
  // führen — genau das würde sonst bei jedem Tageszeit-Tick wieder einen kompletten Neuaufbau
  // auslösen, den dieser Teilpunkt ja gerade vermeiden soll.
  const beleuchtungRef = useRef(null)
  const tageszeitRef = useRef(tageszeit)

  // App schneller machen, Schritt 3, Teilpunkt 4.4: Szene, Kamera und Renderer werden nur noch
  // einmal beim Mount erzeugt (siehe Lebenszyklus-Effekt weiter unten) statt bei jedem Neuaufbau —
  // ein neuer WebGLRenderer bedeutet jedes Mal einen neuen Grafik-Kontext, das ist mit Abstand der
  // teuerste Teil eines Neuaufbaus. Der schwere Szenen-Effekt liest die drei über diese Refs.
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  // Was pro Bild zu tun ist (die beiden Kamera-Animationen) — vom schweren Effekt bei jedem Lauf
  // frisch hinterlegt, von der dauerhaften Render-Schleife im Lebenszyklus-Effekt aufgerufen.
  const frameTickRef = useRef(null)
  // Was über das reine Anpassen von Kamera-Seitenverhältnis und Renderer-Größe hinaus bei einer
  // Größenänderung zu tun ist (Wand-Fokus neu einpassen, Auswahl-Markierungen neu berechnen) —
  // ebenfalls vom schweren Effekt hinterlegt, vom dauerhaften ResizeObserver aufgerufen.
  const onResizeExtraRef = useRef(null)
  // App schneller machen, Schritt 3, Teilpunkt 4.5: Was der Möbel-Effekt gebaut hat — die
  // Deckenleuchten-Gruppen, ihre Anfasser und der Auswahl-Ring. Die Deckenleuchten-Handler bleiben
  // im Struktur-Effekt (bei den Maus-Listenern) und holen sich die aktuellen Teile im Moment des
  // Klicks hier heraus, statt sie als lokale Variablen zu schließen. Ist null, solange der
  // Möbel-Effekt noch nichts gebaut hat.
  const moebelGruppenRef = useRef(null)
  // Der feste Licht-Vorrat (siehe scene/lichtPool.js). Lebt in der dauerhaften Szene und übersteht
  // deshalb jeden Neuaufbau der Möbel — genau darum geht es: Die Anzahl der Lichter soll sich nicht
  // bei jeder Bearbeitung ändern, weil Three.js sonst sämtliche Shader neu übersetzt.
  const lichtPoolRef = useRef([])
  // Was der Möbel-Effekt pro Bild zu tun hat: die Platzhalter der eingeschalteten Leuchten auf den
  // Vorrat verteilen. Eigener Haken neben frameTickRef, weil dieser dem Struktur-Effekt gehört und
  // die beiden Effekte unabhängig voneinander laufen sollen.
  const moebelTickRef = useRef(null)

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

  // Fenster-Größenänderung per Eck-Anfasser (Teil 2, gleiches Prinzip wie bereichAuswahl unten,
  // nur für Fenster statt Wandmaterial-Bereiche und ohne Löschen-Badge — Löschen läuft weiter über
  // die Liste im linken Panel). Nur für item.typ === 'fenster' befüllt, nie für Türen.
  const wandElementHandleStartRef = useRef(() => {}) // startElementHandleDrag(id, ecke) — vom Effekt befüllt
  const [fensterAuswahl, setFensterAuswahl] = useState(null) // { id, ecken:{tl,tr,bl,br}, breiteCm, hoeheCm } | null

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

  // Decken-Fokus (Phase 6, Teilschritt 1): analog zu fokusWandRef oben — ändert sich bei
  // DeckenAnsicht3D zwar praktisch nie während der Lebenszeit der Komponente (die Prop ist dort
  // immer `true`), lebt aber aus Konsistenzgründen nach demselben Muster als Ref, damit der schwere
  // Szenen-Effekt unten ihn lesen kann, ohne ihn als Dependency zu führen.
  const deckenFokusRef = useRef(deckenFokus)
  useEffect(() => {
    deckenFokusRef.current = deckenFokus
  }, [deckenFokus])

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
    if (fensterAuswahl !== null) setFensterAuswahl(null)
    setAusgewaehltesWandElement(null)
    // Nur der State-Setter, nicht der Ref+State-Wrapper setZeichenModusMaterial — Refs dürfen
    // laut react-hooks/refs nicht während des Renderns mutiert werden (dieser Reset läuft direkt
    // im Render-Body, siehe Kommentar oben). Die Ref wird stattdessen im fokusWandRef-Sync-Effect
    // oben zurückgesetzt (reine Ref-Mutation dort, unproblematisch).
    if (zeichenModusMaterial !== null) setZeichenModusMaterialState(null)
    if (zeichnenLiveGroesse !== null) setZeichnenLiveGroesse(null)
  }

  // Lädt die echten 3D-Modelle (siehe scene/modelle.js) — seit App-schneller-machen Schritt 2 nur
  // noch die, die für die tatsächlich im Raum vorhandenen Möbeltypen gebraucht werden, statt
  // pauschal alle hinterlegten. Läuft bei jeder Änderung der Möbelliste erneut (z.B. wenn ein neues
  // Möbelstück mit eigenem Modell hinzukommt) — bereits geladene Namen sind dabei günstig (siehe
  // modelle.js). modelleVersion zählt nur hoch, wenn dabei tatsächlich etwas NEU geladen wurde, und
  // triggert dann über die Dependency-Liste weiter unten einen Neuaufbau der Szene, damit frisch
  // geladene Modelle auch erscheinen, falls die Szene vorher schon (ohne sie) gebaut wurde.
  const [modelleVersion, setModelleVersion] = useState(0)
  useEffect(() => {
    const benoetigteNamen = [...new Set(furniture.map(f => f.name))]
    const fehlend = benoetigteNamen.filter(name => !getModell(name))
    if (fehlend.length === 0) return
    ladeModelle(fehlend).then(() => setModelleVersion(v => v + 1))
  }, [furniture])

  // App schneller machen, Schritt 3, Teilpunkt 4.2: getrennte Auslöser für Wandelemente und Möbel.
  // Der schwere Szenen-Effekt weiter unten hing bisher an der kompletten furniture-Liste — jede
  // Möbel-Änderung erzeugt dort eine neue Array-Referenz und damit einen kompletten Neuaufbau,
  // auch für Teile, die davon gar nicht betroffen sind. Diese beiden "Fingerabdrücke" ändern sich
  // dagegen nur, wenn sich an ihrem jeweiligen Teil inhaltlich wirklich etwas geändert hat, und
  // dienen ab jetzt als Auslöser. Vorbereitung für Teilpunkt 4.5, wo Wände/Fenster/Türen und
  // Möbel/Deckenleuchten in zwei getrennte Effekte wandern und dann jeweils nur noch ihren eigenen
  // Fingerabdruck als Auslöser bekommen.
  const wandElementeSignatur = useMemo(() => JSON.stringify(furniture.filter(f => f.istWandElement)), [furniture])
  const moebelSignatur = useMemo(() => JSON.stringify(furniture.filter(f => !f.istWandElement)), [furniture])

  // Die Möbelliste selbst liest der schwere Effekt ab jetzt über diese Ref (Muster wie tageszeitRef
  // aus Teilpunkt 2) statt direkt aus furniture — sonst müsste furniture weiterhin in seiner
  // Abhängigkeitsliste stehen und die beiden Fingerabdrücke oben wären wirkungslos. Dieser
  // Sync-Effekt steht bewusst VOR dem schweren Effekt: React führt Effekte in der Reihenfolge ihrer
  // Deklaration aus, die Ref ist beim Lauf des schweren Effekts also immer schon aktuell.
  const furnitureRef = useRef(furniture)
  useEffect(() => {
    furnitureRef.current = furniture
  }, [furniture])

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

  // === LEBENSZYKLUS-EFFEKT (App schneller machen, Schritt 3, Teilpunkt 4.4) ===
  // Erzeugt Szene, Kamera, Renderer, Render-Schleife und Größenbeobachtung EINMALIG beim Mount und
  // räumt sie erst beim Unmount wieder ab. Vorher passierte das alles im schweren Szenen-Effekt
  // weiter unten, also bei jeder Raum-/Möbel-Änderung erneut — inklusive eines komplett neuen
  // WebGL-Kontexts samt neuem Canvas im DOM. Der schwere Effekt baut weiterhin seinen kompletten
  // Inhalt bei jeder Änderung neu (das ändert erst Teilpunkt 4.5), benutzt dafür aber ab jetzt die
  // hier erzeugte, dauerhaft bestehende Szene/Kamera.
  // Steht bewusst VOR dem schweren Effekt: React führt Effekte in Deklarationsreihenfolge aus, die
  // drei Refs sind beim ersten Lauf des schweren Effekts dadurch bereits befüllt.
  useEffect(() => {
    const mount = mountRef.current
    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#F5F4F0')
    scene.fog = new THREE.Fog('#F5F4F0', 20, 40)
    // Seit Teilpunkt 4.1 eine gecachte, dauerhaft gültige Textur — wird deshalb hier auch nicht
    // mehr disposed (siehe Aufräumen unten).
    scene.environment = erzeugeUmgebungsTextur()

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

    sceneRef.current = scene
    cameraRef.current = camera
    rendererRef.current = renderer

    // Rendergröße an Container anpassen (Fenster-Resize, Panel ein-/ausblenden, Mobile-Rotation).
    // Alles, was darüber hinaus vom aktuellen Szeneninhalt abhängt (Wand-Fokus neu einpassen,
    // Auswahl-Markierungen neu berechnen), liegt in onResizeExtraRef und wird vom schweren Effekt
    // bei jedem seiner Läufe frisch hinterlegt — so arbeitet es nie mit veralteten Wänden.
    const onResize = () => {
      const neueBreite = mount.clientWidth
      const neueHoehe = mount.clientHeight
      if (neueBreite === 0 || neueHoehe === 0) return
      camera.aspect = neueBreite / neueHoehe
      camera.updateProjectionMatrix()
      renderer.setSize(neueBreite, neueHoehe)
      onResizeExtraRef.current?.()
    }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(mount)

    // Lokale Kopie für das Abräumen unten: Das Feld selbst wird nie ausgetauscht, nur an Ort und
    // Stelle verändert — die Kopie zeigt also immer auf denselben Vorrat.
    const lichtPool = lichtPoolRef.current
    let frameId
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      frameTickRef.current?.()
      moebelTickRef.current?.()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      raeumeLichtPoolAb(scene, lichtPool)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    // App schneller machen, Schritt 3, Teilpunkt 4.2: Diese beiden Zeilen sehen nutzlos aus, sind
    // es aber nicht — die beiden Fingerabdrücke sind die eigentlichen Auslöser dieses Effekts
    // (siehe Abhängigkeitsliste ganz unten), werden im Körper aber nicht gebraucht, weil die
    // Möbelliste über furnitureRef kommt. Ohne diesen bewussten Zugriff meldet
    // react-hooks/exhaustive-deps sie als überflüssige Abhängigkeit. BITTE NICHT ENTFERNEN.
    void wandElementeSignatur

    const mount = mountRef.current

    // Seit Teilpunkt 4.4 kommen Szene, Kamera und Renderer aus dem Lebenszyklus-Effekt weiter oben
    // (einmalig beim Mount erzeugt) statt hier bei jedem Neuaufbau neu. Die Abfrage ist reine
    // Absicherung: der Lebenszyklus-Effekt ist zuerst deklariert und läuft deshalb immer zuerst.
    const scene = sceneRef.current
    const camera = cameraRef.current
    const renderer = rendererRef.current
    if (!scene || !camera || !renderer) return

    // App schneller machen, Schritt 3, Teilpunkt 4.3: Alles, was dieser Effekt baut, hängt unter
    // dieser Gruppe statt direkt an der Szene — inklusive der Lichter (die beleuchten die Szene
    // unabhängig davon, an welcher Stelle im Szenenbaum sie hängen). Die Gruppe sitzt ohne eigene
    // Verschiebung/Drehung im Ursprung, alle Weltpositionen bleiben also unverändert. Seit
    // Teilpunkt 4.4 ist sie zusätzlich die Trennlinie zur dauerhaft bestehenden Szene: beim
    // Aufräumen wird genau dieser Teilbaum abgeräumt und die Gruppe aus der Szene entfernt, alles
    // andere in der Szene bleibt unangetastet.
    const raumWurzel = new THREE.Group()
    scene.add(raumWurzel)

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

    // Decken-Fokus (Phase 6, Teilschritt 1 — 4. Nachbesserung nach Hassans Feedback "lieber zoom
    // etwas weiter raus und der Blickwinkel weiter runter"): die vorherige Zielwinkel-Rechnung
    // (28° anvisiert, aber per min() auf den Sicherheitsabstand-Deckel begrenzt) wurde bei
    // realistischen Raumtiefen so gut wie immer vom Deckel überschrieben — real gerendert kam dabei
    // eher ein ~45°-Winkel heraus, nie die anvisierten 28°. Ein weiteres Absenken des Zielwinkels
    // hätte deshalb nichts mehr bewirkt. Stattdessen jetzt direkt: (1) der maximal sichere Versatz
    // wird IMMER voll ausgenutzt (kein Zielwinkel-Zwischenschritt mehr, kein Deckel-Überraschungseffekt),
    // (2) die Kamera steht spürbar höher über dem Boden, was den Höhenunterschied zur Decke und
    // damit den Aufwinkel bei gleichem Versatz zusätzlich verringert, (3) ein engeres Sichtfeld nur
    // in diesem Modus (Tele-Effekt) lässt die Szene komprimierter/weiter entfernt wirken und nimmt
    // der Weitwinkel-Perspektive die Verzerrung — ohne dass die Kamera den Raum verlassen müsste.
    // Sicherheitsabstand bleibt dem SICHERHEITSABSTAND-Muster von berechneWandFokusZiel weiter unten
    // treu, nur etwas knapper gefasst, um mehr Rückzugsraum zu gewinnen.
    if (deckenFokusRef.current) {
      // 8. Nachbesserung nach Hassans Referenz-Screenshot ("das ist der Blickwinkel den ich sehen
      // möchte"): Kamera steht jetzt wieder außerhalb des Raums (wie in der 2. Nachbesserung), dieses
      // Mal aber mit derselben bewährten "Ziel in den Frustum einpassen"-Technik wie beim Wand-Fokus
      // (berechneWandFokusZiel weiter unten) statt einer festen Distanz: die Distanz wird so gewählt,
      // dass sowohl die volle Deckenhöhe (hoehenFitDistanz) als auch die volle Raumbreite
      // (breitenFitDistanzReferenz, am festen 16:9-Referenzformat entschieden und danach aufs aktuelle
      // Seitenverhältnis übertragen — derselbe Trick, der dort schon ein Abschneiden bei schmalen
      // Fenstern verhindert) ins Bild passen. Kamera auf halber Wandhöhe statt knapp über dem Boden —
      // dadurch sind Boden und Decke symmetrisch im Bild verteilt (Blick ist waagerecht, kein
      // Winkelhalbierende-Trick mehr nötig wie in der 7. Nachbesserung). Kein Sicherheitsabstand/keine
      // Raumgrenze mehr nötig, die Kamera darf jetzt bewusst außerhalb des Raums stehen. Die vordere
      // Wand wird weiter unten direkt nach dem Wände-Bauen ausgeblendet.
      const fovY = camera.fov * Math.PI / 180
      const hoehenFitDistanz = (wandHoehe / 2) / Math.tan(fovY / 2)
      const REFERENZ_ASPEKT = 16 / 9
      const fovXReferenz = 2 * Math.atan(Math.tan(fovY / 2) * REFERENZ_ASPEKT)
      const breitenFitDistanzReferenz = (raumBreite / 2) / Math.tan(fovXReferenz / 2)
      const zielDistanzOhneRand = Math.max(hoehenFitDistanz, breitenFitDistanzReferenz)
      const zielBreiteMeter = 2 * zielDistanzOhneRand * Math.tan(fovXReferenz / 2)
      const fovXAktuell = 2 * Math.atan(Math.tan(fovY / 2) * camera.aspect)
      const distanzFuerZielBreiteAktuell = zielBreiteMeter / (2 * Math.tan(fovXAktuell / 2))
      const RAND_FAKTOR = 1.6
      const deckenFokusVersatz = Math.max(zielDistanzOhneRand, distanzFuerZielBreiteAktuell) * RAND_FAKTOR
      camera.position.set(0, wandHoehe / 2, deckenFokusVersatz)
      camera.lookAt(0, wandHoehe / 2, 0)
    }

    // === TEXTUREN (einmal pro Szene erzeugt, mehrfach verwendet) ===
    const holzTextur = erzeugeHolzTextur()
    const backsteinTextur = erzeugeBacksteinTextur()
    // wandTextur wird jetzt pro Wand einzeln über wandTexturFuer() erzeugt (siehe unten), da
    // jede Wand ihr eigenes Material haben kann. scene.environment wird seit Teilpunkt 4.4
    // einmalig im Lebenszyklus-Effekt gesetzt und nicht mehr hier.

    // === BELEUCHTUNG ===
    beleuchtungRef.current = baueBeleuchtung(raumWurzel, eckpunkte, mitteX, mitteZ, raumBreite, raumTiefe, wandHoehe, tageszeitRef.current)

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
    raumWurzel.add(boden)

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
    raumWurzel.add(decke)

    // === WÄNDE (eine je Wandsegment, Transparenz wird dynamisch gesetzt, jede Wand einzeln
    // einfärbbar) ===
    // Wandfarbe: room.wandfarben ist seit Schritt 9a nach Segmentindex geschlüsselt (statt nach
    // Himmelsrichtung) — funktioniert damit für jede Segmentanzahl/-form, nicht nur für die vier
    // festen Rechteckwände.
    const wandFarbeFuer = (index) => room?.wandfarben?.[index] || room?.wandfarbe || '#FFFFFF'
    const wandMaterialFuer = (index) => room?.wandmaterialien?.[index] || room?.wandmaterial || 'wand-putz'
    // Textur je Kombination aus Material UND Flächengröße erzeugen und zwischenspeichern (Map).
    // Seit Optimierung 3 hängt die Musterdichte an der realen Flächengröße (siehe
    // WAND_MUSTER_GROESSE in texturen.js), damit ein Muster auf jeder Wand gleich groß aussieht.
    // Gleich große Flächen mit demselben Material teilen sich über den Schlüssel weiterhin eine
    // einzige Instanz — in einem Rechteckraum also zwei statt vier.
    const wandTexturCache = new Map()
    const wandTexturFuer = (material, breiteM, hoeheM) => {
      const schluessel = `${material}|${(breiteM || 0).toFixed(3)}|${(hoeheM || 0).toFixed(3)}`
      if (!wandTexturCache.has(schluessel)) {
        wandTexturCache.set(schluessel, erzeugeWandTexturFuerFlaeche(material, breiteM, hoeheM))
      }
      return wandTexturCache.get(schluessel)
    }
    // map + color: MeshStandardMaterial multipliziert beide miteinander, die Musterstruktur bleibt
    // dadurch mit jeder der 27 Wandfarben einfärbbar, ohne dass die Farbwahl selbst hier angefasst
    // werden muss. laenge ist die tatsächliche Länge des Wandsegments — zusammen mit der Raumhöhe
    // ergibt das die reale Flächengröße für die Musterdichte.
    const wandMatFuer = (index, laenge) => new THREE.MeshStandardMaterial({ color: wandFarbeFuer(index), map: wandTexturFuer(wandMaterialFuer(index), laenge, wandHoehe), roughness: 0.9, metalness: 0.0, transparent: true, opacity: 1 })

    const segmente = wandSegmente(eckpunkte)

    // FENSTER_HOEHE_3D/TUER_HOEHE_3D müssen mit FENSTER_HOEHE/TUER_HOEHE aus wandelemente.js
    // übereinstimmen (dort nicht exportiert, deshalb hier separat dupliziert). Türen mit eigener
    // Höhe (item.hoeheReal, z.B. Hauseingangstür) überschreiben TUER_HOEHE_3D an allen
    // Verwendungsstellen unten. Schon hier oben deklariert (statt erst bei der Fenster/Tür-
    // Anklicken-Logik weiter unten wie bisher), weil wandGeometrieFuerSegment direkt darunter
    // (Phase 4, Teil 3a) schon einen Höhen-Fallback für offene Durchgänge braucht.
    const FENSTER_HOEHE_3D = 1.2
    const TUER_HOEHE_3D = 2.1
    const MIN_FENSTER_GROESSE = 0.3

    // Offener Durchgang (Phase 4, Teil 3a): baut die Geometrie eines Wandsegments — normalerweise
    // ein einfaches Rechteck, bei einem oder mehreren offenen Durchgängen auf diesem Segment ein
    // Rechteck MIT rechteckigen Löchern darin (THREE.Shape + shape.holes, dieselbe Technik wie
    // schon beim Boden per ShapeGeometry, siehe Kommentar dort — nur mit Loch). Zentriert wie
    // PlaneGeometry (Ursprung in der Mitte), damit wand.position.set(...) unten unverändert
    // funktioniert und die UV-Koordinaten (an der Bounding-Box der äußeren Kontur orientiert) mit
    // der bisherigen PlaneGeometry deckungsgleich bleiben. `live` überschreibt währenddessen
    // optional EINEN Durchgang (während eines laufenden Zieh-Vorgangs in wandElementMausMove) mit
    // den aktuellen, noch nicht committeten Werten — alle anderen Durchgänge auf dem Segment
    // kommen unverändert aus furniture.
    const wandGeometrieFuerSegment = (segmentIndex, seg, live) => {
      const durchgaenge = furnitureRef.current.filter(f => f.istWandElement && f.typ === 'durchgang' && f.wandSegment === segmentIndex)
      if (durchgaenge.length === 0) return new THREE.PlaneGeometry(seg.laenge, wandHoehe)
      const halbBreite = seg.laenge / 2
      const halbHoehe = wandHoehe / 2
      const shape = new THREE.Shape([
        new THREE.Vector2(-halbBreite, -halbHoehe),
        new THREE.Vector2(halbBreite, -halbHoehe),
        new THREE.Vector2(halbBreite, halbHoehe),
        new THREE.Vector2(-halbBreite, halbHoehe),
      ])
      durchgaenge.forEach(item => {
        const werte = (live && live.id === item.id)
          ? live
          : { u: item.wandPosition || 0, breite: item.width / 60, hoehe: item.hoeheReal ?? TUER_HOEHE_3D }
        const uLinks = Math.max(0, Math.min(werte.u, seg.laenge - werte.breite))
        const uRechts = uLinks + werte.breite
        if (item.stil === 'bogen') {
          // Rundbogen-Durchgang (Phase 4, Teil 3b; seit Optimierung 2 eine halbe Ellipse innerhalb
          // einer festen Gesamthöhe): werte.hoehe ist die Gesamthöhe der Öffnung, bogenMasse()
          // teilt sie in geraden Teil und Bogen auf (siehe constants.js). Beim Breiterziehen bleibt
          // die Oberkante damit stehen und der Bogen wird flacher, statt nach oben zu wachsen. Der
          // nach außen versetzte Rand für die optionale Backstein-Einfassung (scene/wandelemente.js)
          // verwendet denselben Mittelpunkt mit in beiden Richtungen um die Rahmenbreite größeren
          // Radien — das ergibt an den Kämpferpunkten weiterhin einen sauberen Übergang.
          const radius = werte.breite / 2
          const uMitte = (uLinks + uRechts) / 2
          const gesamtHoehe = Math.max(0, Math.min(wandHoehe, werte.hoehe))
          const { kaempferHoehe, bogenHoehe } = bogenMasse(werte.breite, gesamtHoehe)
          const pfad = new THREE.Path()
          pfad.moveTo(uLinks - halbBreite, -halbHoehe)
          pfad.lineTo(uRechts - halbBreite, -halbHoehe)
          pfad.lineTo(uRechts - halbBreite, kaempferHoehe - halbHoehe)
          pfad.absellipse(uMitte - halbBreite, kaempferHoehe - halbHoehe, radius, bogenHoehe, 0, Math.PI, false, 0)
          pfad.lineTo(uLinks - halbBreite, -halbHoehe)
          shape.holes.push(pfad)
        } else {
          const vOben = Math.min(wandHoehe, werte.hoehe)
          shape.holes.push(new THREE.Path([
            new THREE.Vector2(uLinks - halbBreite, -halbHoehe),
            new THREE.Vector2(uRechts - halbBreite, -halbHoehe),
            new THREE.Vector2(uRechts - halbBreite, vOben - halbHoehe),
            new THREE.Vector2(uLinks - halbBreite, vOben - halbHoehe),
          ]))
        }
      })
      return new THREE.ShapeGeometry(shape)
    }

    // Für updateCamera unten: pro Wand Mesh + 3D-Normale (2D-Normale direkt auf X/Z übernommen,
    // wie schon bei allen anderen Konvertierungen in dieser Datei/trennwaende.js/wandelemente.js).
    const wandMeshe = segmente.map(segment => {
      const x1 = segment.start.x - mitteX, z1 = segment.start.y - mitteZ
      const x2 = segment.ende.x - mitteX, z2 = segment.ende.y - mitteZ
      const wandGeo = wandGeometrieFuerSegment(segment.index, segment)
      const wand = new THREE.Mesh(wandGeo, wandMatFuer(segment.index, segment.laenge))
      wand.position.set((x1 + x2) / 2, wandHoehe / 2, (z1 + z2) / 2)
      wand.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
      wand.receiveShadow = true
      raumWurzel.add(wand)
      return {
        mesh: wand, normale: { x: segment.normale.x, z: segment.normale.y }, laenge: segment.laenge,
        x1, z1, dx: x2 - x1, dz: z2 - z1,
      }
    })

    // Decken-Fokus (8. Nachbesserung): die jetzt vor der weit außerhalb stehenden Kamera liegende
    // Wand ausblenden, sonst blockiert sie die komplette Sicht in den Raum — dieselbe Formel wie beim
    // Wände-Ausblenden der normalen Rundumblick-Kamera weiter unten (updateOrbitCamera): eine Wand
    // wird transparent, sobald ihre nach außen zeigende Normale zur Kamera zeigt. Einmalig hier beim
    // Szenenaufbau gesetzt (nicht in updateCamera), weil sich die Decken-Fokus-Kamera danach nicht
    // mehr bewegt. Die anderen 3 Wände samt ihrer Wandmaterial-Deko bleiben unverändert sichtbar.
    if (deckenFokusRef.current) {
      wandMeshe.forEach(({ mesh, normale }) => {
        const versteckt = camera.position.x * normale.x + camera.position.z * normale.z > 0
        mesh.material.opacity = versteckt ? 0 : 1
        mesh.material.transparent = versteckt
      })
    }

    // Sockelleisten — eine Leiste je Wandsegment, volle Segmentlänge, nach innen versetzt um die
    // halbe Dicke entlang der Segment-Normale (ersetzt die 4 festen ±0.02-Offsets). An Außenecken
    // überlappen sich zwei Leisten geringfügig, wie schon bei den bisherigen 4 Leisten — siehe
    // Notiz zu einspringenden Ecken für Schritt 9.
    if (fussleiste) {
      const sockelMat = new THREE.MeshLambertMaterial({ color: fussleisteFarbe || '#E0DDD8' })
      segmente.forEach(segment => {
        // Decken-Fokus: keine Sockelleiste für ein Wandsegment bauen, dessen Wand gerade ausgeblendet
        // ist — sonst würde die Leiste sichtbar ohne die dazugehörige Wand im Bild "schweben".
        if (deckenFokusRef.current) {
          const versteckt = camera.position.x * segment.normale.x + camera.position.z * segment.normale.y > 0
          if (versteckt) return
        }
        const x1 = segment.start.x - mitteX, z1 = segment.start.y - mitteZ
        const x2 = segment.ende.x - mitteX, z2 = segment.ende.y - mitteZ
        const sockel = new THREE.Mesh(new THREE.BoxGeometry(segment.laenge, 0.08, 0.04), sockelMat)
        sockel.position.set(
          (x1 + x2) / 2 - segment.normale.x * 0.02,
          0.04,
          (z1 + z2) / 2 - segment.normale.y * 0.02,
        )
        sockel.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
        raumWurzel.add(sockel)
      })
    }

    // === TRENNWÄNDE, WANDELEMENTE & MÖBEL ===
    baueTrennwaende(raumWurzel, room?.trennwaende, raumBreite, raumTiefe, wandHoehe)

    // Referenz auf jede gebaute Fenster/Tür-Gruppe + ihr furniture-Item — Grundlage fürs
    // Anklicken/Ziehen im Wand-Fokus-Modus weiter unten.
    // App schneller machen, Schritt 3, Teilpunkt 4.5: Dieser Effekt baut nur noch die Wandelemente
    // (Fenster/Türen/Durchgänge). Normale Möbel und Deckenleuchten samt ihrer Anfasser baut der
    // Möbel-Effekt weiter unten in einer eigenen Gruppe — dadurch löst eine Möbel-Änderung hier
    // keinen Neuaufbau von Wänden/Boden/Licht/Kamera mehr aus.
    const wandElementGruppen = []
    furnitureRef.current.forEach(item => {
      if (!item.istWandElement) return
      // 8. Nachbesserung nach Hassans Feedback "ich möchte keine Fenster oder Türen sehen": anders
      // als in der 3. Nachbesserung entschieden (dort bewusst als "Teil der Architektur" sichtbar
      // gelassen) werden Fenster-/Tür-Wandelemente in der Decken-Ansicht jetzt genauso wenig gebaut
      // wie normale Möbel. In jeder anderen Ansicht ändert sich nichts.
      if (!deckenFokusRef.current) {
        const gruppe = baueWandElement(raumWurzel, item, raumBreite, raumTiefe, wandHoehe, eckpunkte, holzTextur, backsteinTextur)
        wandElementGruppen.push({ gruppe, item })
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
      const mat = new THREE.MeshStandardMaterial({ map: wandTexturFuer(bereich.material, bereich.breite, bereich.hoehe), roughness: 0.9, metalness: 0.0 })
      const mesh = new THREE.Mesh(geo, mat)
      const t = (bereich.u + bereich.breite / 2) / (segment.laenge || 1)
      mesh.position.set(
        segment.x1 + segment.dx * t - segment.normale.x * WAND_BEREICH_VERSATZ,
        bereich.v + bereich.hoehe / 2,
        segment.z1 + segment.dz * t - segment.normale.z * WAND_BEREICH_VERSATZ,
      )
      mesh.rotation.copy(segment.mesh.rotation)
      mesh.userData.wandBereichId = bereich.id
      raumWurzel.add(mesh)
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
      const RAND_FAKTOR = 1.2
      // fovY/hoehenFitDistanz hängen NICHT von camera.aspect ab — die Höhen-Einpassung ist also
      // bei jedem Fensterformat automatisch korrekt, unverändert zu vorher.
      const hoehenFitDistanz = (wandHoehe / 2) / Math.tan(fovY / 2)
      // Bei den meisten Räumen ist eine Wand deutlich breiter als hoch — reines "ganze Wand ins
      // Bild einpassen" würde dann von der Breite dominiert, die Kamera müsste so weit zurück,
      // dass oben/unten ein großer leerer Decken-/Boden-Streifen sichtbar wird (siehe Hassans
      // Screenshot-Feedback). Deshalb primär an der Wandhöhe ausrichten und die Distanz nur noch
      // begrenzt in Richtung Breiten-Fit erweitern (max. 35% mehr als der reine Höhen-Fit) — bei
      // sehr breiten Wänden ist dadurch nicht mehr zwingend die komplette Breite im Bild, dafür
      // füllt die Wand den Ausschnitt vertikal wie gewünscht. Bei normalen/schmalen Wänden (Höhen-
      // Fit ohnehin schon der größere Wert) ändert sich nichts.
      //
      // WICHTIG (Bugfix): diese Breiten-Entscheidung wird an einem FESTEN Referenz-Seitenverhältnis
      // getroffen, nicht am aktuellen Browserfenster (camera.aspect) — sonst würde ein schmaleres
      // Fenster rückwirkend weniger Wandbreite erlauben und die Wand seitlich abschneiden, obwohl
      // bei einem breiteren Fenster genug Platz da wäre (genau der gemeldete Bug: kleiner Monitor
      // schneidet ab, größerer nicht). Das Referenz-Verhältnis legt nur fest, wie viele Meter
      // Wandbreite mindestens sichtbar sein sollen — am tatsächlich aktuellen Fensterformat wird
      // weiter unten die Distanz gesucht, die diese Breite auch wirklich zeigt.
      const MAX_BREITEN_AUFSCHLAG = 1.35
      const REFERENZ_ASPEKT = 16 / 9
      const fovXReferenz = 2 * Math.atan(Math.tan(fovY / 2) * REFERENZ_ASPEKT)
      const breitenFitDistanzReferenz = (laenge / 2) / Math.tan(fovXReferenz / 2)
      const zielDistanzOhneRand = Math.min(
        Math.max(hoehenFitDistanz, breitenFitDistanzReferenz),
        hoehenFitDistanz * MAX_BREITEN_AUFSCHLAG,
      )
      const zielBreiteMeter = 2 * zielDistanzOhneRand * Math.tan(fovXReferenz / 2)

      // Am AKTUELLEN Seitenverhältnis die Distanz finden, die mindestens zielBreiteMeter zeigt —
      // ist das Fenster schmaler als die Referenz, muss die Kamera weiter zurück; ist es breiter,
      // reicht schon zielDistanzOhneRand selbst (Math.max greift dann nicht).
      const fovXAktuell = 2 * Math.atan(Math.tan(fovY / 2) * camera.aspect)
      const distanzFuerZielBreiteAktuell = zielBreiteMeter / (2 * Math.tan(fovXAktuell / 2))
      const gewuenschteDistanz = Math.max(zielDistanzOhneRand, distanzFuerZielBreiteAktuell) * RAND_FAKTOR
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
      // Decken-Fokus (Phase 6, Teilschritt 1): Kamera bleibt exakt an der beim Szenenaufbau oben
      // gesetzten Position/Rotation stehen — kein Orbit, kein Rundgang. Ohne diesen Wächter würde
      // der initiale updateCamera()-Aufruf gleich darunter (und jeder spätere über
      // updateCameraRef.current, z.B. bei Resize) die sorgfältig gesetzte Draufsicht sofort wieder
      // mit der Orbit-Kamera überschreiben.
      if (deckenFokusRef.current) return
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

    // === DECKENLEUCHTE ANKLICKEN + VERSCHIEBEN (Decken-Fokus-Modus, Phase 6) ===
    // Teilschritt 1: reine Auswahl per Klick für Kronleuchter/Pendelleuchte/Deckenlampe — die
    // bleiben fest/mittig platziert (siehe FurnitureContext.addFurniture), kein Ziehen nötig.
    // Teilschritt 2: Spot und Spot-Reihe sind zusätzlich frei auf der Decke verschiebbar (siehe
    // istVerschiebbareDeckenleuchte in constants.js) — deckenleuchteMausDown erkennt das, merkt
    // sich den Versatz zwischen Klickpunkt und Möbelmittelpunkt in deckenleuchteDrag,
    // deckenleuchteMausMove schneidet den Mauszeiger laufend gegen eine horizontale Ebene auf
    // Deckenhöhe (deckenEbene, gleiches Prinzip wie ebeneFuerSegment für Wände) und rechnet den
    // Treffpunkt über dieselbe px<->Meter-Formel wie scene/moebel.js (berechneInnenmasse) in
    // item.left/item.top um, deckenleuchteMausUp committed einmalig über onDeckenleuchteBewegt
    // (Vorbild: onWandElementBewegt beim Wand-Fokus-Ziehen). Nutzt dieselbe geteilte Auswahl
    // (selectedId/setSelectedId aus FurnitureContext) wie der Rest der App, damit z.B. die
    // Leuchten-Liste im Licht-Schritt (LichtSchritt.jsx) dieselbe Auswahl auch farblich hervorheben
    // kann. Ein Ring-Mesh knapp unter der Decke markiert die aktuell ausgewählte Leuchte visuell.
    // Seit Teilpunkt 4.5 wird dieser Ring (wie die Leuchten selbst und ihre Anfasser) im
    // Möbel-Effekt weiter unten gebaut; die Handler hier holen ihn über moebelGruppenRef.
    const deckenEbene = new THREE.Plane(new THREE.Vector3(0, 1, 0), -wandHoehe)
    const { innenBpx: deckenInnenBpx, innenTpx: deckenInnenTpx } = berechneInnenmasse(raumBreite, raumTiefe)
    let deckenleuchteDrag = null // { eintrag, offsetX, offsetZ, bewegt, neueX, neueZ }
    // Ziehen an einem Endpunkt-Anfasser des LED-Streifens (Phase 6, Teilschritt 3) — ankerWelt ist
    // die Weltposition des JEWEILS ANDEREN Endpunkts, einmalig bei Klickbeginn ermittelt und danach
    // fix, damit dieser beim Ziehen exakt stehen bleibt (siehe deckenleuchteMausMove).
    let ledEndpunktDrag = null // { eintrag, ende, ankerWelt, bewegt, neueLaenge, neueRotationRad, mitteX, mitteZ }
    // Ziehen am Eck-Anfasser des LED-Panels (Phase 6, Teilschritt 4) — urspruenglicheHalbeSeite ist
    // die halbe Kantenlänge beim Klickbeginn (item.width/120, unskaliert), Grundlage für den
    // Skalierungsfaktor in deckenleuchteMausMove (gruppe.scale.x/z = neueHalbeSeite /
    // urspruenglicheHalbeSeite). Position/Rotation der Gruppe werden dabei nicht angefasst.
    let panelGriffDrag = null // { eintrag, urspruenglicheHalbeSeite, bewegt, neueHalbeSeite }

    const deckenleuchteMausDown = (clientX, clientY) => {
      // App schneller machen, Schritt 3, Teilpunkt 4.5: Leuchten, Anfasser und Auswahl-Ring kommen
      // jetzt aus dem Möbel-Effekt; hier im Moment des Klicks ausgelesen, damit dieser Handler
      // immer mit dem aktuellen Stand arbeitet, auch wenn der Möbel-Effekt zwischenzeitlich neu
      // gebaut hat, ohne dass dieser Effekt neu gelaufen ist.
      const moebelTeile = moebelGruppenRef.current
      if (!moebelTeile) return
      const { deckenleuchtenGruppen, ledGriffe, panelGriffe, deckenleuchteRing } = moebelTeile
      const rect = mount.getBoundingClientRect()
      zeigerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1
      zeigerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(zeigerNDC, camera)

      // Endpunkt-Anfasser zuerst prüfen (Phase 6, Teilschritt 3) — sitzen nah am Streifenkörper,
      // sollen aber Vorrang vor dem normalen Verschieben des ganzen Streifens haben.
      const griffTreffer = raycaster.intersectObjects(ledGriffe.map(g => g.mesh))
      if (griffTreffer.length > 0) {
        const griff = ledGriffe.find(g => g.mesh === griffTreffer[0].object)
        if (griff) {
          const halbeLaengeM = griff.eintrag.item.width / 120
          const ankerLokal = new THREE.Vector3(-griff.ende * halbeLaengeM, -0.01, 0)
          const ankerWelt = griff.eintrag.gruppe.localToWorld(ankerLokal)
          ledEndpunktDrag = { eintrag: griff.eintrag, ende: griff.ende, ankerWelt, bewegt: false }
          deckenleuchteRing.visible = false
          onDeckenleuchteAusgewaehlt?.(griff.eintrag.item.id)
          return
        }
      }

      // Eck-Anfasser des LED-Panels (Phase 6, Teilschritt 4) — analog zu den Endpunkt-Anfassern
      // oben, ebenfalls mit Vorrang vor dem normalen Verschieben des ganzen Panels.
      const panelGriffTreffer = raycaster.intersectObjects(panelGriffe.map(g => g.mesh))
      if (panelGriffTreffer.length > 0) {
        const griff = panelGriffe.find(g => g.mesh === panelGriffTreffer[0].object)
        if (griff) {
          panelGriffDrag = { eintrag: griff.eintrag, urspruenglicheHalbeSeite: griff.halbeSeite, bewegt: false }
          deckenleuchteRing.visible = false
          onDeckenleuchteAusgewaehlt?.(griff.eintrag.item.id)
          return
        }
      }

      const treffer = raycaster.intersectObjects(deckenleuchtenGruppen.map(d => d.gruppe), true)
      if (treffer.length === 0) {
        deckenleuchteRing.visible = false
        onDeckenleuchteAusgewaehlt?.(null)
        return
      }
      // intersectObjects trifft ggf. ein Mesh tief in der Gruppe (Schirm, Glühbirne, Kabel) — am
      // userData.id des Gruppen-Roots entlang nach oben laufen (siehe scene/moebel.js), statt
      // jeden einzelnen Kindmesh selbst zu markieren.
      let obj = treffer[0].object
      while (obj && obj.userData.id === undefined) obj = obj.parent
      const eintrag = deckenleuchtenGruppen.find(d => d.gruppe === obj)
      if (!eintrag) return
      deckenleuchteRing.position.set(eintrag.gruppe.position.x, wandHoehe - 0.02, eintrag.gruppe.position.z)
      deckenleuchteRing.visible = true
      onDeckenleuchteAusgewaehlt?.(eintrag.item.id)

      if (istVerschiebbareDeckenleuchte(eintrag.item.name)) {
        const schnitt = zeigerAufWeltpunkt(clientX, clientY, deckenEbene)
        if (schnitt) {
          deckenleuchteDrag = {
            eintrag,
            offsetX: eintrag.gruppe.position.x - schnitt.x,
            offsetZ: eintrag.gruppe.position.z - schnitt.z,
            bewegt: false,
          }
        }
      }
    }

    const deckenleuchteMausMove = (clientX, clientY) => {
      const deckenleuchteRing = moebelGruppenRef.current?.deckenleuchteRing
      if (!deckenleuchteRing) return
      if (ledEndpunktDrag) {
        const schnitt = zeigerAufWeltpunkt(clientX, clientY, deckenEbene)
        if (!schnitt) return
        const { eintrag, ende, ankerWelt } = ledEndpunktDrag
        const schnittX = Math.max(-raumBreite / 2, Math.min(raumBreite / 2, schnitt.x))
        const schnittZ = Math.max(-raumTiefe / 2, Math.min(raumTiefe / 2, schnitt.z))
        const richtung = new THREE.Vector3(schnittX - ankerWelt.x, 0, schnittZ - ankerWelt.z)
        const laenge = Math.max(0.15, richtung.length())
        richtung.normalize()
        // Weltrichtung der lokalen +X-Achse der Gruppe: zeigt vom Anker weg, wenn der rechte
        // Endpunkt (ende=1) gezogen wird, sonst genau entgegengesetzt.
        const plusXWelt = ende === 1 ? richtung : richtung.clone().negate()
        const rotationRad = Math.atan2(plusXWelt.z, plusXWelt.x)
        const mitteX = ankerWelt.x + richtung.x * laenge * 0.5
        const mitteZ = ankerWelt.z + richtung.z * laenge * 0.5
        eintrag.gruppe.position.set(mitteX, wandHoehe, mitteZ)
        eintrag.gruppe.rotation.y = -rotationRad
        eintrag.gruppe.scale.x = laenge / (eintrag.item.width / 60)
        deckenleuchteRing.visible = false
        ledEndpunktDrag.bewegt = true
        ledEndpunktDrag.neueLaenge = laenge
        ledEndpunktDrag.neueRotationRad = rotationRad
        ledEndpunktDrag.mitteX = mitteX
        ledEndpunktDrag.mitteZ = mitteZ
        return
      }
      if (panelGriffDrag) {
        const schnitt = zeigerAufWeltpunkt(clientX, clientY, deckenEbene)
        if (!schnitt) return
        const { eintrag, urspruenglicheHalbeSeite } = panelGriffDrag
        // Das LED-Panel dreht sich nie (kein Rotations-Regler, bleibt quadratisch/symmetrisch) —
        // deshalb reicht hier die einfache Differenz zum (unveränderten) Gruppenmittelpunkt, ohne
        // die Rotation der Gruppe herausrechnen zu müssen (anders als beim LED-Streifen oben).
        const relX = schnitt.x - eintrag.gruppe.position.x
        const relZ = schnitt.z - eintrag.gruppe.position.z
        const neueHalbeSeite = Math.max(0.1, (Math.abs(relX) + Math.abs(relZ)) / 2)
        const faktor = neueHalbeSeite / urspruenglicheHalbeSeite
        eintrag.gruppe.scale.set(faktor, 1, faktor)
        deckenleuchteRing.visible = false
        panelGriffDrag.bewegt = true
        panelGriffDrag.neueHalbeSeite = neueHalbeSeite
        return
      }
      if (!deckenleuchteDrag) return
      const schnitt = zeigerAufWeltpunkt(clientX, clientY, deckenEbene)
      if (!schnitt) return
      const { eintrag, offsetX, offsetZ } = deckenleuchteDrag
      const neueX = Math.max(-raumBreite / 2, Math.min(raumBreite / 2, schnitt.x + offsetX))
      const neueZ = Math.max(-raumTiefe / 2, Math.min(raumTiefe / 2, schnitt.z + offsetZ))
      eintrag.gruppe.position.set(neueX, wandHoehe, neueZ)
      deckenleuchteRing.position.set(neueX, wandHoehe - 0.02, neueZ)
      deckenleuchteDrag.bewegt = true
      deckenleuchteDrag.neueX = neueX
      deckenleuchteDrag.neueZ = neueZ
    }

    const deckenleuchteMausUp = () => {
      if (ledEndpunktDrag) {
        const { eintrag, bewegt, neueLaenge, neueRotationRad, mitteX, mitteZ } = ledEndpunktDrag
        if (bewegt) {
          const neuesWidthPx = neueLaenge * 60
          const rotationDeg = ((neueRotationRad * 180 / Math.PI) % 360 + 360) % 360
          const rad = (rotationDeg * Math.PI) / 180
          const boundWpx = neuesWidthPx * Math.abs(Math.cos(rad)) + eintrag.item.height * Math.abs(Math.sin(rad))
          const boundHpx = neuesWidthPx * Math.abs(Math.sin(rad)) + eintrag.item.height * Math.abs(Math.cos(rad))
          const centerXpx = ((mitteX + raumBreite / 2) / raumBreite) * deckenInnenBpx
          const centerZpx = ((mitteZ + raumTiefe / 2) / raumTiefe) * deckenInnenTpx
          callbacksRef.current.onDeckenleuchteBewegt?.(eintrag.item.id, {
            left: centerXpx - boundWpx / 2, top: centerZpx - boundHpx / 2,
            width: neuesWidthPx, rotation: rotationDeg,
          })
        }
        ledEndpunktDrag = null
        return
      }
      if (panelGriffDrag) {
        const { eintrag, bewegt, neueHalbeSeite } = panelGriffDrag
        if (bewegt) {
          const neueSeitePx = neueHalbeSeite * 2 * 60
          const centerXpx = ((eintrag.gruppe.position.x + raumBreite / 2) / raumBreite) * deckenInnenBpx
          const centerZpx = ((eintrag.gruppe.position.z + raumTiefe / 2) / raumTiefe) * deckenInnenTpx
          callbacksRef.current.onDeckenleuchteBewegt?.(eintrag.item.id, {
            left: centerXpx - neueSeitePx / 2, top: centerZpx - neueSeitePx / 2,
            width: neueSeitePx, height: neueSeitePx,
          })
        }
        panelGriffDrag = null
        return
      }
      if (!deckenleuchteDrag) return
      const { eintrag, bewegt, neueX, neueZ } = deckenleuchteDrag
      if (bewegt) {
        // Rückrechnung Welt-Meter -> px, exaktes Gegenstück zu centerXpx/centerZpx in
        // scene/moebel.js (baueMoebel) — dieselbe berechneInnenmasse()-Basis wie dort.
        const rad = ((eintrag.item.rotation || 0) * Math.PI) / 180
        const boundWpx = eintrag.item.width * Math.abs(Math.cos(rad)) + eintrag.item.height * Math.abs(Math.sin(rad))
        const boundHpx = eintrag.item.width * Math.abs(Math.sin(rad)) + eintrag.item.height * Math.abs(Math.cos(rad))
        const centerXpx = ((neueX + raumBreite / 2) / raumBreite) * deckenInnenBpx
        const centerZpx = ((neueZ + raumTiefe / 2) / raumTiefe) * deckenInnenTpx
        callbacksRef.current.onDeckenleuchteBewegt?.(eintrag.item.id, { left: centerXpx - boundWpx / 2, top: centerZpx - boundHpx / 2 })
      }
      deckenleuchteDrag = null
    }

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

    const wandElementRaycastZiele = wandElementGruppen.map(w => w.gruppe)
    const wandBereichRaycastZiele = wandBereichGruppen.map(w => w.mesh)
    let wandElementDrag = null // { eintrag, segment, elBreite, elHoehe, offsetU, offsetV, bewegt }
    let wandBereichDrag = null // { eintrag, offsetU, offsetV, bewegt, aktuellU, aktuellV } — Verschieben (Klick auf die Fläche)
    let wandBereichHandleDrag = null // { eintrag, anchorU, anchorV, bewegt, aktuellU, aktuellV, aktuellBreite, aktuellHoehe } — Ecke ziehen
    let wandZeichnenDrag = null // { segment, startU, startV, material, mesh, aktuellU, aktuellV, aktuellBreite, aktuellHoehe } — neuen Bereich aufziehen
    let wandElementHandleDrag = null // { eintrag, segment, anchorU, anchorV, urspruenglicheBreite, urspruenglicheHoehe, bewegt, aktuellU, aktuellV, aktuellBreite, aktuellHoehe } — Fenster-Ecke ziehen

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
        callbacksRef.current.onWandElementBewegt?.(id, { bruestungshoehe: neueHoehe })
        return
      }

      const { uLinksRef, uRechtsRef } = ermittleNachbarGrenzen(eintrag, segment, elBreite)
      let neuesUStart = seite === 'links' ? uLinksRef + wertM : uRechtsRef - wertM - elBreite
      neuesUStart = Math.max(uLinksRef, Math.min(uRechtsRef - elBreite, neuesUStart))
      callbacksRef.current.onWandElementBewegt?.(id, { wandPosition: neuesUStart })
    }
    wandElementRechnerRef.current = setzeMass

    // Fenster-Eck-Anfasser (Teil 2): liefert Bildschirmposition der vier Ecken + aktuelle
    // Breite/Höhe in cm fürs Live-Label — analog zu berechneBereichAuswahl weiter unten, aber aus
    // Fenster-Position/-Breite/-Höhe abgeleitet statt aus einem eigenen bereich-Objekt.
    const berechneElementAuswahl = (eintrag, segment, elBreite, elHoehe) => {
      const mitteU = ((eintrag.gruppe.position.x - segment.x1) * segment.dx + (eintrag.gruppe.position.z - segment.z1) * segment.dz) / (segment.laenge || 1)
      const uStart = mitteU - elBreite / 2
      const vUnten = eintrag.gruppe.position.y
      const weltpunkt = (u, y) => {
        const t = u / (segment.laenge || 1)
        return new THREE.Vector3(segment.x1 + segment.dx * t, y, segment.z1 + segment.dz * t)
      }
      const uEnde = uStart + elBreite
      const vOben = vUnten + elHoehe
      const breiteCm = Math.round(elBreite * 100)
      // Rundbogen-Durchgang: elHoehe ist seit Optimierung 2 auch bei diesem Stil direkt die
      // Gesamthöhe der Öffnung (der Bogen liegt innerhalb dieser Höhe, siehe bogenMasse in
      // constants.js) — die Höhe wird deshalb wie bei allen anderen Typen angezeigt, ohne
      // Sonderfall, und ist genauso frei ziehbar.
      const istBogenDurchgang = eintrag.item.typ === 'durchgang' && eintrag.item.stil === 'bogen'
      const hoeheCm = Math.round(elHoehe * 100)
      setFensterAuswahl({
        id: eintrag.item.id,
        typ: eintrag.item.typ,
        ecken: {
          tl: projiziere(weltpunkt(uStart, vOben)),
          tr: projiziere(weltpunkt(uEnde, vOben)),
          bl: projiziere(weltpunkt(uStart, vUnten)),
          br: projiziere(weltpunkt(uEnde, vUnten)),
        },
        breiteCm,
        hoeheCm,
      })
      // Teil 2, Seitenleiste: dieselben Maße zusätzlich in den geteilten UI-Context schreiben,
      // damit Sidebar.jsx sie fürs Breite/Höhe-Bedienfeld lesen kann. Teil 3b: zusätzlich
      // bogenDurchgang (Höhe dort nur informativ, nicht editierbar) und der aktuelle
      // Backstein-Status fürs Umschalten in der Seitenleiste.
      setAusgewaehltesWandElement({
        id: eintrag.item.id, breiteCm, hoeheCm,
        bogenDurchgang: istBogenDurchgang,
        backstein: istBogenDurchgang ? !!eintrag.item.backstein : undefined,
      })
    }

    // Startet das Ziehen an einer Fenster-/Durchgang-Ecke (siehe JSX unten) — der diagonal
    // gegenüberliegende Punkt (anchorU/V) bleibt fix. Nur für Fenster und offene Durchgänge, kein
    // No-Op-Aufruf für Türen möglich (die JSX rendert die Anfasser nur wenn fensterAuswahl gesetzt
    // ist, und das passiert nur für diese beiden Typen).
    const startElementHandleDrag = (id, ecke) => {
      const eintrag = wandElementGruppen.find(w => w.item.id === id)
      if (!eintrag || (eintrag.item.typ !== 'fenster' && eintrag.item.typ !== 'durchgang')) return
      const segment = wandMeshe[eintrag.item.wandSegment]
      if (!segment) return
      const elBreite = eintrag.item.width / 60
      const elHoehe = eintrag.item.hoeheReal ?? (eintrag.item.typ === 'fenster' ? FENSTER_HOEHE_3D : TUER_HOEHE_3D)
      const mitteU = ((eintrag.gruppe.position.x - segment.x1) * segment.dx + (eintrag.gruppe.position.z - segment.z1) * segment.dz) / (segment.laenge || 1)
      const uStart = mitteU - elBreite / 2
      const vUnten = eintrag.gruppe.position.y
      const anchorU = (ecke === 'tl' || ecke === 'bl') ? uStart + elBreite : uStart
      const anchorV = (ecke === 'bl' || ecke === 'br') ? vUnten + elHoehe : vUnten
      wandElementHandleDrag = {
        eintrag, segment, anchorU, anchorV,
        urspruenglicheBreite: elBreite, urspruenglicheHoehe: elHoehe,
        bewegt: false,
      }
    }
    wandElementHandleStartRef.current = startElementHandleDrag

    // Nach einem Neuaufbau (z.B. durch das Committen einer Zahlen-Eingabe oder eines Zieh-
    // vorgangs, beides ändert `furniture` und löst dadurch diesen ganzen Effekt erneut aus) die
    // Auswahl/Maßlinien-Anzeige mit den neuen Werten auffrischen — nur wenn das Element noch
    // existiert und weiterhin auf der fokussierten Wand sitzt, sonst Auswahl aufheben.
    if (ausgewaehltesElementRef.current) {
      const ausgewaehlterEintrag = wandElementGruppen.find(w => w.item.id === ausgewaehltesElementRef.current)
      if (ausgewaehlterEintrag && ausgewaehlterEintrag.item.wandSegment === fokusWandRef.current) {
        const segment = wandMeshe[ausgewaehlterEintrag.item.wandSegment]
        const elBreite = ausgewaehlterEintrag.item.width / 60
        berechneAnzeige(ausgewaehlterEintrag, segment, elBreite)
        if (ausgewaehlterEintrag.item.typ === 'fenster' || ausgewaehlterEintrag.item.typ === 'durchgang') {
          const elHoehe = ausgewaehlterEintrag.item.hoeheReal ?? (ausgewaehlterEintrag.item.typ === 'fenster' ? FENSTER_HOEHE_3D : TUER_HOEHE_3D)
          berechneElementAuswahl(ausgewaehlterEintrag, segment, elBreite, elHoehe)
        }
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
        raumWurzel.remove(wandZeichnenDrag.mesh)
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
        setFensterAuswahl(null)
        setAusgewaehltesWandElement(null)
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
        if (eintrag.item.typ === 'fenster' || eintrag.item.typ === 'durchgang') {
          berechneElementAuswahl(eintrag, segment, elBreite, elHoehe)
        } else {
          setFensterAuswahl(null)
          setAusgewaehltesWandElement(null)
        }
        return
      }

      // Kein Fenster/Tür getroffen — als Zweites gegen die Wandmaterial-Bereiche testen (Teil 3).
      const bereichTreffer = raycaster.intersectObjects(wandBereichRaycastZiele, false)
      if (bereichTreffer.length === 0) {
        setAusgewaehltesElement(null); setLiveWerte(null); setMassLinien(null)
        ausgewaehlterBereichRef.current = null; setBereichAuswahl(null)
        setFensterAuswahl(null)
        setAusgewaehltesWandElement(null)
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
      setFensterAuswahl(null)
      setAusgewaehltesWandElement(null)
      berechneBereichAuswahl(eintrag)
    }

    const wandElementMausMove = (clientX, clientY) => {
      if (!wandElementDrag && !wandElementHandleDrag && !wandBereichDrag && !wandBereichHandleDrag && !wandZeichnenDrag) return

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
        // Offener Durchgang (Teil 3a): das "Loch" steckt in der Wandgeometrie selbst, nicht in der
        // (unsichtbaren) Gruppe — beim Verschieben muss deshalb die Wand live mitgeschnitten
        // werden, sonst bliebe das alte Loch stehen, während nur die unsichtbare Klickfläche
        // mitwandert.
        if (eintrag.item.typ === 'durchgang') {
          segment.mesh.geometry.dispose()
          segment.mesh.geometry = wandGeometrieFuerSegment(eintrag.item.wandSegment, segment, {
            id: eintrag.item.id, u: mitteU - elBreite / 2, breite: elBreite, hoehe: elHoehe,
          })
        }
        wandElementDrag.bewegt = true
        berechneAnzeige(eintrag, segment, elBreite)
        return
      }

      if (wandElementHandleDrag) {
        // Ecke eines Fensters/Durchgangs ziehen (Teil 2 / Teil 3a) — gleiches Prinzip wie beim
        // Wandmaterial-Bereich unten: der diagonal gegenüberliegende Punkt (anchorU/V) bleibt fix.
        // Die Gruppe wird für die Live-Vorschau nur skaliert+neu positioniert statt neu gebaut
        // (siehe Kommentar oben im Architektur-Überblick) — exakt wird es erst beim Loslassen. Bei
        // einem Durchgang wird zusätzlich die Wandgeometrie selbst live mitgeschnitten (siehe unten,
        // anders als beim Fenster ist das hier günstig genug für jeden Mousemove).
        const { eintrag, segment, anchorU, anchorV, urspruenglicheBreite, urspruenglicheHoehe } = wandElementHandleDrag
        const ebene = ebeneFuerSegment(eintrag.item.wandSegment)
        const schnitt = zeigerAufWeltpunkt(clientX, clientY, ebene)
        if (!schnitt) return
        const { u, v } = weltpunktZuUV(schnitt, segment)
        const uKlamm = Math.max(0, Math.min(segment.laenge, u))
        const vKlamm = Math.max(0, Math.min(wandHoehe, v))
        const neuBreite = Math.max(MIN_FENSTER_GROESSE, Math.abs(uKlamm - anchorU))
        const neuV = Math.min(anchorV, vKlamm)
        const neuHoehe = Math.max(MIN_FENSTER_GROESSE, Math.abs(vKlamm - anchorV))
        // Rundbogen-Durchgang (Optimierung 2): keine Sonderbehandlung mehr. hoeheReal ist bei
        // diesem Stil jetzt die Gesamthöhe der Öffnung, der Bogen teilt sich diese Höhe mit den
        // geraden Seiten (bogenMasse in constants.js) — Breite und Höhe sind damit genauso frei
        // ziehbar wie beim rechteckigen Durchgang, und der Bogen kann nicht mehr durch die Decke
        // stoßen, weil vKlamm die Höhe bereits auf die Wandhöhe begrenzt.
        // Verankerten Gegenpunkt (anchorU) exakt halten, auch wenn neuBreite oben gerade wegen der
        // Deckenklemmung verkleinert wurde — sonst würde sich beim Ziehen der linken Ecke die
        // rechte (eigentlich fixe) Kante mitverschieben.
        const ziehtLinkeKante = uKlamm < anchorU
        const neuU = ziehtLinkeKante ? anchorU - neuBreite : anchorU
        wandElementHandleDrag.aktuellU = neuU
        wandElementHandleDrag.aktuellV = neuV
        wandElementHandleDrag.aktuellBreite = neuBreite
        wandElementHandleDrag.aktuellHoehe = neuHoehe
        eintrag.gruppe.scale.x = neuBreite / urspruenglicheBreite
        eintrag.gruppe.scale.y = neuHoehe / urspruenglicheHoehe
        const mitteU = neuU + neuBreite / 2
        const t = mitteU / (segment.laenge || 1)
        eintrag.gruppe.position.set(segment.x1 + segment.dx * t, neuV, segment.z1 + segment.dz * t)
        if (eintrag.item.typ === 'durchgang') {
          segment.mesh.geometry.dispose()
          segment.mesh.geometry = wandGeometrieFuerSegment(eintrag.item.wandSegment, segment, {
            id: eintrag.item.id, u: neuU, breite: neuBreite, hoehe: neuHoehe,
          })
        }
        wandElementHandleDrag.bewegt = true
        berechneElementAuswahl(eintrag, segment, neuBreite, neuHoehe)
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
            raumWurzel.add(wandZeichnenDrag.mesh)
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
          callbacksRef.current.onWandElementBewegt?.(eintrag.item.id, patch)
        }
        wandElementDrag = null
        return
      }
      if (wandElementHandleDrag) {
        const { eintrag } = wandElementHandleDrag
        if (wandElementHandleDrag.bewegt) {
          callbacksRef.current.onWandElementBewegt?.(eintrag.item.id, {
            width: Math.round(wandElementHandleDrag.aktuellBreite * 60),
            hoeheReal: wandElementHandleDrag.aktuellHoehe,
            wandPosition: wandElementHandleDrag.aktuellU,
            bruestungshoehe: wandElementHandleDrag.aktuellV,
          })
        } else {
          // Reiner Klick auf den Anfasser ohne Ziehen — Live-Skalierung zurücksetzen, sonst bliebe
          // sie bis zum nächsten Szenen-Neuaufbau sichtbar stehen.
          eintrag.gruppe.scale.set(1, 1, 1)
        }
        wandElementHandleDrag = null
        return
      }
      if (wandBereichHandleDrag) {
        const { eintrag } = wandBereichHandleDrag
        if (wandBereichHandleDrag.bewegt) {
          callbacksRef.current.aktualisiereWandBereich(eintrag.bereich.id, {
            u: wandBereichHandleDrag.aktuellU, v: wandBereichHandleDrag.aktuellV,
            breite: wandBereichHandleDrag.aktuellBreite, hoehe: wandBereichHandleDrag.aktuellHoehe,
          })
        }
        wandBereichHandleDrag = null
        return
      }
      if (wandZeichnenDrag) {
        const { material, mesh, aktuellU, aktuellV, aktuellBreite, aktuellHoehe } = wandZeichnenDrag
        if (mesh) { mesh.geometry.dispose(); mesh.material.dispose(); raumWurzel.remove(mesh) }
        setZeichnenLiveGroesse(null)
        // Zeichen-Modus deaktiviert sich nach einem Versuch selbst (erfolgreich oder nicht) — wie
        // bei den meisten Zeichenprogrammen bleibt das Werkzeug nicht dauerhaft "scharf".
        setZeichenModusMaterial(null)
        if ((aktuellBreite || 0) >= MIN_BEREICH_GROESSE && (aktuellHoehe || 0) >= MIN_BEREICH_GROESSE) {
          const id = callbacksRef.current.fuegeWandBereichHinzu?.({
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
          callbacksRef.current.aktualisiereWandBereich(wandBereichDrag.eintrag.bereich.id, { u: wandBereichDrag.aktuellU, v: wandBereichDrag.aktuellV })
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
      if (deckenFokusRef.current) { deckenleuchteMausDown(e.clientX, e.clientY); return }
      if (kameraModusRef.current === 'rundgang') {
        rundgangZeiger = { startX: e.clientX, startY: e.clientY, letzteX: e.clientX, letzteY: e.clientY, bewegung: 0, startZeit: performance.now() }
        return
      }
      isDragging = true
      previousMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => {
      if (fokusWandRef.current != null) { wandElementMausUp(); return }
      if (deckenFokusRef.current) { deckenleuchteMausUp(); return }
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
      if (deckenFokusRef.current) { deckenleuchteMausMove(e.clientX, e.clientY); return }
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
      if (deckenFokusRef.current) return
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
      if (deckenFokusRef.current) { deckenleuchteMausDown(e.touches[0].clientX, e.touches[0].clientY); return }
      if (kameraModusRef.current === 'rundgang') {
        const t = e.touches[0]
        rundgangZeiger = { startX: t.clientX, startY: t.clientY, letzteX: t.clientX, letzteY: t.clientY, bewegung: 0, startZeit: performance.now() }
        return
      }
      lastTouch = e.touches[0]; isDragging = true
    }
    const onTouchMove  = (e) => {
      if (fokusWandRef.current != null) { wandElementMausMove(e.touches[0].clientX, e.touches[0].clientY); return }
      if (deckenFokusRef.current) { deckenleuchteMausMove(e.touches[0].clientX, e.touches[0].clientY); return }
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
      if (deckenFokusRef.current) { deckenleuchteMausUp(); return }
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

// Szenenabhängiger Teil der Größenanpassung (App schneller machen, Schritt 3, Teilpunkt 4.4):
// Kamera-Seitenverhältnis und Renderer-Größe passt der dauerhafte ResizeObserver im
// Lebenszyklus-Effekt selbst an; alles, was darüber hinaus vom aktuellen Szeneninhalt abhängt,
// steht hier und wird bei jedem Lauf dieses Effekts neu hinterlegt — so arbeitet es nie mit
// veralteten Wänden oder einer veralteten Auswahl.
onResizeExtraRef.current = () => {
  // Wand-Fokus-Kamera neu einpassen — die Distanz aus berechneWandFokusZiel hängt über fovX von
  // camera.aspect ab, sonst bleibt die Kamera bei einem schmaleren Fenster auf der alten Distanz
  // stehen und die Wand ragt seitlich aus dem Bild. Direkt per setzeWandFokusKamera statt über
  // updateWandFokusCamera/wandFokusAnimation — ein Resize ist keine bewusste Wandwahl, soll also
  // sofort neu einpassen statt den weichen Schwenk auszulösen.
  if (fokusWandRef.current != null) {
    const ziel = berechneWandFokusZiel(fokusWandRef.current)
    if (ziel) {
      setzeWandFokusKamera({ x: ziel.x, z: ziel.z }, { x: ziel.zielX, z: ziel.zielZ })
      letztesFokusZiel = { x: ziel.zielX, z: ziel.zielZ }
    }
  }
  if (ausgewaehltesElementRef.current) {
    const eintrag = wandElementGruppen.find(w => w.item.id === ausgewaehltesElementRef.current)
    if (eintrag) {
      const segment = wandMeshe[eintrag.item.wandSegment]
      const elBreite = eintrag.item.width / 60
      berechneAnzeige(eintrag, segment, elBreite)
      if (eintrag.item.typ === 'fenster' || eintrag.item.typ === 'durchgang') {
        const elHoehe = eintrag.item.hoeheReal ?? (eintrag.item.typ === 'fenster' ? FENSTER_HOEHE_3D : TUER_HOEHE_3D)
        berechneElementAuswahl(eintrag, segment, elBreite, elHoehe)
      }
    }
  }
  if (ausgewaehlterBereichRef.current) {
    const eintrag = wandBereichGruppen.find(w => w.bereich.id === ausgewaehlterBereichRef.current)
    if (eintrag) berechneBereichAuswahl(eintrag)
  }
}
// Pro-Bild-Arbeit (App schneller machen, Schritt 3, Teilpunkt 4.4): Die Render-Schleife selbst
// läuft dauerhaft im Lebenszyklus-Effekt und ruft bei jedem Bild frameTickRef auf; das eigentliche
// renderer.render(...) passiert dort direkt danach. Hier steht nur noch, was pro Bild an den
// beiden Kamera-Animationen zu tun ist — bei jedem Lauf dieses Effekts frisch hinterlegt.
frameTickRef.current = () => {
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
}

return () => {
  // Render-Schleife, ResizeObserver, Canvas und Renderer gehören seit Teilpunkt 4.4 dem
  // Lebenszyklus-Effekt und werden hier bewusst NICHT abgeräumt. Die beiden hinterlegten
  // Rückrufe dagegen schon: sie zeigen auf Objekte, die gleich abgeräumt werden.
  frameTickRef.current = null
  onResizeExtraRef.current = null
  mount.removeEventListener('mousedown', onMouseDown)
  mount.removeEventListener('touchstart', onTouchStart)
  mount.removeEventListener('touchmove', onTouchMove)
  mount.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('mousemove', onMouseMove)
  mount.removeEventListener('wheel', onWheel)

  // Die baue*-Helfer (Trennwände, Wandelemente, Möbel) legen ihre eigenen Geometrien/
  // Materialien/Texturen direkt in der übergebenen Wurzel ab, ohne Referenzen nach außen zu geben
  // — bei jeder Änderung von room/furniture baut dieser Effekt alles neu auf, daher hier eine
  // vollständige Traversierung statt einzeln benannter Handles. Seit Teilpunkt 4.3 ist diese
  // Traversierung auf raumWurzel beschränkt (statt über die ganze Szene zu laufen) und die Gruppe
  // wird anschließend aus der Szene entfernt — damit räumt dieser Effekt ausschließlich seine
  // eigenen Objekte ab und lässt alles andere in der Szene unangetastet.
  // Foto-Texturen (texturen.js, ladeFotoTextur) und die gecachten prozeduralen Texturen (seit
  // Teilpunkt 4.1) sind davon ausgenommen (userData.persistenteTextur) — die leben im modulweiten
  // Cache über diesen Neuaufbau hinaus, ein hier ausgelöstes dispose() würde beim nächsten
  // Szenenaufbau eine bereits GPU-seitig freigegebene (leere) Textur liefern.
  raumWurzel.traverse(obj => {
    obj.geometry?.dispose()
    const materials = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : [])
    materials.forEach(mat => {
      Object.values(mat).forEach(wert => { if (wert?.isTexture && !wert.userData?.persistenteTextur) wert.dispose() })
      mat.dispose()
    })
  })
  scene.remove(raumWurzel)
}
  }, [
    // App schneller machen, Schritt 3, Teilpunkt 3: statt am kompletten room-Objekt hängt der
    // Effekt jetzt an genau den room-Feldern, die er tatsächlich verwendet (siehe Fundstellen oben
    // im Effekt: eckpunkte/breite/tiefe für die Raumform, boden für die Bodentextur, wandfarbe(n)/
    // wandmaterial(ien) für die Wände, trennwaende für die Innenwände). updateRoom() in
    // RoomsContext.jsx lässt unberührte Felder bei einer Änderung mit ihrer alten Referenz stehen
    // (Objekt-Spread) — eine reine Tageszeit- oder Möbel-Änderung löst dadurch jetzt keinen
    // Neuaufbau mehr aus, nur weil room als Ganzes eine neue Referenz bekommen hat.
    room?.eckpunkte, room?.breite, room?.tiefe, room?.boden,
    room?.wandfarbe, room?.wandfarben, room?.wandmaterial, room?.wandmaterialien, room?.trennwaende,
    // App schneller machen, Schritt 3, Teilpunkt 4.2/4.5: statt der furniture-Liste selbst hängt
    // dieser Effekt nur noch am Fingerabdruck der WANDELEMENTE (die Liste kommt über furnitureRef).
    // moebelSignatur und modelleVersion sind in den Möbel-Effekt weiter unten gewandert — eine
    // reine Möbel-Änderung baut hier deshalb nichts mehr neu.
    wandElementeSignatur,
    fussleiste, fussleisteFarbe, raumHoehe, wandBereiche,
    setAusgewaehltesWandElement, onDeckenleuchteAusgewaehlt,
  ])

  // === MÖBEL-EFFEKT (App schneller machen, Schritt 3, Teilpunkt 4.5) ===
  // Baut die normalen Möbel und die Deckenleuchten (samt ihrer Anfasser und des Auswahl-Rings) in
  // eine eigene Gruppe unter der dauerhaften Szene. Läuft NUR bei Möbel-Änderungen und bei
  // Änderungen der Raumform (von der die Umrechnung px <-> Meter abhängt) — eine Wandfarben-,
  // Fenster- oder Tageszeit-Änderung lässt die Möbel ab jetzt unangetastet stehen, und umgekehrt
  // baut eine Möbel-Änderung keine Wände/Böden/Lichter mehr neu.
  // Die Maus-Listener und die drei Deckenleuchten-Handler bleiben bewusst im Struktur-Effekt und
  // holen sich die hier gebauten Teile über moebelGruppenRef (siehe dort).
  useEffect(() => {
    // Der Fingerabdruck der Möbelliste ist der eigentliche Auslöser dieses Effekts (siehe
    // Abhängigkeitsliste unten), die Liste selbst kommt über furnitureRef — gleiches Muster wie im
    // Struktur-Effekt, siehe die Erklärung dort. BITTE NICHT ENTFERNEN.
    void moebelSignatur

    const scene = sceneRef.current
    if (!scene) return

    // Dieselbe Raumform-Rechnung wie im Struktur-Effekt (reine Mathematik, bewusst doppelt statt
    // über eine weitere Ref gebrückt — so bleibt dieser Effekt unabhängig davon, wann der
    // Struktur-Effekt zuletzt gelaufen ist).
    const wandHoehe = raumHoehe || 2.5
    const eckpunkte = room?.eckpunkte || rechteckPolygon(room?.breite || 6, room?.tiefe || 5)
    const box = boundingBox(eckpunkte)
    const raumBreite = box.breite
    const raumTiefe = box.tiefe

    const moebelWurzel = new THREE.Group()
    scene.add(moebelWurzel)

    // Seit Teilpunkt 4.1 modulweit gecacht — die Aufrufe liefern dieselben Instanzen wie im
    // Struktur-Effekt, es wird nichts doppelt gezeichnet.
    const holzTextur = erzeugeHolzTextur()
    const stoffTextur = erzeugeStoffTextur()

    // Deckenleuchten-Gruppen (Phase 6, Teilschritt 1) — Grundlage fürs Anklicken in
    // deckenleuchteMausDown im Struktur-Effekt. Wird nur im Decken-Fokus-Modus befüllt, ist aber
    // immer deklariert, damit die spätere Verwendung nicht auf die Existenz prüfen muss.
    const deckenleuchtenGruppen = []
    // Endpunkt-Anfasser der LED-Streifen (Phase 6, Teilschritt 3) — zwei kleine Kugeln je Streifen,
    // als Kind-Meshes der jeweiligen Gruppe (nicht Teil des "echten" Aussehens aus scene/moebel.js,
    // rein für die Bedienung in der Decken-Ansicht). Weil sie Kinder der Gruppe sind, folgen sie
    // automatisch Position/Drehung/Skalierung der Gruppe — siehe deckenleuchteMausMove, die genau
    // das ausnutzt, um beim Ziehen eines Endpunkts den jeweils ANDEREN exakt stehen zu lassen.
    const ledGriffe = []
    // Eck-Anfasser des quadratischen LED-Panels (Phase 6, Teilschritt 4) — eine Kugel je Panel, als
    // Kind-Mesh der Gruppe an einer festen lokalen Ecke. Anders als bei den zwei Endpunkt-Anfassern
    // des LED-Streifens bleibt beim Ziehen dieses EINEN Anfassers die Position der Gruppe
    // unverändert — es wird nur symmetrisch um die (feststehende) Mitte skaliert.
    const panelGriffe = []

    // Maße der unsichtbaren Trefferflächen (siehe unten): Ein Deckenspot ist nur rund 9 cm breit
    // und aus der Entfernung kaum zu treffen. MIN_TREFFER sorgt dafür, dass auch die kleinste
    // Leuchte eine brauchbare Zielscheibe bekommt, TREFFER_RAND gibt jeder Leuchte zusätzlich
    // etwas Luft ringsum. Beides in Metern.
    const MIN_TREFFER = 0.18
    const TREFFER_RAND = 0.14

    // Ring-Mesh knapp unter der Decke, markiert die aktuell ausgewählte Leuchte visuell.
    const deckenleuchteRing = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.24, 32),
      new THREE.MeshBasicMaterial({ color: '#185FA5', side: THREE.DoubleSide, transparent: true, opacity: 0.6 }),
    )
    deckenleuchteRing.rotation.x = -Math.PI / 2
    deckenleuchteRing.visible = false
    if (deckenFokusRef.current) moebelWurzel.add(deckenleuchteRing)

    furnitureRef.current.forEach(item => {
      if (item.istWandElement) return
      // In der Decken-Ansicht (Phase 6, Teilschritt 1, nach Hassans Feedback "die Stehlampen haben
      // da nichts zu suchen") werden normale Möbelstücke gar nicht erst gebaut — es geht in dieser
      // Ansicht nur um die Decke plus die 3 sichtbaren Wände, nicht um den restlichen Raum.
      // Deckenleuchten natürlich weiterhin. In jeder anderen Ansicht ändert sich nichts.
      if (deckenFokusRef.current && !istDeckenleuchte(item.name)) return
      const gruppe = baueMoebel(moebelWurzel, item, furnitureRef.current, raumBreite, raumTiefe, wandHoehe, stoffTextur, holzTextur)
      if (deckenFokusRef.current && istDeckenleuchte(item.name)) {
        const eintrag = { gruppe, item }
        deckenleuchtenGruppen.push(eintrag)

        // Unsichtbare Trefferfläche, damit man kleine Leuchten überhaupt anklicken kann. Sie liegt
        // als Kind in der Gruppe und folgt damit automatisch deren Position und Drehung; die lokale
        // X-Achse ist die Breite, die lokale Z-Achse die Tiefe (siehe moebelBreite/moebelTiefe in
        // scene/moebel.js, beide item.width bzw. item.height geteilt durch 60).
        //
        // material.visible = false statt mesh.visible = false: Ein unsichtbar geschaltetes Objekt
        // wird je nach Three.js-Version vom Raycaster übersprungen. Ein Objekt mit unsichtbarem
        // Material wird zuverlässig nicht gezeichnet, bleibt aber anklickbar.
        //
        // deckenleuchteMausDown muss dafür nichts wissen: Es läuft von jedem getroffenen Kind über
        // userData.id zum Gruppen-Root hoch und findet den Eintrag wie bei jedem anderen Mesh auch.
        const trefferBreite = Math.max(item.width / 60, MIN_TREFFER) + TREFFER_RAND
        const trefferTiefe = Math.max(item.height / 60, MIN_TREFFER) + TREFFER_RAND
        const trefferFlaeche = new THREE.Mesh(
          new THREE.BoxGeometry(trefferBreite, 0.04, trefferTiefe),
          new THREE.MeshBasicMaterial({ visible: false }),
        )
        trefferFlaeche.position.set(0, -0.03, 0)
        gruppe.add(trefferFlaeche)

        if (istEndpunktVerstellbareDeckenleuchte(item.name)) {
          const halbeLaenge = item.width / 120
          const griffGeo = new THREE.SphereGeometry(0.045, 12, 10)
          const griffLinks = new THREE.Mesh(griffGeo, new THREE.MeshBasicMaterial({ color: '#F2A93C' }))
          griffLinks.position.set(-halbeLaenge, -0.01, 0)
          gruppe.add(griffLinks)
          const griffRechts = new THREE.Mesh(griffGeo, new THREE.MeshBasicMaterial({ color: '#F2A93C' }))
          griffRechts.position.set(halbeLaenge, -0.01, 0)
          gruppe.add(griffRechts)
          ledGriffe.push({ mesh: griffLinks, eintrag, ende: -1 })
          ledGriffe.push({ mesh: griffRechts, eintrag, ende: 1 })
        } else if (istEckSkalierbareDeckenleuchte(item.name)) {
          const halbeSeite = item.width / 120
          const eckGriff = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), new THREE.MeshBasicMaterial({ color: '#F2A93C' }))
          eckGriff.position.set(halbeSeite, -0.01, halbeSeite)
          gruppe.add(eckGriff)
          panelGriffe.push({ mesh: eckGriff, eintrag, halbeSeite })
        }
      }
    })

    moebelGruppenRef.current = { deckenleuchtenGruppen, ledGriffe, panelGriffe, deckenleuchteRing }

    // Licht-Vorrat (siehe scene/lichtPool.js): Die Leuchten haben beim Bauen keine eigenen
    // Lichtquellen erzeugt, sondern nur leere Platzhalter mit userData.lichtWunsch hinterlassen.
    // Die werden hier einmal eingesammelt; die Zuordnung zu den tatsächlichen Lichtern passiert
    // danach pro Bild, damit ein Licht beim Ziehen einer Deckenleuchte mitwandert.
    moebelWurzel.updateMatrixWorld(true)
    const lichtPlatzhalter = []
    moebelWurzel.traverse(obj => {
      if (obj.userData?.lichtWunsch) lichtPlatzhalter.push(obj)
    })
    // Lokale Kopie wie im Lebenszyklus-Effekt: dasselbe, nie ausgetauschte Feld.
    const lichtPool = lichtPoolRef.current
    stelleLichtPoolBereit(scene, lichtPool, lichtPlatzhalter.length)
    moebelTickRef.current = () => verteileLichter(lichtPool, lichtPlatzhalter)
    // Einmal sofort, damit das erste Bild nach dem Aufbau schon stimmt und nicht kurz dunkel ist.
    verteileLichter(lichtPool, lichtPlatzhalter)

    return () => {
      moebelGruppenRef.current = null
      // Der Vorrat selbst bleibt stehen (er gehört der dauerhaften Szene), aber die Zuordnung zu den
      // gleich abgeräumten Platzhaltern muss weg — sonst zeigt sie auf Objekte, die es nicht mehr
      // gibt, und die Lichter würden an ihrer letzten Stelle weiterleuchten.
      moebelTickRef.current = null
      verteileLichter(lichtPool, [])
      // Gleiches Aufräumen wie im Struktur-Effekt, nur auf die eigene Gruppe beschränkt: gecachte
      // Foto- und prozedurale Texturen (userData.persistenteTextur) bleiben verschont, alles andere
      // wird abgeräumt und die Gruppe anschließend aus der dauerhaften Szene entfernt.
      moebelWurzel.traverse(obj => {
        obj.geometry?.dispose()
        const materials = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : [])
        materials.forEach(mat => {
          Object.values(mat).forEach(wert => { if (wert?.isTexture && !wert.userData?.persistenteTextur) wert.dispose() })
          mat.dispose()
        })
      })
      scene.remove(moebelWurzel)
    }
  }, [moebelSignatur, modelleVersion, room?.eckpunkte, room?.breite, room?.tiefe, raumHoehe])

  // App schneller machen, Schritt 3, Teilpunkt 2: Tageszeit-Schnellpfad. Läuft unabhängig vom
  // schweren Szenen-Effekt oben (der jetzt NICHT mehr auf tageszeit reagiert) und passt nur die
  // Werte der bereits vorhandenen Lichter an — kein neuer Renderer, keine neu erzeugten Texturen,
  // kein Neuaufbau von Wänden/Boden/Möbeln. Läuft bei jedem Wert danach automatisch als Teil der
  // laufenden Render-Schleife des obigen Effekts sichtbar (dessen requestAnimationFrame-Schleife
  // rendert ja weiter, auch ohne dass der Effekt selbst neu läuft). Läuft beim allerersten Mount
  // ebenfalls einmal mit (normales useEffect-Verhalten) — harmlos, setzt dabei nur exakt dieselben
  // Werte, die baueBeleuchtung() im obigen Effekt gerade erst gesetzt hat. Läuft in der
  // Komponenten-Reihenfolge NACH dem schweren Effekt oben, damit beleuchtungRef beim allerersten
  // Mount schon befüllt ist, bevor hier darauf zugegriffen wird.
  useEffect(() => {
    tageszeitRef.current = tageszeit
    if (!beleuchtungRef.current) return
    aktualisiereBeleuchtung(beleuchtungRef.current, tageszeit)
  }, [tageszeit])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: deckenFokus ? 'default' : (fokusWand == null ? 'grab' : (zeichenModusMaterial ? 'crosshair' : 'default')), position: 'relative' }}>
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
      {fokusWand != null && fensterAuswahl && (
        <>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 9, pointerEvents: 'none' }}>
            <polygon
              points={`${fensterAuswahl.ecken.tl.x},${fensterAuswahl.ecken.tl.y} ${fensterAuswahl.ecken.tr.x},${fensterAuswahl.ecken.tr.y} ${fensterAuswahl.ecken.br.x},${fensterAuswahl.ecken.br.y} ${fensterAuswahl.ecken.bl.x},${fensterAuswahl.ecken.bl.y}`}
              fill="none" stroke="#185FA5" strokeWidth={1.5} strokeDasharray="4 4" />
          </svg>
          {/* Bei einem Durchgang nur die zwei OBEREN Anfasser — die Unterkante bleibt immer am
              Boden (Bodenanschluss wie bei Türen), kein Hochziehen der Unterkante möglich. */}
          {(fensterAuswahl.typ === 'durchgang' ? ['tl', 'tr'] : ['tl', 'tr', 'bl', 'br']).map(ecke => (
            <div key={ecke}
              onMouseDown={() => wandElementHandleStartRef.current(fensterAuswahl.id, ecke)}
              onTouchStart={() => wandElementHandleStartRef.current(fensterAuswahl.id, ecke)}
              style={{
                position: 'absolute', left: fensterAuswahl.ecken[ecke].x, top: fensterAuswahl.ecken[ecke].y,
                transform: 'translate(-50%, -50%)', zIndex: 10,
                width: '14px', height: '14px', borderRadius: '3px', background: 'white',
                border: '2px solid #185FA5', cursor: ecke === 'tl' || ecke === 'br' ? 'nwse-resize' : 'nesw-resize',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
          ))}
          <div style={{
            position: 'absolute',
            left: (fensterAuswahl.ecken.tl.x + fensterAuswahl.ecken.tr.x) / 2,
            top: Math.min(fensterAuswahl.ecken.tl.y, fensterAuswahl.ecken.tr.y) - 14,
            transform: 'translate(-50%, -100%)', zIndex: 10, pointerEvents: 'none',
            padding: '3px 8px', borderRadius: '10px', background: 'white', border: '1px solid #185FA5',
            fontSize: '11px', color: '#185FA5', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
          }}>{fensterAuswahl.breiteCm} × {fensterAuswahl.hoeheCm} cm</div>
        </>
      )}
    </div>
  )
}

