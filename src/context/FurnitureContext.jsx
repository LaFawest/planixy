import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { useRooms } from './RoomsContext'
import { useRaumGeometrie } from './useRaumGeometrie'
import { vergibMoebelId } from './idZaehler'

const FurnitureContext = createContext(null)

export function FurnitureProvider({ children }) {
  const { activeRoom, activeRoomId, updateRoom } = useRooms()
  const { grenzB, grenzT, grenzStart } = useRaumGeometrie()
  const [selectedId, setSelectedId] = useState(null)

  const furniture = useMemo(() => activeRoom?.furniture || [], [activeRoom])

  const updateFurniture = useCallback((newFurniture) => {
    updateRoom(activeRoomId, { furniture: newFurniture })
  }, [updateRoom, activeRoomId])

  const addFurniture = useCallback((item) => {
    updateFurniture([...(activeRoom?.furniture || []), {
      ...item, id: vergibMoebelId(),
      top: 20 + Math.random() * 100,
      left: 20 + Math.random() * 100,
      rotation: 0,
      origWidth: item.width,
      origHeight: item.height,
    }])
  }, [updateFurniture, activeRoom])

  const addWandElement = useCallback((item) => {
    const left = Math.max(grenzStart, Math.min(grenzStart + grenzB - item.width, grenzStart + 20 + Math.random() * 100))
    updateFurniture([...(activeRoom?.furniture || []), {
      ...item, id: vergibMoebelId(),
      top: grenzStart, left,
      rotation: 0, istWandElement: true, wand: 'nord',
    }])
  }, [updateFurniture, activeRoom, grenzB, grenzStart])

  const removeFurniture = useCallback((id) => {
    updateFurniture((activeRoom?.furniture || []).filter(f => f.id !== id))
  }, [updateFurniture, activeRoom])

  const rotateFurniture = useCallback((id, winkel) => {
    updateFurniture((activeRoom?.furniture || []).map(f => {
      if (f.id !== id) return f
      const origW = f.origWidth  || f.width
      const origH = f.origHeight || f.height

      // Mittelpunkt aus aktueller visueller Position berechnen
      const aktuelleRad = (f.rotation || 0) * Math.PI / 180
      const aktuelleCos = Math.abs(Math.cos(aktuelleRad))
      const aktuelleSin = Math.abs(Math.sin(aktuelleRad))
      const aktuelleBoundW = origW * aktuelleCos + origH * aktuelleSin
      const aktuelleBoundH = origW * aktuelleSin + origH * aktuelleCos

      const mitteX = f.left + aktuelleBoundW / 2
      const mitteY = f.top  + aktuelleBoundH / 2

      // Neue Bounding Box für neuen Winkel
      const rad = winkel * Math.PI / 180
      const cos = Math.abs(Math.cos(rad))
      const sin = Math.abs(Math.sin(rad))
      const boundW = origW * cos + origH * sin
      const boundH = origW * sin + origH * cos

      let newLeft = Math.max(grenzStart, Math.min(grenzStart + grenzB - boundW, mitteX - boundW / 2))
      let newTop  = Math.max(grenzStart, Math.min(grenzStart + grenzT - boundH, mitteY - boundH / 2))

      return { ...f, rotation: winkel, left: newLeft, top: newTop, origWidth: origW, origHeight: origH }
    }))
  }, [updateFurniture, activeRoom, grenzB, grenzT, grenzStart])

  const handleDrag = useCallback((e, id) => {
    e.preventDefault()
    const aktuellesFurniture = activeRoom?.furniture || []
    const item = aktuellesFurniture.find(f => f.id === id)
    const startX = e.clientX || e.touches?.[0]?.clientX
    const startY = e.clientY || e.touches?.[0]?.clientY
    const startLeft = item.left
    const startTop  = item.top
    let currentLeft = startLeft
    let currentTop  = startTop

    const onMove = (mv) => {
      mv.preventDefault()
      const clientX = mv.clientX || mv.touches?.[0]?.clientX
      const clientY = mv.clientY || mv.touches?.[0]?.clientY
      const iW = item.origWidth  || item.width
      const iH = item.origHeight || item.height
      const rad = (item.rotation || 0) * Math.PI / 180
      const cos = Math.abs(Math.cos(rad))
      const sin = Math.abs(Math.sin(rad))
      const boundW = iW * cos + iH * sin
      const boundH = iW * sin + iH * cos
      currentLeft = Math.max(grenzStart, Math.min(grenzStart + grenzB - boundW, startLeft + (clientX - startX)))
      currentTop  = Math.max(grenzStart, Math.min(grenzStart + grenzT - boundH, startTop  + (clientY - startY)))
      // Frei bewegen ohne Kollision
      updateFurniture(aktuellesFurniture.map(f => f.id === id ? { ...f, left: currentLeft, top: currentTop } : f))
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)

      // Fenster/Türen: an nächstgelegene Wand snappen statt an Möbel-Kollisionen
      if (item.istWandElement) {
        const w = item.width
        const h = item.height
        const cx = currentLeft + w / 2
        const cy = currentTop  + h / 2

        const distNord = cy - grenzStart
        const distSued = (grenzStart + grenzT) - cy
        const distWest = cx - grenzStart
        const distOst  = (grenzStart + grenzB) - cx
        const minDist  = Math.min(distNord, distSued, distWest, distOst)

        let wand, newLeft, newTop, newRotation
        if (minDist === distNord) {
          wand = 'nord'; newRotation = 0
          newTop  = grenzStart
          newLeft = Math.max(grenzStart, Math.min(grenzStart + grenzB - w, cx - w / 2))
        } else if (minDist === distSued) {
          wand = 'sued'; newRotation = 0
          newTop  = grenzStart + grenzT - h
          newLeft = Math.max(grenzStart, Math.min(grenzStart + grenzB - w, cx - w / 2))
        } else if (minDist === distWest) {
          wand = 'west'; newRotation = 90
          newLeft = grenzStart
          newTop  = Math.max(grenzStart, Math.min(grenzStart + grenzT - w, cy - w / 2))
        } else {
          wand = 'ost'; newRotation = 90
          newLeft = grenzStart + grenzB - h
          newTop  = Math.max(grenzStart, Math.min(grenzStart + grenzT - w, cy - w / 2))
        }

        updateFurniture(aktuellesFurniture.map(f => f.id === id
          ? { ...f, left: newLeft, top: newTop, wand, rotation: newRotation, origWidth: w, origHeight: h }
          : f))
        return
      }

      // Elektrogeräte stehen auf anderen Möbelstücken — keine Kollisionsprüfung
      if (item.kategorie === 'Elektrogeräte') return

      // Beim Loslassen — Kollision prüfen und an nächste freie Kante snappen
      const anderesMoebel = aktuellesFurniture.filter(f => f.id !== id && f.kategorie !== 'Elektrogeräte')

      const iW = item.origWidth  || item.width
      const iH = item.origHeight || item.height
      const rad = (item.rotation || 0) * Math.PI / 180
      const cos = Math.abs(Math.cos(rad))
      const sin = Math.abs(Math.sin(rad))
      const boundW = iW * cos + iH * sin
      const boundH = iW * sin + iH * cos

      const kollidiert = (l, t) => anderesMoebel.some(f => {
        const fW = f.origWidth  || f.width
        const fH = f.origHeight || f.height
        const fRad = (f.rotation || 0) * Math.PI / 180
        const fCos = Math.abs(Math.cos(fRad))
        const fSin = Math.abs(Math.sin(fRad))
        const fBoundW = fW * fCos + fH * fSin
        const fBoundH = fW * fSin + fH * fCos
        return (
          l < f.left + fBoundW &&
          l + boundW > f.left &&
          t < f.top + fBoundH &&
          t + boundH > f.top
        )
      })

      if (!kollidiert(currentLeft, currentTop)) {
        // Keine Kollision — Position beibehalten
        return
      }

      // Snap zu nächster freier Kante
      let bestePosition = { left: startLeft, top: startTop }
      let besteDistanz = Infinity

      anderesMoebel.forEach(f => {
        // Mögliche Snap-Positionen an allen 4 Kanten
        const fW = f.origWidth  || f.width
        const fH = f.origHeight || f.height
        const fRad = (f.rotation || 0) * Math.PI / 180
        const fCos = Math.abs(Math.cos(fRad))
        const fSin = Math.abs(Math.sin(fRad))
        const fBoundW = fW * fCos + fH * fSin
        const fBoundH = fW * fSin + fH * fCos
        const kandidaten = [
          { left: f.left + fBoundW, top: currentTop },
          { left: f.left - boundW,  top: currentTop },
          { left: currentLeft, top: f.top + fBoundH },
          { left: currentLeft, top: f.top - boundH  },
        ]

        kandidaten.forEach(pos => {
          // Grenzen einhalten
          const l = Math.max(grenzStart, Math.min(grenzStart + grenzB - item.width,  pos.left))
          const t = Math.max(grenzStart, Math.min(grenzStart + grenzT - item.height, pos.top))

          // Prüfen ob diese Position frei ist
          if (!kollidiert(l, t)) {
            // Distanz zur aktuellen Position berechnen
            const distanz = Math.abs(l - currentLeft) + Math.abs(t - currentTop)
            if (distanz < besteDistanz) {
              besteDistanz = distanz
              bestePosition = { left: l, top: t }
            }
          }
        })
      })

      updateFurniture(aktuellesFurniture.map(f => f.id === id ? { ...f, left: bestePosition.left, top: bestePosition.top } : f))
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }, [activeRoom, updateFurniture, grenzB, grenzT, grenzStart])

  const value = useMemo(() => ({
    furniture, selectedId, setSelectedId,
    updateFurniture, addFurniture, addWandElement, removeFurniture, rotateFurniture, handleDrag,
  }), [furniture, selectedId, updateFurniture, addFurniture, addWandElement, removeFurniture, rotateFurniture, handleDrag])

  return <FurnitureContext.Provider value={value}>{children}</FurnitureContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useFurniture() {
  return useContext(FurnitureContext)
}
