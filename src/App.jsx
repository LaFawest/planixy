import { useState, useEffect } from 'react'
import RoomView3D from './RoomView3D'

const furnitureLibrary = [
  { name: 'Sofa',           kategorie: 'Wohnen',     width: 100, height: 52,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Sessel',         kategorie: 'Wohnen',     width: 50,  height: 50,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Couchtisch',     kategorie: 'Wohnen',     width: 64,  height: 40,  color: '#C0DD97', border: '#639922' },
  { name: 'TV',             kategorie: 'Wohnen',     width: 80,  height: 24,  color: '#D3D1C7', border: '#444441' },
  { name: 'TV-Board',       kategorie: 'Wohnen',     width: 100, height: 30,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Esstisch',       kategorie: 'Wohnen',     width: 80,  height: 60,  color: '#C0DD97', border: '#639922' },
  { name: 'Essstuhl',       kategorie: 'Wohnen',     width: 32,  height: 32,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Vitrine',        kategorie: 'Wohnen',     width: 50,  height: 30,  color: '#D3D1C7', border: '#888780' },
  { name: 'Sideboard',      kategorie: 'Wohnen',     width: 90,  height: 30,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Bücherregal',    kategorie: 'Wohnen',     width: 60,  height: 24,  color: '#FAC775', border: '#BA7517' },
  { name: 'Einzelbett',     kategorie: 'Schlafen',   width: 70,  height: 110, color: '#F5C4B3', border: '#D85A30' },
  { name: 'Doppelbett',     kategorie: 'Schlafen',   width: 110, height: 120, color: '#F5C4B3', border: '#D85A30' },
  { name: 'Kleiderschrank', kategorie: 'Schlafen',   width: 90,  height: 50,  color: '#F5C4B3', border: '#D85A30' },
  { name: 'Nachttisch',     kategorie: 'Schlafen',   width: 36,  height: 36,  color: '#FAC775', border: '#BA7517' },
  { name: 'Kommode',        kategorie: 'Schlafen',   width: 60,  height: 36,  color: '#D3D1C7', border: '#888780' },
  { name: 'Spiegel',        kategorie: 'Schlafen',   width: 30,  height: 60,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Hocker',         kategorie: 'Schlafen',   width: 36,  height: 36,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Schreibtisch',   kategorie: 'Büro',       width: 80,  height: 44,  color: '#D3D1C7', border: '#888780' },
  { name: 'Bürostuhl',      kategorie: 'Büro',       width: 36,  height: 36,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Regal',          kategorie: 'Büro',       width: 60,  height: 24,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Aktenschrank',   kategorie: 'Büro',       width: 50,  height: 36,  color: '#D3D1C7', border: '#444441' },
  { name: 'Drucker',        kategorie: 'Büro',       width: 40,  height: 30,  color: '#D3D1C7', border: '#888780' },
  { name: 'Monitor',        kategorie: 'Büro',       width: 40,  height: 16,  color: '#444441', border: '#2C2C2A' },
  { name: 'Herd',           kategorie: 'Küche',      width: 60,  height: 60,  color: '#D3D1C7', border: '#444441' },
  { name: 'Kühlschrank',    kategorie: 'Küche',      width: 40,  height: 55,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Spüle',          kategorie: 'Küche',      width: 60,  height: 44,  color: '#B5D4F4', border: '#185FA5' },
  { name: 'Geschirrspüler', kategorie: 'Küche',      width: 44,  height: 44,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Kücheninsel',    kategorie: 'Küche',      width: 100, height: 60,  color: '#C0DD97', border: '#639922' },
  { name: 'Unterschrank',   kategorie: 'Küche',      width: 60,  height: 36,  color: '#D3D1C7', border: '#888780' },
  { name: 'Oberschrank',    kategorie: 'Küche',      width: 60,  height: 24,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Mikrowelle',     kategorie: 'Küche',      width: 36,  height: 28,  color: '#D3D1C7', border: '#444441' },
  { name: 'Badewanne',      kategorie: 'Badezimmer', width: 80,  height: 40,  color: '#B5D4F4', border: '#378ADD' },
  { name: 'Dusche',         kategorie: 'Badezimmer', width: 60,  height: 60,  color: '#B5D4F4', border: '#185FA5' },
  { name: 'WC',             kategorie: 'Badezimmer', width: 36,  height: 48,  color: '#f0f0f0', border: '#B4B2A9' },
  { name: 'Waschbecken',    kategorie: 'Badezimmer', width: 44,  height: 36,  color: '#f0f0f0', border: '#B4B2A9' },
  { name: 'Badschrank',     kategorie: 'Badezimmer', width: 50,  height: 30,  color: '#D3D1C7', border: '#888780' },
  { name: 'Handtuchhalter', kategorie: 'Badezimmer', width: 30,  height: 10,  color: '#D3D1C7', border: '#5F5E5A' },
  { name: 'Waschmaschine',  kategorie: 'Badezimmer', width: 44,  height: 44,  color: '#D3D1C7', border: '#888780' },
  { name: 'Pflanze',        kategorie: 'Deko',       width: 30,  height: 30,  color: '#C0DD97', border: '#3B6D11' },
  { name: 'Großpflanze',    kategorie: 'Deko',       width: 44,  height: 44,  color: '#C0DD97', border: '#3B6D11' },
  { name: 'Lampe',          kategorie: 'Deko',       width: 32,  height: 32,  color: '#FAC775', border: '#BA7517' },
  { name: 'Stehlampe',      kategorie: 'Deko',       width: 20,  height: 20,  color: '#FAC775', border: '#BA7517' },
  { name: 'Teppich klein',  kategorie: 'Deko',       width: 80,  height: 60,  color: '#F4C0D1', border: '#993556' },
  { name: 'Teppich groß',   kategorie: 'Deko',       width: 140, height: 100, color: '#F4C0D1', border: '#993556' },
  { name: 'Bild',           kategorie: 'Deko',       width: 40,  height: 30,  color: '#E1D4F4', border: '#7F77DD' },
  { name: 'Kamin',          kategorie: 'Deko',       width: 80,  height: 36,  color: '#F5C4B3', border: '#993C1D' },
]

const kategorien = ['Alle', 'Wohnen', 'Schlafen', 'Büro', 'Küche', 'Badezimmer', 'Deko']
const kategorieFarben = {
  'Wohnen':     { bg: '#E6F1FB', color: '#185FA5' },
  'Schlafen':   { bg: '#FAECE7', color: '#993C1D' },
  'Büro':       { bg: '#F1EFE8', color: '#5F5E5A' },
  'Küche':      { bg: '#EAF3DE', color: '#3B6D11' },
  'Badezimmer': { bg: '#E1F5EE', color: '#0F6E56' },
  'Deko':       { bg: '#FBEAF0', color: '#993556' },
}
const wandElemente = [
  { name: 'Tür',          typ: 'tuer',    width: 40, height: 12, color: '#FFF8E6', border: '#BA7517' },
  { name: 'Drehtür',      typ: 'tuer',    width: 44, height: 12, color: '#FFF8E6', border: '#BA7517' },
  { name: 'Schiebetür',   typ: 'tuer',    width: 50, height: 10, color: '#FFF8E6', border: '#BA7517' },
  { name: 'Fenster klein',typ: 'fenster', width: 40, height: 10, color: '#E6F4FB', border: '#185FA5' },
  { name: 'Fenster groß', typ: 'fenster', width: 70, height: 10, color: '#E6F4FB', border: '#185FA5' },
  { name: 'Balkontür',    typ: 'tuer',    width: 44, height: 12, color: '#FFF8E6', border: '#BA7517' },
]
const bodenBelaege = [
  { name: 'Standard',  klasse: 'boden-standard', icon: '⬜' },
  { name: 'Parkett',   klasse: 'boden-parkett',  icon: '🪵' },
  { name: 'Laminat',   klasse: 'boden-laminat',  icon: '📋' },
  { name: 'Fliesen',   klasse: 'boden-fliesen',  icon: '🔲' },
  { name: 'Teppich',   klasse: 'boden-teppich',  icon: '🟪' },
  { name: 'Beton',     klasse: 'boden-beton',     icon: '🩶' },
]
const wandFarben = [
  { name: 'Weiß',        farbe: '#FFFFFF', text: '#888780' },
  { name: 'Cremeweiß',   farbe: '#F5F0E8', text: '#888780' },
  { name: 'Hellgrau',    farbe: '#E8E6E0', text: '#888780' },
  { name: 'Grau',        farbe: '#B4B2A9', text: '#444441' },
  { name: 'Anthrazit',   farbe: '#444441', text: '#F5F4F0' },
  { name: 'Beige',       farbe: '#E8D5B0', text: '#888780' },
  { name: 'Sandbraun',   farbe: '#C4A882', text: '#444441' },
  { name: 'Terrakotta',  farbe: '#D4856A', text: '#FFFFFF' },
  { name: 'Altrosa',     farbe: '#E8B4B8', text: '#444441' },
  { name: 'Mintgrün',    farbe: '#A8D5C2', text: '#444441' },
  { name: 'Salbei',      farbe: '#8FB89A', text: '#FFFFFF' },
  { name: 'Dunkelgrün',  farbe: '#2D5A3D', text: '#FFFFFF' },
  { name: 'Hellblau',    farbe: '#B8D4E8', text: '#444441' },
  { name: 'Stahlblau',   farbe: '#4A7FA5', text: '#FFFFFF' },
  { name: 'Dunkelblau',  farbe: '#1A3A5C', text: '#FFFFFF' },
  { name: 'Lavendel',    farbe: '#C4B8D4', text: '#444441' },
  { name: 'Aubergine',   farbe: '#5C3D5C', text: '#FFFFFF' },
  { name: 'Gelb',        farbe: '#F5E6A0', text: '#888780' },
]

let nextId = 10
let nextRoomId = 4

const initialRooms = [
  { id: 1, name: 'Wohnzimmer',  breite: 6, tiefe: 5, furniture: [] },
  { id: 2, name: 'Schlafzimmer', breite: 5, tiefe: 4, furniture: [] },
  { id: 3, name: 'Küche',       breite: 4, tiefe: 3, furniture: [] },
]

function App() {
  const [rooms, setRooms] = useState(() => {
    const saved = localStorage.getItem('planixy-rooms')
    return saved ? JSON.parse(saved) : initialRooms
  })
  const [activeRoomId, setActiveRoomId] = useState(1)
  const [editingRoomId, setEditingRoomId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [aktiveKategorie, setAktiveKategorie] = useState('Alle')
  const [suche, setSuche] = useState('')
  const [aktiverTab, setAktiverTab] = useState(null)
  const [ansicht, setAnsicht] = useState('2d')
  useEffect(() => {
    localStorage.setItem('planixy-rooms', JSON.stringify(rooms))
  }, [rooms])

  const activeRoom = rooms.find(r => r.id === activeRoomId)
  const furniture = activeRoom?.furniture || []

  const updateRoom = (id, changes) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
  }

  const setBoden = (boden) => {
    updateRoom(activeRoomId, { boden })
  }
  const setWandfarbe = (wandfarbe) => {
    updateRoom(activeRoomId, { wandfarbe })
  }

  const updateFurniture = (newFurniture) => {
    updateRoom(activeRoomId, { furniture: newFurniture })
  }

  // Raum hinzufügen
  const addRoom = () => {
    const newRoom = { id: nextRoomId++, name: `Raum ${nextRoomId - 1}`, breite: 5, tiefe: 4, furniture: [] }
    setRooms(prev => [...prev, newRoom])
    setActiveRoomId(newRoom.id)
    setEditingRoomId(newRoom.id)
    setEditingName(newRoom.name)
  }

  // Raum löschen
  const deleteRoom = (id) => {
    if (rooms.length === 1) return
    const remaining = rooms.filter(r => r.id !== id)
    setRooms(remaining)
    if (activeRoomId === id) setActiveRoomId(remaining[0].id)
  }

  // Umbenennen starten
  const startRename = (room) => {
    setEditingRoomId(room.id)
    setEditingName(room.name)
  }

  // Umbenennen speichern
  const saveRename = () => {
    if (editingName.trim()) updateRoom(editingRoomId, { name: editingName.trim() })
    setEditingRoomId(null)
  }

  // Möbel
  const addFurniture = (item) => {
    updateFurniture([...furniture, {
      ...item, id: nextId++,
      top: 20 + Math.random() * 150,
      left: 20 + Math.random() * 200,
      rotation: 0,
    }])
  }
  const addWandElement = (item) => {
    updateFurniture([...furniture, {
      ...item,
      id: nextId++,
      top: 0,
      left: 20 + Math.random() * 200,
      rotation: 0,
      istWandElement: true,
    }])
  }

  const removeFurniture = (id) => updateFurniture(furniture.filter(f => f.id !== id))

  const rotateFurniture = (id) => {
    updateFurniture(furniture.map(f =>
      f.id === id ? { ...f, rotation: ((f.rotation || 0) + 90) % 360 } : f
    ))
  }

  const handleDrag = (e, id) => {
    e.preventDefault()
    const canvas = document.getElementById('canvas')
    const rect = canvas.getBoundingClientRect()
    const item = furniture.find(f => f.id === id)
    const startX = e.clientX || e.touches?.[0]?.clientX
    const startY = e.clientY || e.touches?.[0]?.clientY
    const startLeft = item.left
    const startTop = item.top
    const rotation = item.rotation || 0
    const gedreht = rotation === 90 || rotation === 270

    // Bei Drehung tauschen Breite und Höhe
    const effW = gedreht ? item.height : item.width
    const effH = gedreht ? item.width  : item.height

    // Mittelpunkt-Offset bei Drehung
    const dx = (item.width  - effW) / 2
    const dy = (item.height - effH) / 2

    const onMove = (mv) => {
      mv.preventDefault()
      const clientX = mv.clientX || mv.touches?.[0]?.clientX
      const clientY = mv.clientY || mv.touches?.[0]?.clientY
      let newLeft = startLeft + (clientX - startX)
      let newTop  = startTop  + (clientY - startY)

      // Grenzen basierend auf effektiver Größe
      newLeft = Math.max(-dx, Math.min(rect.width  - item.width  + dx, newLeft))
      newTop  = Math.max(-dy, Math.min(rect.height - item.height + dy, newTop))

      updateFurniture(furniture.map(f => f.id === id ? { ...f, left: newLeft, top: newTop } : f))
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
  }

  const gefilterteMoebel = furnitureLibrary.filter(item => {
    const kategorieOk = aktiveKategorie === 'Alle' || item.kategorie === aktiveKategorie
    const sucheOk = item.name.toLowerCase().includes(suche.toLowerCase())
    return kategorieOk && sucheOk
  })

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>

      {/* Sidebar */}
      <div className="sidebar" style={{ width: '220px', background: 'white', borderRight: '1px solid #E8E6E0', padding: '24px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '0 8px', marginBottom: '28px' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '500', color: '#2C2C2A', letterSpacing: '-0.3px' }}>Planixy</h2>
          <p style={{ fontSize: '11px', color: '#B4B2A9', marginTop: '2px', letterSpacing: '0.02em' }}>Intelligente Raumplanung</p>
        </div>

        <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '8px', letterSpacing: '0.08em', padding: '0 8px' }}>MEINE RÄUME</p>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {rooms.map(room => (
            <div key={room.id} className="room-item" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', borderRadius: '10px', marginBottom: '3px',
              background: activeRoomId === room.id ? '#EEF4FC' : 'transparent',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
              onClick={() => setActiveRoomId(room.id)}
              onMouseEnter={e => { if (activeRoomId !== room.id) e.currentTarget.style.background = '#F7F6F2' }}
              onMouseLeave={e => { if (activeRoomId !== room.id) e.currentTarget.style.background = 'transparent' }}
            >
              {editingRoomId === room.id ? (
                <input autoFocus value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={e => e.key === 'Enter' && saveRename()}
                  onClick={e => e.stopPropagation()}
                  style={{ flex: 1, fontSize: '13px', border: 'none', background: 'transparent', outline: 'none', color: '#185FA5', fontFamily: "'DM Sans', sans-serif" }}
                />
              ) : (
                <span onDoubleClick={(e) => { e.stopPropagation(); startRename(room) }}
                  style={{ fontSize: '13px', color: activeRoomId === room.id ? '#185FA5' : '#444441', fontWeight: activeRoomId === room.id ? '500' : '400', flex: 1 }}>
                  {room.name}
                </span>
              )}
              {rooms.length > 1 && (
                <span onClick={(e) => { e.stopPropagation(); deleteRoom(room.id) }}
                  style={{ fontSize: '11px', color: '#D3D1C7', cursor: 'pointer', marginLeft: '4px', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = '#E24B4A'}
                  onMouseLeave={e => e.target.style.color = '#D3D1C7'}
                >✕</span>
              )}
            </div>
          ))}
        </div>

        <div onClick={addRoom} style={{
          marginTop: '12px', padding: '9px 12px', borderRadius: '10px',
          border: '1.5px dashed #D3D1C7', cursor: 'pointer', fontSize: '12px',
          color: '#888780', textAlign: 'center', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.color = '#185FA5' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#D3D1C7'; e.currentTarget.style.color = '#888780' }}
        >
          + Raum hinzufügen
        </div>
      </div>

      {/* Hauptbereich */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ padding: '14px 28px', borderBottom: '1px solid #E8E6E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '12px', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', minWidth: '80px' }}>{activeRoom?.name}</h3>
          <div style={{ display: 'flex', border: '1px solid #E8E6E0', borderRadius: '8px', overflow: 'hidden' }}>
            {['2d', '3d'].map(a => (
              <button key={a} onClick={() => setAnsicht(a)} style={{
                padding: '6px 14px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
                background: ansicht === a ? '#185FA5' : 'white',
                color: ansicht === a ? 'white' : '#888780',
                border: 'none', cursor: 'pointer', fontWeight: ansicht === a ? '500' : '400',
              }}>{a.toUpperCase()}</button>
            ))}
          </div>
          <div className="topbar-mitte" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#888780' }}>
            <span>Breite</span>
            <input type="number" min="1" max="20" value={activeRoom?.breite || 6}
              onChange={e => updateRoom(activeRoomId, { breite: Number(e.target.value) })}
              style={{ width: '52px', padding: '5px 8px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', outline: 'none', background: '#F7F6F2' }}
            />
            <span>m × Tiefe</span>
            <input type="number" min="1" max="20" value={activeRoom?.tiefe || 5}
              onChange={e => updateRoom(activeRoomId, { tiefe: Number(e.target.value) })}
              style={{ width: '52px', padding: '5px 8px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', outline: 'none', background: '#F7F6F2' }}
            />
            <span>m</span>
            <span style={{ background: '#EAF3DE', color: '#3B6D11', fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '500' }}>
              {(activeRoom?.breite || 6) * (activeRoom?.tiefe || 5)} m²
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#B4B2A9' }}>{furniture.length} Objekte</div>
            <button style={{
              padding: '8px 18px', background: '#185FA5', color: 'white', border: 'none',
              borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
              fontWeight: '500', letterSpacing: '0.01em', transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#0C447C'}
              onMouseLeave={e => e.currentTarget.style.background = '#185FA5'}
            >
              KI-Vorschlag
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F4F0', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: '#B4B2A9', background: 'white', padding: '4px 12px', borderRadius: '20px', border: '1px solid #E8E6E0', zIndex: 10, whiteSpace: 'nowrap' }}>
            {ansicht === '2d' ? 'Doppelklick auf Raumnamen zum Umbenennen · Blau = Drehen · Rot = Löschen' : 'Maus ziehen = Kamera drehen · Scrollrad = Zoom'}
          </div>

          {ansicht === '2d' ? (
            <div id="canvas" className={`canvas-wrap ${activeRoom?.boden || 'boden-standard'}`} style={{
              width: `${(activeRoom?.breite || 6) * 60}px`,
              height: `${(activeRoom?.tiefe || 5) * 60}px`,
              border: `8px solid ${activeRoom?.wandfarbe || '#FFFFFF'}`,
              borderRadius: '6px',
              position: 'relative', boxShadow: '0 4px 24px rgba(24,95,165,0.08)',
              outline: '2px solid #B5D4F4',
            }}>
              {furniture.map(item => (
                <div key={item.id} style={{
                  position: 'absolute', left: item.left, top: item.top,
                  width: item.width, height: item.height,
                }}>
                  <div style={{
                    width: '100%', height: '100%',
                    transform: `rotate(${item.rotation || 0}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease',
                  }}>
                    <div onMouseDown={(e) => handleDrag(e, item.id)} onTouchStart={(e) => handleDrag(e, item.id)} style={{
                      width: '100%', height: '100%',
                      background: item.color,
                      border: `${item.istWandElement ? '3px' : '1.5px'} solid ${item.border}`,
                      borderRadius: item.istWandElement ? '3px' : '5px',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '10px', fontWeight: '500',
                      cursor: 'grab', userSelect: 'none', color: item.border, position: 'relative',
                      transition: 'box-shadow 0.15s',
                      boxShadow: item.istWandElement ? `0 0 0 1px ${item.border}22` : 'none',
                    }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 2px ${item.border}`}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = item.istWandElement ? `0 0 0 1px ${item.border}22` : 'none'}
                    >
                      {item.name}
                      <span
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                        onClick={(e) => { e.stopPropagation(); removeFurniture(item.id) }}
                        style={{
                          position: 'absolute', top: '-8px', right: '-8px', width: '16px', height: '16px',
                          borderRadius: '50%', background: '#E24B4A', color: 'white', fontSize: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}>✕</span>
                      <span
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                        onClick={(e) => { e.stopPropagation(); rotateFurniture(item.id) }}
                        style={{
                          position: 'absolute', top: '-8px', left: '-8px', width: '16px', height: '16px',
                          borderRadius: '50%', background: '#185FA5', color: 'white', fontSize: '11px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}>↻</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0 }}>
              <RoomView3D room={activeRoom} furniture={furniture} />
            </div>
          )}
        </div>
      </div>

      {/* Panel rechts */}
      <div className="panel-rechts" style={{ width: '220px', background: 'white', borderLeft: '1px solid #E8E6E0', padding: '16px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '-2px 0 8px rgba(0,0,0,0.04)' }}>
        {/* Wand-Elemente */}
        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>FENSTER & TÜREN</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {wandElemente.map(item => (
              <div key={item.name} onClick={() => addWandElement(item)}
                style={{ padding: '10px 6px', border: '1px solid #E8E6E0', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', fontSize: '11px', color: '#444441', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = item.typ === 'fenster' ? '#185FA5' : '#BA7517'; e.currentTarget.style.background = item.typ === 'fenster' ? '#EEF4FC' : '#FFF8E6' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#FAFAF8' }}
              >
                <div style={{
                  width: '36px', height: '14px',
                  background: item.color,
                  border: `2px solid ${item.border}`,
                  borderRadius: '3px', margin: '0 auto 6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.typ === 'fenster'
                    ? <div style={{ width: '60%', height: '2px', background: item.border, opacity: 0.5 }}></div>
                    : <div style={{ width: '40%', height: '40%', border: `1px solid ${item.border}`, borderRadius: '0 50% 0 0', opacity: 0.6 }}></div>
                  }
                </div>
                <div style={{ fontWeight: '500' }}>{item.name}</div>
                <div style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: item.typ === 'fenster' ? '#E6F1FB' : '#FFF8E6', color: item.typ === 'fenster' ? '#185FA5' : '#BA7517', display: 'inline-block' }}>
                  {item.typ === 'fenster' ? 'Fenster' : 'Tür'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: '1px', background: '#E8E6E0' }}></div>
        {/* Bodenbelag */}
        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>BODENBELAG</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {bodenBelaege.map(boden => (
              <div key={boden.name} onClick={() => setBoden(boden.klasse)}
                style={{
                  padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
                  border: `${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '2px' : '1px'} solid ${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#E8E6E0'}`,
                  background: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#EEF4FC' : '#FAFAF8',
                  fontSize: '10px', color: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#444441',
                  fontWeight: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '500' : '400',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{boden.icon}</div>
                {boden.name}
              </div>
            ))}
          </div>
        </div>

        {/* Wandfarbe */}
        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>WANDFARBE</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {wandFarben.map(wand => (
              <div key={wand.name} onClick={() => setWandfarbe(wand.farbe)}
                style={{
                  padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
                  border: `${(activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '2px' : '1px'} solid ${(activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '#185FA5' : '#E8E6E0'}`,
                  background: (activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '#EEF4FC' : '#FAFAF8',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: wand.farbe, margin: '0 auto 4px',
                  border: '1px solid #E8E6E0',
                }}></div>
                <div style={{
                  fontSize: '10px',
                  color: (activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '#185FA5' : '#444441',
                  fontWeight: (activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '500' : '400',
                }}>
                  {wand.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: '1px', background: '#E8E6E0' }}></div>
        <div style={{ height: '1px', background: '#E8E6E0' }}></div>
        <input type="text" placeholder="Möbel suchen..." value={suche} onChange={e => setSuche(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', fontSize: '12px', border: '1px solid #E8E6E0', borderRadius: '10px', background: '#F7F6F2', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {kategorien.map(kat => (
            <div key={kat} onClick={() => setAktiveKategorie(kat)} style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
              fontWeight: aktiveKategorie === kat ? '500' : '400',
              background: aktiveKategorie === kat ? '#185FA5' : '#F7F6F2',
              color: aktiveKategorie === kat ? 'white' : '#888780',
              border: `1px solid ${aktiveKategorie === kat ? '#185FA5' : '#E8E6E0'}`,
              transition: 'all 0.15s',
            }}>{kat}</div>
          ))}
        </div>
        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>{gefilterteMoebel.length} MÖBEL GEFUNDEN</p>
          {gefilterteMoebel.length === 0
            ? <p style={{ fontSize: '12px', color: '#B4B2A9', textAlign: 'center', marginTop: '20px' }}>Nichts gefunden 🔍</p>
            : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {gefilterteMoebel.map(item => (
                  <div key={item.name} onClick={() => addFurniture(item)}
                    style={{ padding: '10px 6px', border: '1px solid #E8E6E0', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', fontSize: '11px', color: '#444441', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.background = '#EEF4FC' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#FAFAF8' }}
                  >
                    <div style={{ width: '28px', height: '28px', background: item.color, border: `1.5px solid ${item.border}`, borderRadius: '6px', margin: '0 auto 6px' }}></div>
                    <div style={{ fontWeight: '500' }}>{item.name}</div>
                    <div style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: kategorieFarben[item.kategorie]?.bg, color: kategorieFarben[item.kategorie]?.color, display: 'inline-block' }}>
                      {item.kategorie}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '8px', letterSpacing: '0.06em' }}>IM RAUM ({furniture.length})</p>
          {furniture.length === 0
            ? <p style={{ fontSize: '12px', color: '#B4B2A9', textAlign: 'center', marginTop: '8px' }}>Noch keine Möbel</p>
            : furniture.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#FAFAF8', borderRadius: '8px', marginBottom: '4px', border: '1px solid #E8E6E0', fontSize: '12px', color: '#444441', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F0EC'}
                onMouseLeave={e => e.currentTarget.style.background = '#FAFAF8'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', background: item.color, border: `1px solid ${item.border}`, borderRadius: '3px', flexShrink: 0 }}></div>
                  {item.name}
                </div>
                <span onClick={() => removeFurniture(item.id)} style={{ cursor: 'pointer', color: '#D3D1C7', fontSize: '11px', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = '#E24B4A'}
                  onMouseLeave={e => e.target.style.color = '#D3D1C7'}
                >✕</span>
              </div>
            ))
          }
        </div>
      </div>
      {/* Mobile Overlay */}
      <div className={`drawer-overlay ${aktiverTab ? 'open' : ''}`} onClick={() => setAktiverTab(null)} />

      {/* Mobile Drawer */}
      <div className={`drawer ${aktiverTab ? 'open' : ''}`}>
        <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: '40px', height: '4px', background: '#E8E6E0', borderRadius: '2px', margin: '0 auto 16px' }}></div>
        </div>

        {/* Räume Tab */}
        {aktiverTab === 'raeume' && (
          <div style={{ padding: '0 16px 24px' }}>
            <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '12px', letterSpacing: '0.08em' }}>MEINE RÄUME</p>
            {rooms.map(room => (
              <div key={room.id} onClick={() => { setActiveRoomId(room.id); setAktiverTab(null) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', marginBottom: '6px', background: activeRoomId === room.id ? '#EEF4FC' : '#F7F6F2', cursor: 'pointer' }}>
                <span style={{ fontSize: '14px', color: activeRoomId === room.id ? '#185FA5' : '#444441', fontWeight: activeRoomId === room.id ? '500' : '400' }}>{room.name}</span>
                {rooms.length > 1 && <span onClick={(e) => { e.stopPropagation(); deleteRoom(room.id) }} style={{ color: '#D3D1C7', fontSize: '12px' }}>✕</span>}
              </div>
            ))}
            <div onClick={() => { addRoom(); setAktiverTab(null) }}
              style={{ padding: '12px 14px', borderRadius: '10px', border: '1.5px dashed #D3D1C7', textAlign: 'center', fontSize: '13px', color: '#888780', marginTop: '8px', cursor: 'pointer' }}>
              + Raum hinzufügen
            </div>
          </div>
        )}

        {/* Möbel Tab */}
        {aktiverTab === 'moebel' && (
          <div style={{ padding: '0 16px 24px' }}>
            <input type="text" placeholder="Möbel suchen..." value={suche} onChange={e => setSuche(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '1px solid #E8E6E0', borderRadius: '10px', background: '#F7F6F2', outline: 'none', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {kategorien.map(kat => (
                <div key={kat} onClick={() => setAktiveKategorie(kat)} style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', background: aktiveKategorie === kat ? '#185FA5' : '#F7F6F2', color: aktiveKategorie === kat ? 'white' : '#888780', border: `1px solid ${aktiveKategorie === kat ? '#185FA5' : '#E8E6E0'}` }}>
                  {kat}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {gefilterteMoebel.map(item => (
                <div key={item.name} onClick={() => { addFurniture(item); setAktiverTab(null) }}
                  style={{ padding: '10px 6px', border: '1px solid #E8E6E0', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', fontSize: '11px' }}>
                  <div style={{ width: '28px', height: '28px', background: item.color, border: `1.5px solid ${item.border}`, borderRadius: '6px', margin: '0 auto 6px' }}></div>
                  <div style={{ fontWeight: '500', color: '#444441' }}>{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Einstellungen Tab */}
        {aktiverTab === 'einstellungen' && (
          <div style={{ padding: '0 16px 24px' }}>
            <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.08em' }}>RAUMGRÖSSE</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', color: '#888780' }}>Breite</span>
              <input type="number" min="1" max="20" value={activeRoom?.breite || 6}
                onChange={e => updateRoom(activeRoomId, { breite: Number(e.target.value) })}
                style={{ width: '60px', padding: '8px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}
              />
              <span style={{ fontSize: '13px', color: '#888780' }}>m × Tiefe</span>
              <input type="number" min="1" max="20" value={activeRoom?.tiefe || 5}
                onChange={e => updateRoom(activeRoomId, { tiefe: Number(e.target.value) })}
                style={{ width: '60px', padding: '8px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}
              />
              <span style={{ fontSize: '12px', background: '#EAF3DE', color: '#3B6D11', padding: '4px 8px', borderRadius: '8px' }}>{(activeRoom?.breite || 6) * (activeRoom?.tiefe || 5)} m²</span>
            </div>

            <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.08em' }}>BODENBELAG</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '20px' }}>
              {bodenBelaege.map(boden => (
                <div key={boden.name} onClick={() => setBoden(boden.klasse)}
                  style={{ padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', border: `${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '2px' : '1px'} solid ${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#E8E6E0'}`, background: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#EEF4FC' : '#FAFAF8' }}>
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{boden.icon}</div>
                  <div style={{ fontSize: '10px', color: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#444441' }}>{boden.name}</div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.08em' }}>WANDFARBE</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {wandFarben.map(wand => (
                <div key={wand.name} onClick={() => setWandfarbe(wand.farbe)}
                  style={{ padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', border: `${(activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '2px' : '1px'} solid ${(activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '#185FA5' : '#E8E6E0'}`, background: (activeRoom?.wandfarbe || '#FFFFFF') === wand.farbe ? '#EEF4FC' : '#FAFAF8' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: wand.farbe, margin: '0 auto 4px', border: '1px solid #E8E6E0' }}></div>
                  <div style={{ fontSize: '9px', color: '#444441' }}>{wand.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Tab Bar */}
      <div className="mobile-tabs">
        {[
          { id: 'raeume', icon: '🏠', label: 'Räume' },
          { id: 'moebel', icon: '🛋️', label: 'Möbel' },
          { id: 'einstellungen', icon: '⚙️', label: 'Design' },
        ].map(tab => (
          <div key={tab.id} onClick={() => setAktiverTab(aktiverTab === tab.id ? null : tab.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: aktiverTab === tab.id ? '#185FA5' : '#B4B2A9', transition: 'color 0.15s' }}>
            <div style={{ fontSize: '22px', marginBottom: '2px' }}>{tab.icon}</div>
            <div style={{ fontSize: '10px', fontWeight: aktiverTab === tab.id ? '500' : '400' }}>{tab.label}</div>
          </div>
        ))}
      </div>

    </div>
  )
}

export default App