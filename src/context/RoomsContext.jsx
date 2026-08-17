import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useUI } from './UIContext'
import { useProjekte } from './ProjectsContext'
import { vergibRaumId } from './idZaehler'
import { rechteckPolygon } from '../raumPolygon'
import { DEFAULT_RAUM_DESIGN, DEFAULT_WIZARD_SCHRITT } from '../constants'

const RoomsContext = createContext(null)

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
    const neueRaeume = (activeProject?.raeume || []).map(r => r.id === id ? { ...r, ...changes } : r)
    updateProjekt(activeProjectId, { raeume: neueRaeume })
  }, [updateProjekt, activeProjectId, activeProject])

  const addRoom = useCallback(() => {
    const raumId = vergibRaumId()
    const newRoom = { id: raumId, name: `Raum ${raumId}`, breite: 5, tiefe: 4, furniture: [], eckpunkte: rechteckPolygon(5, 4), ...DEFAULT_RAUM_DESIGN, wizardSchritt: DEFAULT_WIZARD_SCHRITT }
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
    setActiveRoomId, updateRoom, addRoom, deleteRoom, waehleRaum,
  }), [rooms, activeRoomId, activeRoom, updateRoom, addRoom, deleteRoom, waehleRaum])

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useRooms() {
  return useContext(RoomsContext)
}
