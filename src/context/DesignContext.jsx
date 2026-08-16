import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { useRooms } from './RoomsContext'

const DesignContext = createContext(null)

export function DesignProvider({ children }) {
  const { activeRoom, activeRoomId, updateRoom } = useRooms()
  const [fussleiste, setFussleiste] = useState(true)
  const [raumHoehe, setRaumHoehe] = useState(2.5)
  const [fussleisteFarbe, setFussleisteFarbe] = useState('#E0DDD8')
  const [aktiveWand, setAktiveWand] = useState('alle')

  const setBoden = useCallback((boden) => updateRoom(activeRoomId, { boden }), [updateRoom, activeRoomId])

  const setWandfarbeFuer = useCallback((farbe) => {
    if (aktiveWand === 'alle') {
      updateRoom(activeRoomId, { wandfarbe: farbe, wandfarben: null })
    } else {
      updateRoom(activeRoomId, { wandfarben: { ...(activeRoom?.wandfarben || {}), [aktiveWand]: farbe } })
    }
  }, [updateRoom, activeRoomId, aktiveWand, activeRoom])

  const aktuelleWandfarbe = aktiveWand === 'alle'
    ? (activeRoom?.wandfarbe || '#FFFFFF')
    : (activeRoom?.wandfarben?.[aktiveWand] || activeRoom?.wandfarbe || '#FFFFFF')

  const value = useMemo(() => ({
    fussleiste, setFussleiste,
    raumHoehe, setRaumHoehe,
    fussleisteFarbe, setFussleisteFarbe,
    aktiveWand, setAktiveWand,
    setBoden, setWandfarbeFuer, aktuelleWandfarbe,
  }), [fussleiste, raumHoehe, fussleisteFarbe, aktiveWand, setBoden, setWandfarbeFuer, aktuelleWandfarbe])

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useDesign() {
  return useContext(DesignContext)
}
