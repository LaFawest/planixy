import { useNavigate } from 'react-router-dom'
import { useUI } from '../context/UIContext'
import { useRooms } from '../context/RoomsContext'
import { useFurniture } from '../context/FurnitureContext'

export default function Topbar() {
  const navigate = useNavigate()
  const { ansicht, setAnsicht } = useUI()
  const { activeRoom } = useRooms()
  const { furniture } = useFurniture()
  return (
    <div style={{ padding: '14px 28px', borderBottom: '1px solid #E8E6E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: '12px', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <button className="topbar-home-knopf" onClick={() => navigate('/')} title="Zurück zum Dashboard" style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', margin: '-8px', border: 'none', background: 'transparent',
        cursor: 'pointer', color: '#2C2C2A', flexShrink: 0,
      }}
        onMouseEnter={e => e.currentTarget.style.color = '#185FA5'}
        onMouseLeave={e => e.currentTarget.style.color = '#2C2C2A'}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '500' }}>Planixy</span>
      </button>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', minWidth: '80px' }}>{activeRoom?.name}</h3>
      <div style={{ display: 'flex', border: '1px solid #E8E6E0', borderRadius: '8px', overflow: 'hidden' }}>
        {['2d', '3d'].map(a => (
          <button key={a} onClick={() => setAnsicht(a)} style={{ padding: '6px 14px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", background: ansicht === a ? '#185FA5' : 'white', color: ansicht === a ? 'white' : '#888780', border: 'none', cursor: 'pointer', fontWeight: ansicht === a ? '500' : '400' }}>{a.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '12px', color: '#B4B2A9' }}>{furniture.length} Objekte</div>
      </div>
    </div>
  )
}
