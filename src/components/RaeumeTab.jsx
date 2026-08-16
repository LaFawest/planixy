export default function RaeumeTab({ rooms, activeRoomId, setActiveRoomId, deleteRoom, addRoom, setAktiverTab }) {
  return (
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
  )
}
