import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRooms } from './RoomsContext'
import { useFurniture } from './FurnitureContext'
import { useWizard } from './WizardContext'
import { useRaumGeometrie } from './useRaumGeometrie'
import { vergibWandId } from './idZaehler'

const TrennwandContext = createContext(null)

const snapPunkt = (x1, y1, x2, y2) => {
  const dx = x2 - x1, dy = y2 - y1
  const dist = Math.hypot(dx, dy)
  if (dist < 1) return { x2, y2 }
  const winkel = Math.atan2(dy, dx)
  const stufe = Math.PI / 4
  const genormt = Math.round(winkel / stufe) * stufe
  if (Math.abs(winkel - genormt) < (6 * Math.PI / 180)) {
    return { x2: x1 + Math.cos(genormt) * dist, y2: y1 + Math.sin(genormt) * dist }
  }
  return { x2, y2 }
}

export function TrennwandProvider({ children }) {
  const { activeRoom, activeRoomId, updateRoom } = useRooms()
  const { setSelectedId } = useFurniture()
  const { schritt } = useWizard()
  const { innenB, innenT } = useRaumGeometrie()
  const [zeichneWand, setZeichneWand] = useState(false)
  const [wandEntwurf, setWandEntwurf] = useState(null)
  const [wandVorschau, setWandVorschau] = useState(null)
  const [selectedWandId, setSelectedWandId] = useState(null)
  const [gesehenerSchritt, setGesehenerSchritt] = useState(schritt)
  const canvasInnerRef = useRef(null)

  // Trennwände gehören zu Schritt 1 "Raum" — beim Verlassen den Zeichen-/Auswahlzustand
  // zurücksetzen, egal wie der Schrittwechsel ausgelöst wurde (Leiste, Weiter/Zurück, Raumwechsel).
  // Direkt im Render statt in einem Effect angepasst (React-Empfehlung für "State an eine
  // Prop-Änderung anpassen"), damit es keinen zusätzlichen Render-Durchlauf braucht.
  if (schritt !== gesehenerSchritt) {
    setGesehenerSchritt(schritt)
    if (schritt !== 1) {
      setZeichneWand(false)
      setWandEntwurf(null)
      setWandVorschau(null)
      setSelectedWandId(null)
    }
  }

  const trennwaende = useMemo(() => activeRoom?.trennwaende || [], [activeRoom])

  const updateTrennwaende = useCallback((arr) => {
    updateRoom(activeRoomId, { trennwaende: arr })
  }, [updateRoom, activeRoomId])

  const removeTrennwand = useCallback((id) => {
    updateTrennwaende((activeRoom?.trennwaende || []).filter(w => w.id !== id))
    setSelectedWandId(null)
  }, [updateTrennwaende, activeRoom])

  const setTrennwandFarbe = useCallback((id, farbe) => {
    updateTrennwaende((activeRoom?.trennwaende || []).map(w => w.id === id ? { ...w, farbe } : w))
  }, [updateTrennwaende, activeRoom])

  const setTrennwandDicke = useCallback((id, dicke) => {
    updateTrennwaende((activeRoom?.trennwaende || []).map(w => w.id === id ? { ...w, dicke } : w))
  }, [updateTrennwaende, activeRoom])

  const bestaetigeWand = useCallback(() => {
    if (!wandVorschau) return
    updateTrennwaende([...(activeRoom?.trennwaende || []), { id: vergibWandId(), ...wandVorschau, farbe: '#B4B2A9', dicke: 10 }])
    setWandVorschau(null)
  }, [wandVorschau, updateTrennwaende, activeRoom])

  const verwerfeWand = useCallback(() => setWandVorschau(null), [])

  const startWandZeichnen = useCallback((e) => {
    if (!zeichneWand || wandVorschau) return
    e.preventDefault()
    const rect = canvasInnerRef.current.getBoundingClientRect()
    const startClientX = e.clientX ?? e.touches?.[0]?.clientX
    const startClientY = e.clientY ?? e.touches?.[0]?.clientY
    const x1 = Math.max(0, Math.min(innenB, startClientX - rect.left))
    const y1 = Math.max(0, Math.min(innenT, startClientY - rect.top))
    let aktuell = { x1, y1, x2: x1, y2: y1 }
    setWandEntwurf(aktuell)

    const onMove = (mv) => {
      mv.preventDefault()
      const clientX = mv.clientX ?? mv.touches?.[0]?.clientX
      const clientY = mv.clientY ?? mv.touches?.[0]?.clientY
      const rawX = Math.max(0, Math.min(innenB, clientX - rect.left))
      const rawY = Math.max(0, Math.min(innenT, clientY - rect.top))
      const snapped = snapPunkt(x1, y1, rawX, rawY)
      const x2 = Math.max(0, Math.min(innenB, snapped.x2))
      const y2 = Math.max(0, Math.min(innenT, snapped.y2))
      aktuell = { x1, y1, x2, y2 }
      setWandEntwurf(aktuell)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      const laenge = Math.hypot(aktuell.x2 - aktuell.x1, aktuell.y2 - aktuell.y1)
      setWandEntwurf(null)
      if (laenge > 15) {
        setWandVorschau(aktuell)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }, [zeichneWand, wandVorschau, innenB, innenT])

  const handleWandDrag = useCallback((e, id, modus) => {
    e.preventDefault()
    e.stopPropagation()
    const aktuelleTrennwaende = activeRoom?.trennwaende || []
    const wand = aktuelleTrennwaende.find(w => w.id === id)
    if (!wand) return
    setSelectedWandId(id)
    setSelectedId(null)
    const orig = { ...wand }
    const startX = e.clientX ?? e.touches?.[0]?.clientX
    const startY = e.clientY ?? e.touches?.[0]?.clientY
    const clampX = v => Math.max(0, Math.min(innenB, v))
    const clampY = v => Math.max(0, Math.min(innenT, v))

    const onMove = (mv) => {
      mv.preventDefault()
      const clientX = mv.clientX ?? mv.touches?.[0]?.clientX
      const clientY = mv.clientY ?? mv.touches?.[0]?.clientY
      const dx = clientX - startX, dy = clientY - startY
      let updated
      if (modus === 'start') {
        updated = { ...orig, x1: clampX(orig.x1 + dx), y1: clampY(orig.y1 + dy) }
      } else if (modus === 'end') {
        updated = { ...orig, x2: clampX(orig.x2 + dx), y2: clampY(orig.y2 + dy) }
      } else {
        // Ganze Wand verschieben: dx/dy so begrenzen, dass beide Endpunkte innerhalb der Raumgrenze bleiben,
        // ohne die Wand zu verzerren (statt jeden Punkt einzeln zu klemmen)
        const minDx = -Math.min(orig.x1, orig.x2)
        const maxDx = innenB - Math.max(orig.x1, orig.x2)
        const minDy = -Math.min(orig.y1, orig.y2)
        const maxDy = innenT - Math.max(orig.y1, orig.y2)
        const clampedDx = Math.max(minDx, Math.min(maxDx, dx))
        const clampedDy = Math.max(minDy, Math.min(maxDy, dy))
        updated = { ...orig, x1: orig.x1 + clampedDx, y1: orig.y1 + clampedDy, x2: orig.x2 + clampedDx, y2: orig.y2 + clampedDy }
      }
      updateTrennwaende(aktuelleTrennwaende.map(w => w.id === id ? updated : w))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }, [activeRoom, updateTrennwaende, setSelectedId, innenB, innenT])

  useEffect(() => {
    if (!zeichneWand) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (wandVorschau) setWandVorschau(null)
      else setZeichneWand(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zeichneWand, wandVorschau])

  const value = useMemo(() => ({
    trennwaende, zeichneWand, setZeichneWand, wandEntwurf, wandVorschau, setWandVorschau,
    selectedWandId, setSelectedWandId, canvasInnerRef,
    updateTrennwaende, removeTrennwand, setTrennwandFarbe, setTrennwandDicke,
    bestaetigeWand, verwerfeWand, startWandZeichnen, handleWandDrag,
  }), [
    trennwaende, zeichneWand, wandEntwurf, wandVorschau, selectedWandId,
    updateTrennwaende, removeTrennwand, setTrennwandFarbe, setTrennwandDicke,
    bestaetigeWand, verwerfeWand, startWandZeichnen, handleWandDrag,
  ])

  return <TrennwandContext.Provider value={value}>{children}</TrennwandContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useTrennwand() {
  return useContext(TrennwandContext)
}
