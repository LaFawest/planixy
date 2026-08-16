import { useState, useEffect, useRef } from 'react'
import { alleKatalogItems, initialRooms, WAND_DICKE_PX } from './constants'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import MobileNav from './components/MobileNav'
import Canvas2D from './components/Canvas2D'
import PanelRechts from './components/PanelRechts'

const loadRooms = () => {
  const saved = localStorage.getItem('planixy-rooms')
  return saved ? JSON.parse(saved) : initialRooms
}

const maxId = (werte) => werte.reduce((max, w) => typeof w === 'number' && w > max ? w : max, 0)

let nextRoomId = maxId(loadRooms().map(r => r.id)) + 1
let nextId = maxId(loadRooms().flatMap(r => (r.furniture || []).map(f => f.id))) + 1
let nextWandId = maxId(loadRooms().flatMap(r => (r.trennwaende || []).map(w => w.id))) + 1

function App() {
  const [rooms, setRooms] = useState(loadRooms)
  const [activeRoomId, setActiveRoomId] = useState(() => loadRooms()[0]?.id ?? 1)
  const [raumPanelOffen, setRaumPanelOffen] = useState(false)
  const [aktiveKategorie, setAktiveKategorie] = useState('Alle')
  const [suche, setSuche] = useState('')
  const [aktiverTab, setAktiverTab] = useState(null)
  const [ansicht, setAnsicht] = useState('2d')
  const [selectedId, setSelectedId] = useState(null)
  const [fussleiste, setFussleiste] = useState(true)
  const [raumHoehe, setRaumHoehe] = useState(2.5)
  const [fussleisteFarbe, setFussleisteFarbe] = useState('#E0DDD8')
  const [aktiveWand, setAktiveWand] = useState('alle')
  const [zeichneWand, setZeichneWand] = useState(false)
  const [wandEntwurf, setWandEntwurf] = useState(null)
  const [wandVorschau, setWandVorschau] = useState(null)
  const [selectedWandId, setSelectedWandId] = useState(null)
  const canvasInnerRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('planixy-rooms', JSON.stringify(rooms))
  }, [rooms])

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0]
  const furniture = activeRoom?.furniture || []
  const canvasB = (activeRoom?.breite || 6) * 60
  const canvasT = (activeRoom?.tiefe  || 5) * 60
  const wandDicke = WAND_DICKE_PX
  const innenB = canvasB - wandDicke * 2
  const innenT = canvasT - wandDicke * 2
  const fussleisteBreite = fussleiste ? 8 : 0
  const grenzB = innenB - fussleisteBreite * 2
  const grenzT = innenT - fussleisteBreite * 2
  const grenzStart = fussleisteBreite

  const updateRoom = (id, changes) => setRooms(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
  const setBoden = (boden) => updateRoom(activeRoomId, { boden })
  const setWandfarbeFuer = (farbe) => {
    if (aktiveWand === 'alle') {
      updateRoom(activeRoomId, { wandfarbe: farbe, wandfarben: null })
    } else {
      updateRoom(activeRoomId, { wandfarben: { ...(activeRoom?.wandfarben || {}), [aktiveWand]: farbe } })
    }
  }
  const aktuelleWandfarbe = aktiveWand === 'alle'
    ? (activeRoom?.wandfarbe || '#FFFFFF')
    : (activeRoom?.wandfarben?.[aktiveWand] || activeRoom?.wandfarbe || '#FFFFFF')
  const updateFurniture = (newFurniture) => updateRoom(activeRoomId, { furniture: newFurniture })

  const trennwaende = activeRoom?.trennwaende || []
  const updateTrennwaende = (arr) => updateRoom(activeRoomId, { trennwaende: arr })
  const removeTrennwand = (id) => { updateTrennwaende(trennwaende.filter(w => w.id !== id)); setSelectedWandId(null) }
  const setTrennwandFarbe = (id, farbe) => updateTrennwaende(trennwaende.map(w => w.id === id ? { ...w, farbe } : w))
  const setTrennwandDicke = (id, dicke) => updateTrennwaende(trennwaende.map(w => w.id === id ? { ...w, dicke } : w))

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

  const bestaetigeWand = () => {
    if (!wandVorschau) return
    updateTrennwaende([...(activeRoom?.trennwaende || []), { id: nextWandId++, ...wandVorschau, farbe: '#B4B2A9', dicke: 10 }])
    setWandVorschau(null)
  }
  const verwerfeWand = () => setWandVorschau(null)

  const startWandZeichnen = (e) => {
    if (!zeichneWand || wandVorschau) return
    e.preventDefault()
    const rect = canvasInnerRef.current.getBoundingClientRect()
    const x1 = Math.max(0, Math.min(innenB, e.clientX - rect.left))
    const y1 = Math.max(0, Math.min(innenT, e.clientY - rect.top))
    let aktuell = { x1, y1, x2: x1, y2: y1 }
    setWandEntwurf(aktuell)

    const onMove = (mv) => {
      const rawX = Math.max(0, Math.min(innenB, mv.clientX - rect.left))
      const rawY = Math.max(0, Math.min(innenT, mv.clientY - rect.top))
      const snapped = snapPunkt(x1, y1, rawX, rawY)
      const x2 = Math.max(0, Math.min(innenB, snapped.x2))
      const y2 = Math.max(0, Math.min(innenT, snapped.y2))
      aktuell = { x1, y1, x2, y2 }
      setWandEntwurf(aktuell)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const laenge = Math.hypot(aktuell.x2 - aktuell.x1, aktuell.y2 - aktuell.y1)
      setWandEntwurf(null)
      if (laenge > 15) {
        setWandVorschau(aktuell)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleWandDrag = (e, id, modus) => {
    e.preventDefault()
    e.stopPropagation()
    const wand = trennwaende.find(w => w.id === id)
    if (!wand) return
    setSelectedWandId(id)
    setSelectedId(null)
    const orig = { ...wand }
    const startX = e.clientX, startY = e.clientY
    const clampX = v => Math.max(0, Math.min(innenB, v))
    const clampY = v => Math.max(0, Math.min(innenT, v))

    const onMove = (mv) => {
      const dx = mv.clientX - startX, dy = mv.clientY - startY
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
      updateTrennwaende(trennwaende.map(w => w.id === id ? updated : w))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

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

  const addRoom = () => {
    const newRoom = { id: nextRoomId++, name: `Raum ${nextRoomId - 1}`, breite: 5, tiefe: 4, furniture: [] }
    setRooms(prev => [...prev, newRoom])
    setActiveRoomId(newRoom.id)
    setRaumPanelOffen(true)
  }

  const deleteRoom = (id) => {
    if (rooms.length === 1) return
    const remaining = rooms.filter(r => r.id !== id)
    setRooms(remaining)
    if (activeRoomId === id) setActiveRoomId(remaining[0].id)
  }

  const waehleRaum = (id) => {
    if (activeRoomId === id) {
      setRaumPanelOffen(offen => !offen)
    } else {
      setActiveRoomId(id)
      setRaumPanelOffen(true)
    }
  }

  const addFurniture = (item) => {
    updateFurniture([...furniture, {
      ...item, id: nextId++,
      top: 20 + Math.random() * 100,
      left: 20 + Math.random() * 100,
      rotation: 0,
      origWidth: item.width,
      origHeight: item.height,
    }])
  }

  const addWandElement = (item) => {
    const left = Math.max(grenzStart, Math.min(grenzStart + grenzB - item.width, grenzStart + 20 + Math.random() * 100))
    updateFurniture([...furniture, {
      ...item, id: nextId++,
      top: grenzStart, left,
      rotation: 0, istWandElement: true, wand: 'nord',
    }])
  }

  const removeFurniture = (id) => updateFurniture(furniture.filter(f => f.id !== id))

  const rotateFurniture = (id, winkel) => {
    updateFurniture(furniture.map(f => {
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
  }

  const handleDrag = (e, id) => {
    e.preventDefault()
    const item = furniture.find(f => f.id === id)
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
      updateFurniture(furniture.map(f => f.id === id ? { ...f, left: currentLeft, top: currentTop } : f))
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

        updateFurniture(furniture.map(f => f.id === id
          ? { ...f, left: newLeft, top: newTop, wand, rotation: newRotation, origWidth: w, origHeight: h }
          : f))
        return
      }

      // Elektrogeräte stehen auf anderen Möbelstücken — keine Kollisionsprüfung
      if (item.kategorie === 'Elektrogeräte') return

      // Beim Loslassen — Kollision prüfen und an nächste freie Kante snappen
      const anderesMoebel = furniture.filter(f => f.id !== id && f.kategorie !== 'Elektrogeräte')
      
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

      updateFurniture(furniture.map(f => f.id === id ? { ...f, left: bestePosition.left, top: bestePosition.top } : f))
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
  }
  const gefilterteMoebel = alleKatalogItems.filter(item => {
    const kategorieOk = aktiveKategorie === 'Alle' || item.kategorie === aktiveKategorie
    const sucheOk = item.name.toLowerCase().includes(suche.toLowerCase())
    return kategorieOk && sucheOk
  })
  const katalogItemHinzufuegen = (item) => item.typ ? addWandElement(item) : addFurniture(item)

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>

      <Sidebar
        rooms={rooms} activeRoomId={activeRoomId} raumPanelOffen={raumPanelOffen} waehleRaum={waehleRaum} deleteRoom={deleteRoom} addRoom={addRoom}
        suche={suche} setSuche={setSuche} aktiveKategorie={aktiveKategorie} setAktiveKategorie={setAktiveKategorie} gefilterteMoebel={gefilterteMoebel} katalogItemHinzufuegen={katalogItemHinzufuegen}
      />

      {/* Hauptbereich */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <Topbar activeRoom={activeRoom} ansicht={ansicht} setAnsicht={setAnsicht} furniture={furniture} />

        <Canvas2D
          ansicht={ansicht} activeRoom={activeRoom} canvasB={canvasB} canvasT={canvasT} innenB={innenB} innenT={innenT} wandDicke={wandDicke} canvasInnerRef={canvasInnerRef}
          zeichneWand={zeichneWand} setZeichneWand={setZeichneWand} wandVorschau={wandVorschau} setWandVorschau={setWandVorschau} bestaetigeWand={bestaetigeWand} verwerfeWand={verwerfeWand} startWandZeichnen={startWandZeichnen}
          setSelectedId={setSelectedId} setSelectedWandId={setSelectedWandId} trennwaende={trennwaende} selectedWandId={selectedWandId} handleWandDrag={handleWandDrag} wandEntwurf={wandEntwurf}
          fussleiste={fussleiste} fussleisteFarbe={fussleisteFarbe} furniture={furniture} selectedId={selectedId} handleDrag={handleDrag} removeFurniture={removeFurniture} rotateFurniture={rotateFurniture}
          raumHoehe={raumHoehe} setTrennwandFarbe={setTrennwandFarbe} setTrennwandDicke={setTrennwandDicke} removeTrennwand={removeTrennwand}
        />

      </div>

      <PanelRechts
        raumPanelOffen={raumPanelOffen} activeRoom={activeRoom} activeRoomId={activeRoomId} setRaumPanelOffen={setRaumPanelOffen} updateRoom={updateRoom} raumHoehe={raumHoehe} setRaumHoehe={setRaumHoehe}
        fussleiste={fussleiste} setFussleiste={setFussleiste} fussleisteFarbe={fussleisteFarbe} setFussleisteFarbe={setFussleisteFarbe} setBoden={setBoden}
        aktiveWand={aktiveWand} setAktiveWand={setAktiveWand} aktuelleWandfarbe={aktuelleWandfarbe} setWandfarbeFuer={setWandfarbeFuer}
        furniture={furniture} removeFurniture={removeFurniture}
      />

      <MobileNav
        aktiverTab={aktiverTab} setAktiverTab={setAktiverTab}
        rooms={rooms} activeRoomId={activeRoomId} setActiveRoomId={setActiveRoomId} deleteRoom={deleteRoom} addRoom={addRoom}
        suche={suche} setSuche={setSuche} aktiveKategorie={aktiveKategorie} setAktiveKategorie={setAktiveKategorie} gefilterteMoebel={gefilterteMoebel} katalogItemHinzufuegen={katalogItemHinzufuegen}
        activeRoom={activeRoom} updateRoom={updateRoom} setBoden={setBoden} aktiveWand={aktiveWand} setAktiveWand={setAktiveWand} aktuelleWandfarbe={aktuelleWandfarbe} setWandfarbeFuer={setWandfarbeFuer}
      />

    </div>
  )
}

export default App