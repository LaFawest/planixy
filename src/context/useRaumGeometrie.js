import { useCallback, useMemo } from 'react'
import { WAND_DICKE_PX } from '../constants'
import { useRooms } from './RoomsContext'
import { useDesign } from './DesignContext'
import {
  rechteckPolygon,
  boundingBox,
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
  // abzüglich Wanddicke und ggf. Fußleiste). Wird hier bewusst als feste 4-Punkt-Bounding-Box
  // aus grenzB/grenzT aufgebaut statt aus dem tatsächlichen Randpolygon abgeleitet — nur für
  // Rechtecke gültig, bei einer L-/U-Form (Schritt 9) deckt das nicht mehr die echte Kontur ab
  // (siehe Notiz für Schritt 9b). Mit useMemo stabilisiert, da dieser Wert in der
  // Abhängigkeitsliste von handleDrag (FurnitureContext) landet — ein bei jedem Aufruf neu
  // erzeugtes Array würde dessen Memoization brechen.
  const grenzeEckpunkte = useMemo(() => [
    { x: grenzStart, y: grenzStart },
    { x: grenzStart + grenzB, y: grenzStart },
    { x: grenzStart + grenzB, y: grenzStart + grenzT },
    { x: grenzStart, y: grenzStart + grenzT },
  ], [grenzStart, grenzB, grenzT])

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
  const innenEckpunkte = useMemo(() => [
    { x: 0, y: 0 },
    { x: innenB, y: 0 },
    { x: innenB, y: innenT },
    { x: 0, y: innenT },
  ], [innenB, innenT])

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
