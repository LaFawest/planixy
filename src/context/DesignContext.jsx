import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { useRooms } from './RoomsContext'
import { DEFAULT_RAUM_DESIGN } from '../constants'

const DesignContext = createContext(null)

export function DesignProvider({ children }) {
  const { activeRoom, activeRoomId, updateRoom } = useRooms()
  // aktiveWand ist entweder 'alle' oder der Segmentindex der gerade ausgewählten Wand (siehe
  // wandSegmente() in raumPolygon.js) — seit Schritt 9a nicht mehr eine Himmelsrichtung, damit
  // auch Formen mit mehr/weniger als vier Wänden einzeln einfärbbar sind.
  const [aktiveWand, setAktiveWand] = useState('alle')

  const fussleiste = activeRoom?.fussleiste ?? DEFAULT_RAUM_DESIGN.fussleiste
  const fussleisteFarbe = activeRoom?.fussleisteFarbe ?? DEFAULT_RAUM_DESIGN.fussleisteFarbe
  const raumHoehe = activeRoom?.raumHoehe ?? DEFAULT_RAUM_DESIGN.raumHoehe
  const tageszeit = activeRoom?.tageszeit ?? DEFAULT_RAUM_DESIGN.tageszeit

  const setFussleiste = useCallback((wert) => updateRoom(activeRoomId, { fussleiste: wert }), [updateRoom, activeRoomId])
  const setFussleisteFarbe = useCallback((farbe) => updateRoom(activeRoomId, { fussleisteFarbe: farbe }), [updateRoom, activeRoomId])
  const setRaumHoehe = useCallback((hoehe) => updateRoom(activeRoomId, { raumHoehe: hoehe }), [updateRoom, activeRoomId])
  const setTageszeit = useCallback((stunde) => updateRoom(activeRoomId, { tageszeit: stunde }), [updateRoom, activeRoomId])

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
    tageszeit, setTageszeit,
    fussleisteFarbe, setFussleisteFarbe,
    aktiveWand, setAktiveWand,
    setBoden, setWandfarbeFuer, aktuelleWandfarbe,
  }), [
    fussleiste, setFussleiste, raumHoehe, setRaumHoehe, tageszeit, setTageszeit,
    fussleisteFarbe, setFussleisteFarbe, aktiveWand, setBoden, setWandfarbeFuer, aktuelleWandfarbe,
  ])

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useDesign() {
  return useContext(DesignContext)
}
