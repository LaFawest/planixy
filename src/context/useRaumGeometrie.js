import { useCallback, useMemo } from 'react'
import { WAND_DICKE_PX, FUSSLEISTE_TIEFE_M } from '../constants'
import { useRooms } from './RoomsContext'
import { useDesign } from './DesignContext'
import {
  rechteckPolygon,
  boundingBox,
  innenKonturen,
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

  // Innenmaß (Schema 8, Hassans Entscheidung vom 16.11.2026): Die Eckpunkte sind die
  // Wandinnenseite. innenB/innenT sind deshalb die volle Raumgröße, und die Wand liegt im Grundriss
  // außen herum — die Zeichenfläche (canvasB/canvasT) ist um zweimal die Wanddicke größer.
  // canvasInnerRef sitzt wie bisher um wandDicke eingerückt, sein Ursprung ist damit die innere
  // Wandecke. Die Fußleiste ist so tief wie in 3D (FUSSLEISTE_TIEFE_M, 2,4 px); bis Schema 7 waren
  // es 8 px, und Wand wie Leiste gingen nach innen ab.
  const wandDicke = WAND_DICKE_PX
  const innenB = box.breite
  const innenT = box.tiefe
  const canvasB = innenB + wandDicke * 2
  const canvasT = innenT + wandDicke * 2
  const fussleisteBreite = fussleiste ? FUSSLEISTE_TIEFE_M * 60 : 0
  const grenzB = innenB - fussleisteBreite * 2
  const grenzT = innenT - fussleisteBreite * 2
  const grenzStart = fussleisteBreite

  // "Grenze" = die Fläche, auf die Möbel beim Ziehen einrasten (Wandinnenseite abzüglich
  // Fußleiste); "innen" = die Wandinnenseite selbst, für Trennwände, Fenster und Türen. Beide aus
  // dem tatsächlichen Randpolygon (innenKonturen), damit auch für L-/U-Formen. Mit useMemo
  // stabilisiert, da diese Werte in Abhängigkeitslisten von handleDrag (FurnitureContext) und
  // handleWandDrag (TrennwandContext) landen — ein bei jedem Aufruf neu erzeugtes Array würde deren
  // Memoization brechen.
  const { grenzeEckpunkte, innenEckpunkte } = useMemo(
    () => innenKonturen(polygonPx, fussleisteBreite),
    [polygonPx, fussleisteBreite],
  )

  // Wandsegmente (Index + nach außen zeigende Normale) und Punkt-in-Polygon-Prüfung, auf der
  // Wandinnenseite und im selben Ursprung wie Möbel und Wandelemente. Canvas2D zeichnet die
  // Wandstreifen von dort aus nach außen.
  const wandSegmente = useMemo(() => wandSegmenteAus(innenEckpunkte), [innenEckpunkte])
  const punktInPolygon = (punkt) => istPunktInPolygon(punkt, innenEckpunkte)

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
