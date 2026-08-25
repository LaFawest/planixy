import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { useRooms } from './RoomsContext'
import { useRaumGeometrie } from './useRaumGeometrie'
import { vergibMoebelId } from './idZaehler'
import { snappeWandElement, naechsteFreieEcke } from '../raumPolygon'

const FurnitureContext = createContext(null)

// Achsen-Slide: Kandidatposition übernehmen, wenn die volle Möbel-Bounding-Box im Polygon
// liegt; sonst nur die Achse übernehmen, die noch eine gültige Position ergibt (fühlt sich
// beim Ziehen an wie ein Entlanggleiten an der Kante); wenn keine Achse einzeln gültig ist,
// bei der letzten bekannten gültigen Position bleiben.
function klemmeMitSlide(kandidatLinks, kandidatOben, letzteLinks, letzteOben, boundW, boundH, rechteckInPolygon) {
  if (rechteckInPolygon(kandidatLinks, kandidatOben, boundW, boundH)) return { left: kandidatLinks, top: kandidatOben }
  if (rechteckInPolygon(kandidatLinks, letzteOben, boundW, boundH)) return { left: kandidatLinks, top: letzteOben }
  if (rechteckInPolygon(letzteLinks, kandidatOben, boundW, boundH)) return { left: letzteLinks, top: kandidatOben }
  return { left: letzteLinks, top: letzteOben }
}

export function FurnitureProvider({ children }) {
  const { activeRoom, activeRoomId, updateRoom } = useRooms()
  const { grenzB, grenzT, grenzStart, grenzeEckpunkte, innenEckpunkte, wandDicke, rechteckInPolygon } = useRaumGeometrie()
  const [selectedId, setSelectedId] = useState(null)

  const furniture = useMemo(() => activeRoom?.furniture || [], [activeRoom])

  const updateFurniture = useCallback((newFurniture) => {
    updateRoom(activeRoomId, { furniture: newFurniture })
  }, [updateRoom, activeRoomId])

  // Zufällige Position in der oberen linken Raumecke (wie bisher) — bei einem Rechteck immer
  // gültig, landet beim ersten Versuch. Bei einer L-/U-Form kann genau diese Ecke aber die
  // Aussparung sein: ein paar weitere Zufallsversuche in derselben kleinen Ecke helfen dann
  // nichts (sie liegen alle im selben ungültigen Bereich). Als letztes Mittel greift
  // naechsteFreieEcke (raumPolygon.js) — eine reine Bounding-Box-Klemmung würde hier nicht
  // reichen, eine Position kann innerhalb der Bounding-Box liegen und trotzdem in der
  // (konkaven) Aussparung.
  const addFurniture = useCallback((item) => {
    let left, top
    let versuch = 0
    do {
      left = 20 + Math.random() * 100
      top = 20 + Math.random() * 100
      versuch++
    } while (!rechteckInPolygon(left, top, item.width, item.height) && versuch < 12)
    if (!rechteckInPolygon(left, top, item.width, item.height)) {
      const ecke = naechsteFreieEcke(item.width, item.height, grenzeEckpunkte, grenzStart, grenzB, grenzT)
      if (ecke) { left = ecke.left; top = ecke.top }
    }
    updateFurniture([...(activeRoom?.furniture || []), {
      ...item, id: vergibMoebelId(),
      top, left,
      rotation: 0,
      origWidth: item.width,
      origHeight: item.height,
    }])
  }, [updateFurniture, activeRoom, grenzB, grenzT, grenzStart, grenzeEckpunkte, rechteckInPolygon])

  // Startpunkt oben, zufällig versetzt (wie bisher bei Rechtecken), aber über snappeWandElement
  // auf das tatsächlich nächstgelegene Segment gesnappt statt Segment 0 hart zu unterstellen —
  // bei einer L-/U-Form ist Segment 0 nicht zwangsläufig die durchgehende Nordwand, sondern kann
  // eine kurze Innenwand der Aussparung sein, auf die weder die feste Wandsegment-Zuordnung noch
  // die auf grenzB bezogene left-Klemmung gepasst hätten. Gesnappt wird auf innenEckpunkte (die
  // Wandinnenkante), nicht auf grenzeEckpunkte (die um die Fußleiste verkleinerte Möbelgrenze) —
  // sonst sitzt das Element sichtbar neben statt in der Wand.
  const addWandElement = useCallback((item) => {
    const cx = grenzStart + 20 + Math.random() * 100
    const cy = grenzStart
    const { left, top, wandSegment, wandPosition, rotation } = snappeWandElement(cx, cy, item.width, item.height, innenEckpunkte, wandDicke)
    updateFurniture([...(activeRoom?.furniture || []), {
      ...item, id: vergibMoebelId(),
      left, top, rotation, istWandElement: true, wandSegment, wandPosition,
    }])
  }, [updateFurniture, activeRoom, innenEckpunkte, wandDicke, grenzStart])

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

      const kandidatLinks = Math.max(grenzStart, Math.min(grenzStart + grenzB - boundW, mitteX - boundW / 2))
      const kandidatOben  = Math.max(grenzStart, Math.min(grenzStart + grenzT - boundH, mitteY - boundH / 2))
      // Vorherige Position (mit den alten Maßen) als Fallback, falls die neue Rotation an
      // dieser Stelle nicht ins Polygon passt.
      const letzteLinks = Math.max(grenzStart, Math.min(grenzStart + grenzB - boundW, f.left))
      const letzteOben  = Math.max(grenzStart, Math.min(grenzStart + grenzT - boundH, f.top))
      const { left: newLeft, top: newTop } = klemmeMitSlide(
        kandidatLinks, kandidatOben, letzteLinks, letzteOben, boundW, boundH, rechteckInPolygon,
      )

      return { ...f, rotation: winkel, left: newLeft, top: newTop, origWidth: origW, origHeight: origH }
    }))
  }, [updateFurniture, activeRoom, grenzB, grenzT, grenzStart, rechteckInPolygon])

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
      // Achsen-Klemmung zuerst als billiger Vorfilter (verhindert extreme Koordinaten bei
      // schnellen Mausbewegungen), rechteckInPolygon danach nur einmal bis dreimal auf die
      // bereits eingegrenzte Kandidatposition — für die aktuellen Raumgrößen vernachlässigbare
      // Kosten pro Mousemove.
      const kandidatLinks = Math.max(grenzStart, Math.min(grenzStart + grenzB - boundW, startLeft + (clientX - startX)))
      const kandidatOben  = Math.max(grenzStart, Math.min(grenzStart + grenzT - boundH, startTop  + (clientY - startY)))
      const geklemmt = klemmeMitSlide(kandidatLinks, kandidatOben, currentLeft, currentTop, boundW, boundH, rechteckInPolygon)
      currentLeft = geklemmt.left
      currentTop  = geklemmt.top
      // Frei bewegen ohne Möbel-Kollision (nur Raumgrenze wird geprüft)
      updateFurniture(aktuellesFurniture.map(f => f.id === id ? { ...f, left: currentLeft, top: currentTop } : f))
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)

      // Fenster/Türen: an nächstgelegenes Wandsegment snappen statt an Möbel-Kollisionen.
      // snappeWandElement (raumPolygon.js) sucht generisch über alle Segmente, nicht mehr auf
      // die vier Rechteckwände beschränkt — bei einer L-/U-Form (Schritt 9b) müssen auch die
      // neuen Segmente der Aussparung erreichbar sein. Dieselbe Funktion nutzt auch die
      // Nachjustierung nach einer Formänderung (RoomsContext.jsx, Schritt 9b-2). Gesnappt wird
      // auf innenEckpunkte, siehe addWandElement oben.
      if (item.istWandElement) {
        const w = item.width
        const h = item.height
        const cx = currentLeft + w / 2
        const cy = currentTop  + h / 2
        const { left, top, wandSegment, wandPosition, rotation } = snappeWandElement(cx, cy, w, h, innenEckpunkte, wandDicke)

        updateFurniture(aktuellesFurniture.map(f => f.id === id
          ? { ...f, left, top, wandSegment, wandPosition, rotation, origWidth: w, origHeight: h }
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

          // Prüfen ob diese Position frei ist und vollständig im Raumpolygon liegt
          if (!kollidiert(l, t) && rechteckInPolygon(l, t, item.width, item.height)) {
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
  }, [activeRoom, updateFurniture, grenzB, grenzT, grenzStart, innenEckpunkte, wandDicke, rechteckInPolygon])

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
