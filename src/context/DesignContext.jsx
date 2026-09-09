import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { useRooms } from './RoomsContext'
import { DEFAULT_RAUM_DESIGN } from '../constants'
import { vergibMoebelId } from './idZaehler'

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

  const setWandmaterialFuer = useCallback((material) => {
    if (aktiveWand === 'alle') {
      updateRoom(activeRoomId, { wandmaterial: material, wandmaterialien: null })
    } else {
      updateRoom(activeRoomId, { wandmaterialien: { ...(activeRoom?.wandmaterialien || {}), [aktiveWand]: material } })
    }
  }, [updateRoom, activeRoomId, aktiveWand, activeRoom])

  const aktuellesWandmaterial = aktiveWand === 'alle'
    ? (activeRoom?.wandmaterial || 'wand-putz')
    : (activeRoom?.wandmaterialien?.[aktiveWand] || activeRoom?.wandmaterial || 'wand-putz')

  // Freie Wandmaterial-Bereiche (Phase 3, Teil 3) — Teilrechtecke einer Wand mit eigenem
  // Material, unabhängig von der (ganzen) Wandfarbe/-material oben. Leben als eigenes Array
  // direkt auf dem Raum-Objekt (wie furniture bei FurnitureContext), da jeder Bereich seine
  // eigene Geometrie/Position hat statt nur eines Werts pro Wandindex.
  const wandBereiche = useMemo(() => activeRoom?.wandMaterialBereiche || [], [activeRoom])

  // Gibt die neue ID zurück, damit der Aufrufer (RoomView3D) den neuen Bereich direkt nach dem
  // Anlegen auswählen kann (siehe ausgewaehlterBereichRef dort) — crypto.randomUUID() in
  // vergibMoebelId() ist synchron, das funktioniert also ohne zusätzlichen Callback/Effect.
  const fuegeWandBereichHinzu = useCallback((bereich) => {
    const id = vergibMoebelId()
    updateRoom(activeRoomId, {
      wandMaterialBereiche: [...(activeRoom?.wandMaterialBereiche || []), { ...bereich, id }],
    })
    return id
  }, [updateRoom, activeRoomId, activeRoom])

  const aktualisiereWandBereich = useCallback((id, patch) => {
    updateRoom(activeRoomId, {
      wandMaterialBereiche: (activeRoom?.wandMaterialBereiche || []).map(b => b.id === id ? { ...b, ...patch } : b),
    })
  }, [updateRoom, activeRoomId, activeRoom])

  const entferneWandBereich = useCallback((id) => {
    updateRoom(activeRoomId, {
      wandMaterialBereiche: (activeRoom?.wandMaterialBereiche || []).filter(b => b.id !== id),
    })
  }, [updateRoom, activeRoomId, activeRoom])

  const value = useMemo(() => ({
    fussleiste, setFussleiste,
    raumHoehe, setRaumHoehe,
    tageszeit, setTageszeit,
    fussleisteFarbe, setFussleisteFarbe,
    aktiveWand, setAktiveWand,
    setBoden, setWandfarbeFuer, aktuelleWandfarbe,
    setWandmaterialFuer, aktuellesWandmaterial,
    wandBereiche, fuegeWandBereichHinzu, aktualisiereWandBereich, entferneWandBereich,
  }), [
    fussleiste, setFussleiste, raumHoehe, setRaumHoehe, tageszeit, setTageszeit,
    fussleisteFarbe, setFussleisteFarbe, aktiveWand, setBoden, setWandfarbeFuer, aktuelleWandfarbe,
    setWandmaterialFuer, aktuellesWandmaterial,
    wandBereiche, fuegeWandBereichHinzu, aktualisiereWandBereich, entferneWandBereich,
  ])

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useDesign() {
  return useContext(DesignContext)
}
