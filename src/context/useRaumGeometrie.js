import { useCallback, useMemo } from 'react'
import { WAND_DICKE_PX } from '../constants'
import { useRooms } from './RoomsContext'
import { useDesign } from './DesignContext'
import {
  rechteckPolygon,
  boundingBox,
  versetztesPolygon,
  wandSegmente as wandSegmenteAus,
  punktInPolygon as istPunktInPolygon,
  rechteckInPolygon as istRechteckInPolygon,
  streckeInPolygon as istStreckeInPolygon,
} from '../raumPolygon'

export function useRaumGeometrie() {
  const { activeRoom } = useRooms()
  const { fussleiste } = useDesign()

  // Eckpunkte liegen in Metern vor (Ursprung oben-links) — für die 2D-Darstellung hier
  // einmalig auf Pixel (60px/m) skaliert. Alles Folgende arbeitet wie bisher in Pixeln.
  const eckpunkte = activeRoom?.eckpunkte || rechteckPolygon(activeRoom?.breite || 6, activeRoom?.tiefe || 5)
  const polygonPx = useMemo(() => eckpunkte.map(p => ({ x: p.x * 60, y: p.y * 60 })), [eckpunkte])
  const box = boundingBox(polygonPx)

  const canvasB = box.breite
  const canvasT = box.tiefe
  const wandDicke = WAND_DICKE_PX
  const innenB = canvasB - wandDicke * 2
  const innenT = canvasT - wandDicke * 2
  const fussleisteBreite = fussleiste ? 8 : 0
  const grenzB = innenB - fussleisteBreite * 2
  const grenzT = innenT - fussleisteBreite * 2
  const grenzStart = fussleisteBreite

  // Wandsegmente (Index + nach außen zeigende Normale) und Punkt-in-Polygon-Prüfung des
  // äußeren Randpolygons. wandSegmente wird als Prop an Canvas2D durchgereicht — mit useMemo
  // stabilisiert, aus demselben Grund wie grenzeEckpunkte unten.
  const wandSegmente = useMemo(() => wandSegmenteAus(polygonPx), [polygonPx])
  const punktInPolygon = (punkt) => istPunktInPolygon(punkt, polygonPx)

  // "Grenze" = die innere Fläche, auf die Fenster/Türen und Möbel beim Ziehen einrasten (Rand
  // abzüglich Wanddicke und ggf. Fußleiste) — aus dem tatsächlichen Randpolygon abgeleitet
  // (versetztesPolygon), nicht mehr als feste Bounding-Box, funktioniert damit auch für L-/U-
  // Formen. polygonPx ist im äußeren, unverschobenen Rahmen; canvasInnerRef (und damit alle
  // Möbel-Koordinaten) beginnt erst um die Wanddicke nach innen versetzt bei (0,0) — deshalb der
  // abschließende Shift um -wandDicke in beiden Achsen. Mit useMemo stabilisiert, da dieser Wert
  // in der Abhängigkeitsliste von handleDrag (FurnitureContext) landet — ein bei jedem Aufruf neu
  // erzeugtes Array würde dessen Memoization brechen.
  const grenzeEckpunkte = useMemo(
    () => versetztesPolygon(polygonPx, wandDicke + fussleisteBreite).map(p => ({ x: p.x - wandDicke, y: p.y - wandDicke })),
    [polygonPx, wandDicke, fussleisteBreite],
  )

  // Rechteck-in-Polygon-Prüfung für Möbel (Schritt 5) — an grenzeEckpunkte gebunden statt an
  // polygonPx, weil Möbel-left/top denselben Ursprung wie grenzeEckpunkte haben (0,0 = Ecke
  // des canvasInnerRef-Divs, also bereits um die Wanddicke nach innen versetzt). polygonPx ist
  // das äußere, unverschobene Randpolygon — als Prüf-Polygon wäre es um die Wanddicke daneben.
  // useCallback, weil diese Funktion in Abhängigkeitslisten von useCallback in
  // FurnitureContext landet — eine bei jedem Aufruf neu erzeugte Referenz würde dessen
  // Memoization brechen.
  const rechteckInPolygon = useCallback(
    (links, oben, breite, hoehe) => istRechteckInPolygon(links, oben, breite, hoehe, grenzeEckpunkte),
    [grenzeEckpunkte],
  )

  // Trennwand-Koordinaten (TrennwandContext) haben denselben Ursprung wie grenzeEckpunkte,
  // aber ohne den zusätzlichen Fußleisten-Versatz — Trennwände dürfen bis an die Wand reichen.
  // Ebenfalls aus dem echten Randpolygon abgeleitet statt als feste Bounding-Box, siehe
  // grenzeEckpunkte oben.
  const innenEckpunkte = useMemo(
    () => versetztesPolygon(polygonPx, wandDicke).map(p => ({ x: p.x - wandDicke, y: p.y - wandDicke })),
    [polygonPx, wandDicke],
  )

  // Strecke-in-Polygon-Prüfung für Trennwände (Schritt 6) — analog zu rechteckInPolygon oben.
  const streckeInPolygon = useCallback(
    (a, b) => istStreckeInPolygon(a, b, innenEckpunkte),
    [innenEckpunkte],
  )

  return {
    canvasB, canvasT, wandDicke, innenB, innenT, grenzB, grenzT, grenzStart,
    wandSegmente, grenzeEckpunkte, innenEckpunkte, punktInPolygon, rechteckInPolygon, streckeInPolygon,
  }
}
