export default function Topbar({ activeRoom, ansicht, setAnsicht, furniture }) {
  return (
    <div style={{ padding: '14px 28px', borderBottom: '1px solid #E8E6E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '12px', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', minWidth: '80px' }}>{activeRoom?.name}</h3>
      <div style={{ display: 'flex', border: '1px solid #E8E6E0', borderRadius: '8px', overflow: 'hidden' }}>
        {['2d', '3d'].map(a => (
          <button key={a} onClick={() => setAnsicht(a)} style={{ padding: '6px 14px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", background: ansicht === a ? '#185FA5' : 'white', color: ansicht === a ? 'white' : '#888780', border: 'none', cursor: 'pointer', fontWeight: ansicht === a ? '500' : '400' }}>{a.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '12px', color: '#B4B2A9' }}>{furniture.length} Objekte</div>
        <button style={{ padding: '8px 18px', background: '#185FA5', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", fontWeight: '500' }}
          onMouseEnter={e => e.currentTarget.style.background = '#0C447C'}
          onMouseLeave={e => e.currentTarget.style.background = '#185FA5'}>KI-Vorschlag</button>
      </div>
    </div>
  )
}
