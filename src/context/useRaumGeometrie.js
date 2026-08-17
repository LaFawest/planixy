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
  const polygonPx = eckpunkte.map(p => ({ x: p.x * 60, y: p.y * 60 }))
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
  // äußeren Randpolygons — Fundament für spätere Schritte, noch von niemandem konsumiert.
  const wandSegmente = wandSegmenteAus(polygonPx)
  const punktInPolygon = (punkt) => istPunktInPolygon(punkt, polygonPx)

  return { canvasB, canvasT, wandDicke, innenB, innenT, grenzB, grenzT, grenzStart, wandSegmente, punktInPolygon }
}
