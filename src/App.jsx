import { useState, useEffect, useRef } from 'react'
import RoomView3D from './RoomView3D'
import { alleKatalogItems, bodenBelaege, wandFarben, wandSeiten, initialRooms } from './constants'
import { moebelIconTyp, moebelShapes } from './moebelIcons'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import MobileNav from './components/MobileNav'

const wandFarbeFuer = (room, seite) => room?.wandfarben?.[seite] || room?.wandfarbe || '#FFFFFF'

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
  const wandDicke = 8
  const innenB = canvasB - wandDicke * 2
  const innenT = canvasT - wandDicke * 2
  const fussleisteBreite = fussleiste ? 8 : 0
  const grenzB = innenB - fussleisteBreite * 2
  const grenzT = innenT - fussleisteBreite * 2
  const grenzStart = fussleisteBreite

  const updateRoom = (id, changes) => setRooms(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
  const setBoden = (boden) => updateRoom(activeRoomId, { boden })
  const setWandfarbe = (wandfarbe) => updateRoom(activeRoomId, { wandfarbe })
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

        {/* Canvas */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F4F0', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: '#B4B2A9', background: 'white', padding: '4px 12px', borderRadius: '20px', border: '1px solid #E8E6E0', zIndex: 10, whiteSpace: 'nowrap' }}>
            {ansicht === '2d' ? (wandVorschau ? 'Oben bestätigen oder verwerfen' : zeichneWand ? 'Wand ziehen · Winkel schnappt bei 45° · Esc zum Beenden' : 'Doppelklick auf Raumnamen · Blau = Drehen · Rot = Löschen') : 'Maus ziehen = Kamera drehen · Scrollrad = Zoom'}
          </div>
          {ansicht === '2d' && (
            <div onClick={() => { setZeichneWand(z => !z); setSelectedWandId(null); setSelectedId(null); setWandVorschau(null) }}
              style={{
                position: 'absolute', top: '16px', left: '16px', zIndex: 10, cursor: 'pointer',
                padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '500',
                background: zeichneWand ? '#185FA5' : 'white', color: zeichneWand ? 'white' : '#444441',
                border: `1px solid ${zeichneWand ? '#185FA5' : '#E8E6E0'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
              {zeichneWand ? '✕ Zeichnen beenden' : '+ Trennwand zeichnen'}
            </div>
          )}
          {ansicht === '2d' && wandVorschau && (
            <div style={{
              position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 12px', borderRadius: '20px', background: 'white',
              border: '1px solid #E8E6E0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <span style={{ fontSize: '12px', color: '#444441', fontWeight: '500' }}>Trennwand bauen?</span>
              <div onClick={bestaetigeWand} style={{ cursor: 'pointer', padding: '5px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: '500', background: '#185FA5', color: 'white' }}>Bauen</div>
              <div onClick={verwerfeWand} style={{ cursor: 'pointer', padding: '5px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: '500', background: '#F7F6F2', color: '#888780', border: '1px solid #E8E6E0' }}>Verwerfen</div>
            </div>
          )}
          {ansicht === '2d' ? (
            <div id="canvas" style={{
              width: `${canvasB}px`, height: `${canvasT}px`,
              borderRadius: '6px', position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(24,95,165,0.08)',
              outline: '2px solid #B5D4F4',
              boxSizing: 'border-box',
            }}>
              {/* Wände einzeln einfärbbar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${wandDicke}px`, background: wandFarbeFuer(activeRoom, 'nord'), zIndex: 3 }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${wandDicke}px`, background: wandFarbeFuer(activeRoom, 'sued'), zIndex: 3 }}></div>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${wandDicke}px`, background: wandFarbeFuer(activeRoom, 'west'), zIndex: 3 }}></div>
              <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${wandDicke}px`, background: wandFarbeFuer(activeRoom, 'ost'), zIndex: 3 }}></div>

              <div ref={canvasInnerRef} className={`canvas-wrap ${activeRoom?.boden || 'boden-standard'}`} style={{ position: 'absolute', inset: `${wandDicke}px` }}>
              {/* Deselect Layer */}
              <div onClick={() => { setSelectedId(null); setSelectedWandId(null) }}
                onMouseDown={startWandZeichnen}
                style={{ position: 'absolute', inset: 0, zIndex: 0, cursor: zeichneWand ? 'crosshair' : 'default' }} />

              {/* Trennwände */}
              <svg width={innenB} height={innenT} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: zeichneWand ? 'none' : 'auto' }}>
                {trennwaende.map(wand => (
                  <g key={wand.id}>
                    {selectedWandId === wand.id && (
                      <line x1={wand.x1} y1={wand.y1} x2={wand.x2} y2={wand.y2} stroke="#185FA5" strokeWidth={(wand.dicke || 10) + 6} strokeLinecap="square" opacity={0.25} pointerEvents="none" />
                    )}
                    <line x1={wand.x1} y1={wand.y1} x2={wand.x2} y2={wand.y2} stroke={wand.farbe} strokeWidth={wand.dicke || 10} strokeLinecap="square"
                      style={{ cursor: 'grab', pointerEvents: 'stroke' }}
                      onMouseDown={(e) => handleWandDrag(e, wand.id, 'body')} />
                    {selectedWandId === wand.id && (
                      <>
                        <circle cx={wand.x1} cy={wand.y1} r={7} fill="white" stroke="#185FA5" strokeWidth={2} style={{ cursor: 'move' }} onMouseDown={(e) => handleWandDrag(e, wand.id, 'start')} />
                        <circle cx={wand.x2} cy={wand.y2} r={7} fill="white" stroke="#185FA5" strokeWidth={2} style={{ cursor: 'move' }} onMouseDown={(e) => handleWandDrag(e, wand.id, 'end')} />
                      </>
                    )}
                  </g>
                ))}
                {wandEntwurf && (
                  <line x1={wandEntwurf.x1} y1={wandEntwurf.y1} x2={wandEntwurf.x2} y2={wandEntwurf.y2}
                    stroke="#185FA5" strokeWidth={10} strokeLinecap="square" strokeDasharray="6 5" opacity={0.7} pointerEvents="none" />
                )}
                {wandVorschau && (
                  <>
                    <line x1={wandVorschau.x1} y1={wandVorschau.y1} x2={wandVorschau.x2} y2={wandVorschau.y2}
                      stroke="#185FA5" strokeWidth={16} strokeLinecap="square" opacity={0.25} pointerEvents="none" />
                    <line x1={wandVorschau.x1} y1={wandVorschau.y1} x2={wandVorschau.x2} y2={wandVorschau.y2}
                      stroke="#B4B2A9" strokeWidth={10} strokeLinecap="square" strokeDasharray="4 4" pointerEvents="none" />
                  </>
                )}
              </svg>

              {fussleiste && (
                <>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                  <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '8px', background: fussleisteFarbe, zIndex: 2 }}></div>
                </>
              )}
              {furniture.map(item => {
                const W = item.origWidth || item.width
                const H = item.origHeight || item.height
                const isEcksofa = item.name.toLowerCase().includes('ecksofa')
                const zeigeIcon = !item.istWandElement && !isEcksofa
                const typ = moebelIconTyp(item.name)
                const shapes = zeigeIcon ? moebelShapes(item.color, item.border) : null

                const pad = 2
                const armDepth = Math.max(0, (Math.min(W, H) - pad * 2) / 2)
                const x0 = pad, y0 = pad, x1 = W - pad, y1 = H - pad
                const strip = armDepth * (3.5 / 12)
                const lShapePath = `M${x0},${y0} L${x0 + armDepth},${y0} L${x0 + armDepth},${y1 - armDepth} L${x1},${y1 - armDepth} L${x1},${y1} L${x0},${y1} Z`
                const labelLeft = (x0 + armDepth + x1) / 2
                const labelTop = y1 - armDepth / 2

                return (
                <div key={item.id} style={{
                  position: 'absolute',
                  zIndex: 1,
                  left: item.left + (() => {
                    const rad = (item.rotation || 0) * Math.PI / 180
                    return (W * Math.abs(Math.cos(rad)) + H * Math.abs(Math.sin(rad))) / 2
                  })(),
                  top: item.top + (() => {
                    const rad = (item.rotation || 0) * Math.PI / 180
                    return (W * Math.abs(Math.sin(rad)) + H * Math.abs(Math.cos(rad))) / 2
                  })(),
                  width: W,
                  height: H,
                  transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
                }}>
                  <div onMouseDown={(e) => { handleDrag(e, item.id); setSelectedId(item.id) }}
                    onTouchStart={(e) => { handleDrag(e, item.id); setSelectedId(item.id) }}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(item.id) }}
                    style={{
                      width: '100%', height: '100%',
                      background: (isEcksofa || zeigeIcon) ? 'transparent' : item.color,
                      border: (isEcksofa || zeigeIcon) ? 'none' : `${item.istWandElement ? '3px' : '1.5px'} solid ${item.border}`,
                      borderRadius: item.istWandElement ? '3px' : '5px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: '500', cursor: 'grab', userSelect: 'none',
                      color: item.border, position: 'relative', transition: 'box-shadow 0.15s',
                      boxShadow: selectedId === item.id ? `0 0 0 2px #185FA5` : 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${item.border}`}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = selectedId === item.id ? '0 0 0 2px #185FA5' : 'none'}
                  >
                    {isEcksofa ? (
                      <>
                        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                          <path d={lShapePath} fill={item.color} stroke={item.border} strokeWidth="1.3" strokeLinejoin="round" />
                          <rect x={x0} y={y0} width={strip} height={y1 - y0} fill={item.border} opacity="0.3" />
                          <rect x={x0} y={y1 - strip} width={x1 - x0} height={strip} fill={item.border} opacity="0.3" />
                        </svg>
                        <span style={{
                          position: 'absolute', left: labelLeft, top: labelTop, transform: 'translate(-50%, -50%)',
                          whiteSpace: 'nowrap', pointerEvents: 'none',
                        }}>{item.name}</span>
                      </>
                    ) : zeigeIcon ? (
                      <>
                        <svg viewBox="0 0 28 28" preserveAspectRatio="none"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                          {shapes[typ] || shapes.standard}
                        </svg>
                        <span style={{ position: 'relative', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{item.name}</span>
                      </>
                    ) : item.name}
                    <span onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                      onClick={(e) => { e.stopPropagation(); removeFurniture(item.id); setSelectedId(null) }}
                      style={{ position: 'absolute', top: '-8px', right: '-8px', width: '16px', height: '16px', borderRadius: '50%', background: '#E24B4A', color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>✕</span>
                  </div>


                </div>
              )})}
              </div>
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0 }}>
              <RoomView3D room={activeRoom} furniture={furniture} fussleiste={fussleiste} fussleisteFarbe={fussleisteFarbe} raumHoehe={raumHoehe} />
            </div>
          )}
        </div>
        {/* Rotations-Panel unter Canvas */}
        {selectedId !== null && ansicht === '2d' && (() => {
          const selectedItem = furniture.find(f => f.id === selectedId)
          if (!selectedItem) return null
          return (
            <div onClick={e => e.stopPropagation()} style={{
              background: 'white', borderTop: '1px solid #E8E6E0',
              padding: '10px 24px', display: 'flex', alignItems: 'center',
              gap: '12px', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: '12px', color: '#888780', fontWeight: '500' }}>{selectedItem.name}</span>
              <span style={{ fontSize: '12px', color: '#B4B2A9' }}>↻</span>
              <input type="range" min="0" max="359"
                value={selectedItem.rotation || 0}
                onChange={e => rotateFurniture(selectedItem.id, Number(e.target.value))}
                style={{ width: '160px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#185FA5', fontWeight: '500', minWidth: '40px' }}>{selectedItem.rotation || 0}°</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0, 90, 180, 270].map(w => (
                  <div key={w} onClick={() => rotateFurniture(selectedItem.id, w)} style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                    background: (selectedItem.rotation || 0) === w ? '#185FA5' : '#F7F6F2',
                    color: (selectedItem.rotation || 0) === w ? 'white' : '#888780',
                    border: '1px solid #E8E6E0',
                  }}>{w}°</div>
                ))}
              </div>
              <span onClick={() => setSelectedId(null)} style={{ cursor: 'pointer', color: '#B4B2A9', fontSize: '16px', marginLeft: '8px' }}>✕</span>
            </div>
          )
        })()}

        {/* Trennwand-Panel unter Canvas */}
        {selectedWandId !== null && ansicht === '2d' && (() => {
          const selectedWand = trennwaende.find(w => w.id === selectedWandId)
          if (!selectedWand) return null
          return (
            <div onClick={e => e.stopPropagation()} style={{
              background: 'white', borderTop: '1px solid #E8E6E0',
              padding: '10px 24px', display: 'flex', alignItems: 'center',
              gap: '12px', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: '12px', color: '#888780', fontWeight: '500' }}>Trennwand</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                {wandFarben.slice(0, 12).map(f => (
                  <div key={f.name} onClick={() => setTrennwandFarbe(selectedWand.id, f.farbe)} title={f.name}
                    style={{
                      width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', background: f.farbe,
                      border: `${selectedWand.farbe === f.farbe ? '2px' : '1px'} solid ${selectedWand.farbe === f.farbe ? '#185FA5' : '#E8E6E0'}`,
                    }} />
                ))}
              </div>
              <span style={{ fontSize: '12px', color: '#B4B2A9' }}>Dicke</span>
              <input type="range" min="4" max="30" step="2"
                value={selectedWand.dicke || 10}
                onChange={e => setTrennwandDicke(selectedWand.id, Number(e.target.value))}
                style={{ width: '120px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#185FA5', fontWeight: '500', minWidth: '32px' }}>{Math.round((selectedWand.dicke || 10) / 0.6)} cm</span>
              <div onClick={() => removeTrennwand(selectedWand.id)} style={{ cursor: 'pointer', color: '#E24B4A', fontSize: '12px', fontWeight: '500', padding: '4px 10px', borderRadius: '8px', border: '1px solid #F4C0C0' }}>Löschen</div>
              <span onClick={() => setSelectedWandId(null)} style={{ cursor: 'pointer', color: '#B4B2A9', fontSize: '16px', marginLeft: '8px' }}>✕</span>
            </div>
          )
        })()}
      </div>

      {/* Panel rechts */}
      <div className="panel-rechts" style={{ width: '220px', background: 'white', borderLeft: '1px solid #E8E6E0', padding: '16px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '-2px 0 8px rgba(0,0,0,0.04)' }}>
        {raumPanelOffen && activeRoom ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.08em', margin: 0 }}>RAUMEINSTELLUNGEN</p>
              <span onClick={() => setRaumPanelOffen(false)} style={{ cursor: 'pointer', color: '#B4B2A9', fontSize: '14px' }}>✕</span>
            </div>

            <input type="text" value={activeRoom.name} onChange={e => updateRoom(activeRoomId, { name: e.target.value })}
              placeholder="Raumname"
              style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #E8E6E0', borderRadius: '8px', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', boxSizing: 'border-box' }} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#888780' }}>Breite</span>
                <input type="number" min="1" max="20" value={activeRoom.breite || 6} onChange={e => updateRoom(activeRoomId, { breite: Number(e.target.value) })}
                  style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
                <span style={{ fontSize: '12px', color: '#888780' }}>× Tiefe</span>
                <input type="number" min="1" max="20" value={activeRoom.tiefe || 5} onChange={e => updateRoom(activeRoomId, { tiefe: Number(e.target.value) })}
                  style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#888780' }}>Höhe</span>
                <input type="number" min="1.9" max="5" step="0.1" value={raumHoehe} onChange={e => setRaumHoehe(Number(e.target.value))}
                  style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
                <span style={{ fontSize: '12px', color: '#888780' }}>m</span>
                <span style={{ marginLeft: 'auto', background: '#EAF3DE', color: '#3B6D11', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '500' }}>{(activeRoom.breite || 6) * (activeRoom.tiefe || 5)} m²</span>
              </div>
            </div>

            <div style={{ height: '1px', background: '#E8E6E0' }}></div>

            {/* Fußleiste */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.06em' }}>FUSSLEISTE</p>
                <div onClick={() => setFussleiste(!fussleiste)} style={{
                  width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s',
                  background: fussleiste ? '#185FA5' : '#E8E6E0', position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: '2px', left: fussleiste ? '18px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}></div>
                </div>
              </div>
              {fussleiste && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { name: 'Weiß',    farbe: '#FFFFFF' },
                    { name: 'Creme',   farbe: '#E0DDD8' },
                    { name: 'Grau',    farbe: '#B4B2A9' },
                    { name: 'Schwarz', farbe: '#2C2C2A' },
                    { name: 'Holz',    farbe: '#C8A97A' },
                    { name: 'Wand',    farbe: activeRoom?.wandfarbe || '#FFFFFF' },
                  ].map(f => (
                    <div key={f.name} onClick={() => setFussleisteFarbe(f.farbe)} style={{
                      width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                      background: f.farbe, border: `${fussleisteFarbe === f.farbe ? '3px' : '1px'} solid ${fussleisteFarbe === f.farbe ? '#185FA5' : '#E8E6E0'}`,
                      title: f.name,
                    }} title={f.name}></div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: '#E8E6E0' }}></div>

            <div>
              <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>BODENBELAG</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {bodenBelaege.map(boden => (
                  <div key={boden.name} onClick={() => setBoden(boden.klasse)} style={{
                    padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                    border: `${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '2px' : '1px'} solid ${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#E8E6E0'}`,
                    background: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#EEF4FC' : '#FAFAF8',
                    fontSize: '10px', color: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#444441',
                  }}>
                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>{boden.icon}</div>
                    {boden.name}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>WANDFARBE</p>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {[{ seite: 'alle', name: 'Alle' }, ...wandSeiten].map(w => (
                  <div key={w.seite} onClick={() => setAktiveWand(w.seite)} style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                    background: aktiveWand === w.seite ? '#185FA5' : '#F7F6F2',
                    color: aktiveWand === w.seite ? 'white' : '#888780',
                    border: `1px solid ${aktiveWand === w.seite ? '#185FA5' : '#E8E6E0'}`,
                  }}>{w.name}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {wandFarben.map(wand => (
                  <div key={wand.name} onClick={() => setWandfarbeFuer(wand.farbe)} style={{
                    padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                    border: `${aktuelleWandfarbe === wand.farbe ? '2px' : '1px'} solid ${aktuelleWandfarbe === wand.farbe ? '#185FA5' : '#E8E6E0'}`,
                    background: aktuelleWandfarbe === wand.farbe ? '#EEF4FC' : '#FAFAF8',
                  }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: wand.farbe, margin: '0 auto 4px', border: '1px solid #E8E6E0' }}></div>
                    <div style={{ fontSize: '10px', color: aktuelleWandfarbe === wand.farbe ? '#185FA5' : '#444441', fontWeight: aktuelleWandfarbe === wand.farbe ? '500' : '400' }}>{wand.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', background: '#E8E6E0' }}></div>
          </>
        ) : (
          <p style={{ fontSize: '12px', color: '#B4B2A9', lineHeight: 1.5 }}>Klicke links auf einen Raum, um Name, Größe, Fußleiste, Bodenbelag und Wandfarbe einzustellen.</p>
        )}

        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '8px', letterSpacing: '0.06em' }}>IM RAUM ({furniture.length})</p>
          {furniture.length === 0
            ? <p style={{ fontSize: '12px', color: '#B4B2A9', textAlign: 'center', marginTop: '8px' }}>Noch keine Möbel</p>
            : furniture.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#FAFAF8', borderRadius: '8px', marginBottom: '4px', border: '1px solid #E8E6E0', fontSize: '12px', color: '#444441', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F0EC'}
                onMouseLeave={e => e.currentTarget.style.background = '#FAFAF8'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', background: item.color, border: `1px solid ${item.border}`, borderRadius: '3px', flexShrink: 0 }}></div>
                  {item.name}
                </div>
                <span onClick={() => removeFurniture(item.id)} style={{ cursor: 'pointer', color: '#D3D1C7', fontSize: '11px' }}
                  onMouseEnter={e => e.target.style.color = '#E24B4A'}
                  onMouseLeave={e => e.target.style.color = '#D3D1C7'}>✕</span>
              </div>
            ))
          }
        </div>
      </div>

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