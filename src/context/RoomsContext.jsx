import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { loadRooms, saveRooms, maxId } from './roomsStorage'
import { useUI } from './UIContext'
import { DEFAULT_RAUM_DESIGN } from '../constants'

const RoomsContext = createContext(null)

let nextRoomId = maxId(loadRooms().map(r => r.id)) + 1

export function RoomsProvider({ children }) {
  const { setRaumPanelOffen } = useUI()
  const [rooms, setRooms] = useState(loadRooms)
  const [activeRoomId, setActiveRoomId] = useState(() => loadRooms()[0]?.id ?? 1)

  useEffect(() => {
    saveRooms(rooms)
  }, [rooms])

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0]

  const updateRoom = useCallback((id, changes) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
  }, [])

  const addRoom = useCallback(() => {
    const newRoom = { id: nextRoomId++, name: `Raum ${nextRoomId - 1}`, breite: 5, tiefe: 4, furniture: [], ...DEFAULT_RAUM_DESIGN }
    setRooms(prev => [...prev, newRoom])
    setActiveRoomId(newRoom.id)
    setRaumPanelOffen(true)
  }, [setRaumPanelOffen])

  const deleteRoom = useCallback((id) => {
    if (rooms.length === 1) return
    const remaining = rooms.filter(r => r.id !== id)
    setRooms(remaining)
    if (activeRoomId === id) setActiveRoomId(remaining[0].id)
  }, [rooms, activeRoomId])

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
