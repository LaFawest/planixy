import { useMemo } from 'react'
import { WAND_DICKE_PX } from '../constants'
import { useRooms } from './RoomsContext'
import { useDesign } from './DesignContext'
import {
  rechteckPolygon,
  boundingBox,
  wandSegmente as wandSegmenteAus,
  punktInPolygon as istPunktInPolygon,
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

  // "Grenze" = die innere Fläche, auf die Fenster/Türen beim Ziehen einrasten (Rand abzüglich
  // Wanddicke und ggf. Fußleiste). Dieselbe Eckpunktreihenfolge wie ein Rechteck-Polygon
  // (siehe rechteckPolygon), damit Segmentindizes mit HIMMELSRICHTUNG_JE_SEGMENT übereinstimmen
  // (0=nord, 1=ost, 2=sued, 3=west) — nur für Rechtecke gültig. Mit useMemo stabilisiert, da
  // dieser Wert in der Abhängigkeitsliste von handleDrag (FurnitureContext) landet — ein bei
  // jedem Aufruf neu erzeugtes Array würde dessen Memoization brechen.
  const grenzeEckpunkte = useMemo(() => [
    { x: grenzStart, y: grenzStart },
    { x: grenzStart + grenzB, y: grenzStart },
    { x: grenzStart + grenzB, y: grenzStart + grenzT },
    { x: grenzStart, y: grenzStart + grenzT },
  ], [grenzStart, grenzB, grenzT])

  return { canvasB, canvasT, wandDicke, innenB, innenT, grenzB, grenzT, grenzStart, wandSegmente, grenzeEckpunkte, punktInPolygon }
}
