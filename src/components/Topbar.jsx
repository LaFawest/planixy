import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUI } from '../context/UIContext'
import { useRooms } from '../context/RoomsContext'
import { useFurniture } from '../context/FurnitureContext'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'

export default function Topbar() {
  const navigate = useNavigate()
  const { ansicht, setAnsicht } = useUI()
  const { activeRoom } = useRooms()
  const { furniture } = useFurniture()
  const { user, signOut } = useAuth()
  const [authModalOffen, setAuthModalOffen] = useState(false)
  const kuerzel = user?.email?.slice(0, 2).toUpperCase()
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
        {user ? (
          <div className="topbar-auth-knopf" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="topbar-auth-email" title={user.email} style={{ fontSize: '12px', color: '#444441' }}>{user.email}</span>
            <span className="topbar-auth-kuerzel" title={user.email} style={{
              width: '26px', height: '26px', borderRadius: '50%', background: '#EEF4FC', color: '#185FA5',
              fontSize: '11px', fontWeight: '600', alignItems: 'center', justifyContent: 'center',
            }}>{kuerzel}</span>
            <button onClick={() => signOut()} style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #E8E6E0', background: 'white',
              color: '#888780', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              Abmelden
            </button>
          </div>
        ) : (
          <button className="topbar-auth-knopf" onClick={() => setAuthModalOffen(true)} style={{
            padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#185FA5',
            color: 'white', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>
            Anmelden
          </button>
        )}
      </div>

      {authModalOffen && <AuthModal onSchliessen={() => setAuthModalOffen(false)} />}
    </div>
  )
}
