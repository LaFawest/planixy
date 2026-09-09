import { HIMMELSRICHTUNG_NAME } from '../constants'
import { himmelsrichtungAusNormale } from '../raumPolygon'

export default function WandMiniKarte({ wandSegmente, aktiveWand, onWechsel }) {
  if (!wandSegmente.length) return null
  const punkte = wandSegmente.map(s => s.start)
  const xs = punkte.map(p => p.x), ys = punkte.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const breite = Math.max(1, maxX - minX)
  const tiefe = Math.max(1, maxY - minY)
  const VB = 100
  const PAD = 10
  const skala = Math.min((VB - PAD * 2) / breite, (VB - PAD * 2) / tiefe)
  const zu = (p) => ({
    x: PAD + (p.x - minX) * skala + (VB - PAD * 2 - breite * skala) / 2,
    y: PAD + (p.y - minY) * skala + (VB - PAD * 2 - tiefe * skala) / 2,
  })
  const pfad = punkte.map(zu).map(p => `${p.x},${p.y}`).join(' ')
  const segment = wandSegmente[aktiveWand] || wandSegmente[0]
  const a = zu(segment.start), b = zu(segment.ende)
  const mitte = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const normWinkel = Math.atan2(segment.normale.y, segment.normale.x) * 180 / Math.PI
  const weiter = (delta) => onWechsel((aktiveWand + delta + wandSegmente.length) % wandSegmente.length)
  return (
    <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, width: '190px', background: 'white', border: '1px solid #E8E6E0', borderRadius: '12px', padding: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
      <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.06em', margin: '0 0 8px 0' }}>
        WAND {aktiveWand + 1} · {HIMMELSRICHTUNG_NAME[himmelsrichtungAusNormale(segment.normale)].toUpperCase()}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => weiter(-1)} style={pfeilButtonStil} aria-label="Vorherige Wand">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444441" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <svg viewBox={`0 0 ${VB} ${VB}`} width="70" height="70" style={{ flex: 1, background: '#FAFAF8', border: '1.5px solid #D3D1C7', borderRadius: '4px' }}>
          <polygon points={pfad} fill="none" stroke="#D3D1C7" strokeWidth="1.5" />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#185FA5" strokeWidth="3.5" strokeLinecap="round" />
          <polygon
            points="0,-4 4,4 -4,4"
            fill="#185FA5"
            transform={`translate(${mitte.x + segment.normale.x * 8}, ${mitte.y + segment.normale.y * 8}) rotate(${normWinkel + 270})`}
          />
        </svg>
        <button onClick={() => weiter(1)} style={pfeilButtonStil} aria-label="Nächste Wand">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444441" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  )
}

const pfeilButtonStil = {
  width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #E8E6E0', background: 'white',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', padding: 0,
}
