import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useUI } from './UIContext'
import { useProjekte } from './ProjectsContext'
import { vergibRaumId } from './idZaehler'
import {
  rechteckPolygon, raumformPolygon, boundingBox, innenPolygone,
  rechteckInPolygon as istRechteckInPolygon,
  streckeInPolygon as istStreckeInPolygon,
  snappeWandElement, platziereAufWandSegment,
} from '../raumPolygon'
import { DEFAULT_RAUM_DESIGN, DEFAULT_WIZARD_SCHRITT, WAND_DICKE_PX } from '../constants'

const RoomsContext = createContext(null)

// Klemmt ein Möbelstück in die neue Innenfläche (grenzeEckpunkte), wenn es nach einer
// Formänderung nicht mehr vollständig hineinpasst — dieselbe Bounding-Box-Klemmung wie beim
// Ziehen (FurnitureContext.jsx), nur einmalig statt interaktiv. Reicht für jedes Rechteck
// vollständig aus; bei einer Aussparung (L-/U-Form, Schritt 9b-3) kann ein Möbelstück, dessen
// alte Position jetzt in der Nische liegt, trotz Klemmung ungültig bleiben — dann bleibt es
// unverändert stehen, statt an eine geratene Position zu springen. Wird beim Testen von 9b-3
// vertieft.
function moebelReparieren(item, grenzeEckpunkte, grenzStart, grenzB, grenzT) {
  const w = item.origWidth || item.width
  const h = item.origHeight || item.height
  const rad = (item.rotation || 0) * Math.PI / 180
  const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad))
  const boundW = w * cos + h * sin
  const boundH = w * sin + h * cos
  if (istRechteckInPolygon(item.left, item.top, boundW, boundH, grenzeEckpunkte)) return item
  const left = Math.max(grenzStart, Math.min(grenzStart + grenzB - boundW, item.left))
  const top = Math.max(grenzStart, Math.min(grenzStart + grenzT - boundH, item.top))
  return istRechteckInPolygon(left, top, boundW, boundH, grenzeEckpunkte) ? { ...item, left, top } : item
}

// Hält ein Fenster/Tür-Element nach Möglichkeit auf seinem bisherigen Wandsegment
// (platziereAufWandSegment) — eine Formänderung verschiebt oft nur die Segment-Endpunkte, ohne
// dass die Wand, an der das Element hängt, eine andere sein sollte. Erst wenn dieses Segment
// nicht mehr existiert oder das Element nicht mehr darauf passt (z.B. weil eine Aussparung genau
// diese Wand verkürzt hat), wird komplett neu auf die nächstgelegene Kante gesnappt
// (snappeWandElement) — sonst würde jede Größenänderung Fenster/Türen unnötig auf eine andere
// Wand springen lassen, nur weil ihre alte Pixelposition zufällig näher an einer anderen Wand
// der neuen Kontur liegt.
function wandElementReparieren(item, grenzeEckpunkte) {
  const beibehalten = platziereAufWandSegment(item.wandSegment, item.wandPosition, item.width, item.height, grenzeEckpunkte)
  if (beibehalten) return { ...item, ...beibehalten }
  const cx = item.left + item.width / 2
  const cy = item.top + item.height / 2
  return { ...item, ...snappeWandElement(cx, cy, item.width, item.height, grenzeEckpunkte) }
}

// Analog zu moebelReparieren, für Trennwände (Schritt 6) — dieselbe Bounding-Box-Klemmung wie
// beim Ziehen der Endpunkte (TrennwandContext.jsx), einmalig statt interaktiv.
function trennwandReparieren(wand, innenEckpunkte, innenB, innenT) {
  if (istStreckeInPolygon({ x: wand.x1, y: wand.y1 }, { x: wand.x2, y: wand.y2 }, innenEckpunkte)) return wand
  const x1 = Math.max(0, Math.min(innenB, wand.x1))
  const y1 = Math.max(0, Math.min(innenT, wand.y1))
  const x2 = Math.max(0, Math.min(innenB, wand.x2))
  const y2 = Math.max(0, Math.min(innenT, wand.y2))
  return istStreckeInPolygon({ x: x1, y: y1 }, { x: x2, y: y2 }, innenEckpunkte) ? { ...wand, x1, y1, x2, y2 } : wand
}

export function RoomsProvider({ children }) {
  const { setRaumPanelOffen } = useUI()
  const { activeProject, activeProjectId, updateProjekt } = useProjekte()
  const [activeRoomId, setActiveRoomId] = useState(() => activeProject?.raeume?.[0]?.id ?? 1)

  // Beim Wechsel des Projekts (noch keine UI dafür) auf dessen ersten Raum springen,
  // aber NICHT bei jeder Raum-Änderung innerhalb desselben Projekts neu auswählen.
  useEffect(() => {
    setActiveRoomId(activeProject?.raeume?.[0]?.id ?? 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst nur an activeProjectId gekoppelt, nicht an activeProject.raeume
  }, [activeProjectId])

  const rooms = useMemo(() => activeProject?.raeume || [], [activeProject])
  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0]

  const updateRoom = useCallback((id, changes) => {
    const neueRaeume = (activeProject?.raeume || []).map(r => {
      if (r.id !== id) return r
      const aktualisiert = { ...r, ...changes }
      // raumForm/breite/tiefe/aussparungBreite/aussparungTiefe/ausrichtung sind die Quelle der
      // Wahrheit für die Raumform — eckpunkte muss bei jeder Änderung mitgezogen werden, damit
      // beide nicht auseinanderlaufen, sobald ein Verbraucher eckpunkte liest.
      if (['breite', 'tiefe', 'raumForm', 'aussparungBreite', 'aussparungTiefe', 'ausrichtung'].some(feld => feld in changes)) {
        aktualisiert.eckpunkte = raumformPolygon(aktualisiert)
      }
      return aktualisiert
    })
    updateProjekt(activeProjectId, { raeume: neueRaeume })
  }, [updateProjekt, activeProjectId, activeProject])

  // Justiert Möbel, Trennwände und Fenster/Türen eines Raums neu, damit sie in dessen aktuelle
  // eckpunkte passen — nötig, weil eine Größen-/Formänderung sonst Inhalte außerhalb der neuen
  // Wände stehen lassen würde (bisher schon so bei jeder Rechteck-Verkleinerung, siehe Analyse
  // 9b-2). Wird bewusst NICHT bei jeder updateRoom-Änderung automatisch mitgezogen, sondern
  // gezielt vom Aufrufer angestoßen, wenn eine Formänderung "fertig" ist — bei Breite/Tiefe also
  // erst beim Verlassen des Zahlenfelds (RaumSchritt.jsx, onBlur), nicht bei jedem Tastendruck.
  // Sonst würde z.B. das Eintippen von "12" kurzzeitig einen 1m-Raum durchlaufen, der beim
  // sofortigen Klemmen alle Möbel in die Ecke schieben würde, obwohl der Raum am Ende viel
  // größer ist. Rechnet dieselbe Geometrie wie useRaumGeometrie.js, aber hook-frei (RoomsContext
  // kann useRaumGeometrie nicht aufrufen, das würde useDesign voraussetzen, das seinerseits auf
  // RoomsContext aufbaut).
  const nachjustiereRaum = useCallback((id) => {
    const neueRaeume = (activeProject?.raeume || []).map(raum => {
      if (raum.id !== id) return raum

      const polygonPx = raum.eckpunkte.map(p => ({ x: p.x * 60, y: p.y * 60 }))
      const box = boundingBox(polygonPx)
      const wandDicke = WAND_DICKE_PX
      const innenB = box.breite - wandDicke * 2
      const innenT = box.tiefe - wandDicke * 2
      const fussleisteBreite = (raum.fussleiste ?? DEFAULT_RAUM_DESIGN.fussleiste) ? 8 : 0
      const grenzB = innenB - fussleisteBreite * 2
      const grenzT = innenT - fussleisteBreite * 2
      const grenzStart = fussleisteBreite
      const { grenzeEckpunkte, innenEckpunkte } = innenPolygone(polygonPx, wandDicke, fussleisteBreite)

      const furniture = (raum.furniture || []).map(item => item.istWandElement
        ? wandElementReparieren(item, grenzeEckpunkte)
        : moebelReparieren(item, grenzeEckpunkte, grenzStart, grenzB, grenzT))
      const trennwaende = (raum.trennwaende || []).map(wand => trennwandReparieren(wand, innenEckpunkte, innenB, innenT))

      return { ...raum, furniture, trennwaende }
    })
    updateProjekt(activeProjectId, { raeume: neueRaeume })
  }, [updateProjekt, activeProjectId, activeProject])

  const addRoom = useCallback(() => {
    const raumId = vergibRaumId()
    const newRoom = { id: raumId, name: `Raum ${raumId}`, raumForm: 'rechteck', breite: 5, tiefe: 4, furniture: [], eckpunkte: rechteckPolygon(5, 4), ...DEFAULT_RAUM_DESIGN, wizardSchritt: DEFAULT_WIZARD_SCHRITT }
    const neueRaeume = [...(activeProject?.raeume || []), newRoom]
    updateProjekt(activeProjectId, { raeume: neueRaeume })
    setActiveRoomId(newRoom.id)
    setRaumPanelOffen(true)
  }, [updateProjekt, activeProjectId, activeProject, setRaumPanelOffen])

  const deleteRoom = useCallback((id) => {
    const raeume = activeProject?.raeume || []
    if (raeume.length === 1) return
    const remaining = raeume.filter(r => r.id !== id)
    updateProjekt(activeProjectId, { raeume: remaining })
    if (activeRoomId === id) setActiveRoomId(remaining[0].id)
  }, [updateProjekt, activeProjectId, activeProject, activeRoomId])

  const waehleRaum = useCallback((id) => {
    if (activeRoomId === id) {
      setRaumPanelOffen(offen => !offen)
    } else {
      setActiveRoomId(id)
      setRaumPanelOffen(true)
    }
  }, [activeRoomId, setRaumPanelOffen])

  const value = useMemo(() => ({
    rooms, activeRoomId, activeRoom,
    setActiveRoomId, updateRoom, nachjustiereRaum, addRoom, deleteRoom, waehleRaum,
  }), [rooms, activeRoomId, activeRoom, updateRoom, nachjustiereRaum, addRoom, deleteRoom, waehleRaum])

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useRooms() {
  return useContext(RoomsContext)
}
