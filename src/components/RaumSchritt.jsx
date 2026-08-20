import { useRooms } from '../context/RoomsContext'
import { useDesign } from '../context/DesignContext'
import { polygonFlaeche } from '../raumPolygon'

export default function RaumSchritt() {
  const { activeRoom, activeRoomId, updateRoom } = useRooms()
  const { raumHoehe, setRaumHoehe } = useDesign()
  return (
    <>
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
          <span style={{ marginLeft: 'auto', background: '#EAF3DE', color: '#3B6D11', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '500' }}>{Math.round(polygonFlaeche(activeRoom.eckpunkte) * 10) / 10} m²</span>
        </div>
      </div>
    </>
  )
}
