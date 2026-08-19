import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { useRooms } from './RoomsContext'
import { useRaumGeometrie } from './useRaumGeometrie'
import { vergibMoebelId } from './idZaehler'
import { wandSegmente as wandSegmenteAus, distanzPunktZuStrecke } from '../raumPolygon'

const FurnitureContext = createContext(null)

export function FurnitureProvider({ children }) {
  const { activeRoom, activeRoomId, updateRoom } = useRooms()
  const { grenzB, grenzT, grenzStart, grenzeEckpunkte } = useRaumGeometrie()
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
      rotation: 0, istWandElement: true,
      // Segment 0 = Nordwand (siehe HIMMELSRICHTUNG_JE_SEGMENT). Position = Abstand vom
      // Segmentanfang (0,0) in Metern — für die Nordwand deckungsgleich mit left/60.
      wandSegment: 0, wandPosition: left / 60,
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

      // Fenster/Türen: an nächstgelegenes Wandsegment snappen statt an Möbel-Kollisionen.
      // grenzeEckpunkte hat dieselbe Eckpunktreihenfolge wie ein Rechteck-Polygon, daher
      // liefert Segmentindex i dieselbe Himmelsrichtung wie HIMMELSRICHTUNG_JE_SEGMENT
      // (0=nord, 1=ost, 2=sued, 3=west) — generalisiert die vier festen Fälle von vorher.
      if (item.istWandElement) {
        const w = item.width
        const h = item.height
        const cx = currentLeft + w / 2
        const cy = currentTop  + h / 2

        const segmente = wandSegmenteAus(grenzeEckpunkte)
        // Bei exakter Abstandsgleichheit behalten wir die alte Priorität aus der Vier-Fälle-
        // Logik bei: nord > sued > west > ost (Segmentindizes 0,2,3,1) — praktisch unerreichbar
        // bei einer Maus-Drag-Position, aber wir wollen echte Verhaltensgleichheit, keine
        // Näherung über die naechsteKante()-Standardreihenfolge (die ost vor west bevorzugen würde).
        const prioritaet = [0, 2, 3, 1]
        let segment = null
        let besteDistanz = Infinity
        prioritaet.forEach(i => {
          const kandidat = segmente[i]
          if (!kandidat) return
          const distanz = distanzPunktZuStrecke({ x: cx, y: cy }, kandidat.start, kandidat.ende)
          if (distanz < besteDistanz) { besteDistanz = distanz; segment = kandidat }
        })

        const horizontal = segment.start.y === segment.ende.y
        const reversed = horizontal ? segment.start.x > segment.ende.x : segment.start.y > segment.ende.y

        // "Entlang der Wand" ist immer die Elementbreite w (nicht h, siehe 3D-Rendering) — die
        // flush-Seite (nah an der Segmentlinie) ergibt sich aus der nach außen zeigenden
        // Normale: das Element liegt auf der Innenseite, also entgegen der Normale.
        let newLeft, newTop, newRotation
        if (horizontal) {
          newRotation = 0
          const minX = Math.min(segment.start.x, segment.ende.x)
          const maxX = Math.max(segment.start.x, segment.ende.x)
          newLeft = Math.max(minX, Math.min(maxX - w, cx - w / 2))
          newTop  = segment.normale.y < 0 ? segment.start.y : segment.start.y - h
        } else {
          newRotation = 90
          const minY = Math.min(segment.start.y, segment.ende.y)
          const maxY = Math.max(segment.start.y, segment.ende.y)
          newTop  = Math.max(minY, Math.min(maxY - w, cy - w / 2))
          newLeft = segment.normale.x < 0 ? segment.start.x : segment.start.x - h
        }

        // wandPosition ist der Abstand vom Segmentanfang in Metern (siehe wandSegmente() in
        // raumPolygon.js, dieselbe Definition wie die v4->v5-Migration in projekteStorage.js):
        // läuft das Segment in dieselbe Richtung wie die Pixel-Achse, direkt aus left/top;
        // läuft es entgegengesetzt (reversed), vom Gesamtmaß der Wand rückwärts gerechnet.
        const raumBreite = activeRoom?.breite || 6
        const raumTiefe  = activeRoom?.tiefe  || 5
        const wandPosition = horizontal
          ? (reversed ? raumBreite - newLeft / 60 : newLeft / 60)
          : (reversed ? raumTiefe  - newTop  / 60 : newTop  / 60)

        updateFurniture(aktuellesFurniture.map(f => f.id === id
          ? { ...f, left: newLeft, top: newTop, wandSegment: segment.index, wandPosition, rotation: newRotation, origWidth: w, origHeight: h }
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
  }, [activeRoom, updateFurniture, grenzB, grenzT, grenzStart, grenzeEckpunkte])

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
