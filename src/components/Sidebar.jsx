import KatalogPanel from './KatalogPanel'
import { useUI } from '../context/UIContext'
import { useRooms } from '../context/RoomsContext'

export default function Sidebar() {
  const { raumPanelOffen } = useUI()
  const { rooms, activeRoomId, waehleRaum, deleteRoom, addRoom } = useRooms()
  return (
    <div className="sidebar" style={{ width: '260px', background: 'white', borderRight: '1px solid #E8E6E0', padding: '24px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '0 8px', marginBottom: '28px' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '500', color: '#2C2C2A' }}>Planixy</h2>
        <p style={{ fontSize: '11px', color: '#B4B2A9', marginTop: '2px' }}>Intelligente Raumplanung</p>
      </div>
      <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '8px', letterSpacing: '0.08em', padding: '0 8px' }}>MEINE RÄUME</p>
      <div>
        {rooms.map(room => (
          <div key={room.id} className="room-item" onClick={() => waehleRaum(room.id)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', marginBottom: '3px', background: activeRoomId === room.id ? '#EEF4FC' : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => { if (activeRoomId !== room.id) e.currentTarget.style.background = '#F7F6F2' }}
            onMouseLeave={e => { if (activeRoomId !== room.id) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ fontSize: '13px', color: activeRoomId === room.id ? '#185FA5' : '#444441', fontWeight: activeRoomId === room.id ? '500' : '400', flex: 1 }}>
              {room.name}
            </span>
            <span style={{ fontSize: '11px', color: activeRoomId === room.id && raumPanelOffen ? '#185FA5' : '#D3D1C7', marginRight: rooms.length > 1 ? '4px' : 0 }}>⚙</span>
            {rooms.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); deleteRoom(room.id) }}
                style={{ fontSize: '11px', color: '#D3D1C7', cursor: 'pointer', marginLeft: '4px' }}
                onMouseEnter={e => e.target.style.color = '#E24B4A'}
                onMouseLeave={e => e.target.style.color = '#D3D1C7'}>✕</span>
            )}
          </div>
        ))}
      </div>
      <div onClick={addRoom}
        style={{ marginTop: '12px', padding: '9px 12px', borderRadius: '10px', border: '1.5px dashed #D3D1C7', cursor: 'pointer', fontSize: '12px', color: '#888780', textAlign: 'center', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.color = '#185FA5' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#D3D1C7'; e.currentTarget.style.color = '#888780' }}>
        + Raum hinzufügen
      </div>

      <div style={{ height: '1px', background: '#E8E6E0', margin: '18px 0' }}></div>

      <KatalogPanel spalten={2} />
    </div>
  )
}
