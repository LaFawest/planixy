import { useState } from 'react'
import { useProjekteListe } from '../context/ProjekteListeContext'

const formatiereRelativeZeit = (datumIso) => {
  const diffMs = Date.now() - new Date(datumIso).getTime()
  const minuten = Math.floor(diffMs / 60000)
  if (minuten < 1) return 'gerade eben'
  if (minuten < 60) return `vor ${minuten} Minute${minuten === 1 ? '' : 'n'}`
  const stunden = Math.floor(minuten / 60)
  if (stunden < 24) return `vor ${stunden} Stunde${stunden === 1 ? '' : 'n'}`
  const tage = Math.floor(stunden / 24)
  if (tage < 30) return `vor ${tage} Tag${tage === 1 ? '' : 'en'}`
  const monate = Math.floor(tage / 30)
  if (monate < 12) return `vor ${monate} Monat${monate === 1 ? '' : 'en'}`
  const jahre = Math.floor(monate / 12)
  return `vor ${jahre} Jahr${jahre === 1 ? '' : 'en'}`
}

function NeuesProjektDialog({ onErstellen, onAbbrechen }) {
  const [name, setName] = useState('')
  const bestaetigen = () => { if (name.trim()) onErstellen(name.trim()) }

  return (
    <div onClick={onAbbrechen} style={{
      position: 'fixed', inset: 0, background: 'rgba(44,44,42,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: '16px', padding: '24px', width: '320px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', marginBottom: '16px' }}>
          Neues Projekt
        </p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') bestaetigen(); if (e.key === 'Escape') onAbbrechen() }}
          placeholder="Projektname"
          style={{
            width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #E8E6E0', borderRadius: '10px',
            outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', boxSizing: 'border-box', marginBottom: '16px',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onAbbrechen} style={{
            padding: '8px 16px', borderRadius: '10px', border: '1px solid #E8E6E0', background: 'white',
            color: '#888780', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>
            Abbrechen
          </button>
          <button onClick={bestaetigen} disabled={!name.trim()} style={{
            padding: '8px 16px', borderRadius: '10px', border: 'none',
            background: name.trim() ? '#185FA5' : '#D3D1C7', color: 'white', fontSize: '13px', fontWeight: '500',
            cursor: name.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans', sans-serif",
          }}>
            Erstellen
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjektKachel({ projekt, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'white', border: '1px solid #E8E6E0', borderRadius: '14px', padding: '20px',
      cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(24,95,165,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div style={{
        width: '100%', aspectRatio: '4 / 3', background: '#F7F6F2', borderRadius: '10px', marginBottom: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '28px', opacity: 0.35 }}>🏠</span>
      </div>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '500', color: '#2C2C2A', marginBottom: '4px' }}>
        {projekt.name}
      </p>
      <p style={{ fontSize: '12px', color: '#888780', marginBottom: '2px' }}>
        {projekt.raeume.length} {projekt.raeume.length === 1 ? 'Raum' : 'Räume'}
      </p>
      <p style={{ fontSize: '11px', color: '#B4B2A9' }}>
        Geändert {formatiereRelativeZeit(projekt.geaendertAm)}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const { projekte, addProjekt, waehleProjekt } = useProjekteListe()
  const [dialogOffen, setDialogOffen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', padding: '40px 48px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '500', color: '#2C2C2A' }}>Planixy</h1>
          <p style={{ fontSize: '13px', color: '#B4B2A9', marginTop: '2px' }}>Deine Projekte</p>
        </div>
        <button onClick={() => setDialogOffen(true)} style={{
          padding: '10px 20px', background: '#185FA5', color: 'white', border: 'none', borderRadius: '10px',
          cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif",
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#0C447C'}
          onMouseLeave={e => e.currentTarget.style.background = '#185FA5'}
        >
          + Neues Projekt
        </button>
      </div>

      {projekte.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 20px', textAlign: 'center',
        }}>
          <span style={{ fontSize: '40px', marginBottom: '16px' }}>🏡</span>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '500', color: '#2C2C2A', marginBottom: '8px' }}>
            Noch kein Projekt angelegt
          </p>
          <p style={{ fontSize: '13px', color: '#888780', marginBottom: '24px', maxWidth: '360px' }}>
            Leg dein erstes Projekt an, um mit der Raumplanung zu beginnen.
          </p>
          <button onClick={() => setDialogOffen(true)} style={{
            padding: '10px 20px', background: '#185FA5', color: 'white', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif",
          }}>
            + Neues Projekt
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {projekte.map(projekt => (
            <ProjektKachel key={projekt.id} projekt={projekt} onClick={() => waehleProjekt(projekt.id)} />
          ))}
        </div>
      )}

      {dialogOffen && (
        <NeuesProjektDialog
          onErstellen={(name) => { addProjekt(name); setDialogOffen(false) }}
          onAbbrechen={() => setDialogOffen(false)}
        />
      )}
    </div>
  )
}
