import { useFurniture } from '../context/FurnitureContext'
import { useDesign } from '../context/DesignContext'
import { FARBTEMPERATUREN } from '../constants'

const tageszeitLabel = (stunde) => {
  const h = Math.floor(stunde)
  const m = Math.round((stunde - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} Uhr`
}
// Grobe Einteilung fürs Icon — deckt sich nicht exakt mit dem stufenlosen Sonnenstand in
// scene/beleuchtung.js, dient hier nur der schnellen visuellen Orientierung auf dem Regler.
const tageszeitIcon = (stunde) => {
  if (stunde >= 7 && stunde <= 19) return '☀️'
  if ((stunde > 19 && stunde <= 21) || (stunde >= 5 && stunde < 7)) return '🌇'
  return '🌙'
}

export default function LichtSchritt() {
  const { furniture, removeFurniture, updateFurniture } = useFurniture()
  const { tageszeit, setTageszeit } = useDesign()
  const leuchten = furniture.filter(f => f.kategorie === 'Licht')

  const setLichtAn = (id, an) => updateFurniture(furniture.map(f => f.id === id ? { ...f, lichtAn: an } : f))
  const setFarbtemperatur = (id, farbe) => updateFurniture(furniture.map(f => f.id === id ? { ...f, farbtemperatur: farbe } : f))

  return (
    <>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.06em' }}>TAGESZEIT</p>
          <span style={{ fontSize: '12px', color: '#444441' }}>{tageszeitIcon(tageszeit)} {tageszeitLabel(tageszeit)}</span>
        </div>
        <input type="range" min="0" max="24" step="0.5"
          value={tageszeit}
          onChange={e => setTageszeit(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer' }}
        />
      </div>

      <div style={{ height: '1px', background: '#E8E6E0' }}></div>

      <div>
        <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '8px', letterSpacing: '0.06em' }}>LEUCHTEN ({leuchten.length})</p>
        {leuchten.length === 0
          ? <p style={{ fontSize: '12px', color: '#B4B2A9', textAlign: 'center', marginTop: '8px' }}>Noch keine Leuchten — links im Katalog auswählen</p>
          : leuchten.map(item => {
            const an = item.lichtAn !== false
            const farbe = item.farbtemperatur || '#fff0c8'
            return (
              <div key={item.id} style={{ padding: '8px 10px', background: '#FAFAF8', borderRadius: '8px', marginBottom: '6px', border: '1px solid #E8E6E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: an ? '8px' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', background: item.color, border: `1px solid ${item.border}`, borderRadius: '3px', flexShrink: 0 }}></div>
                    <span style={{ fontSize: '12px', color: '#444441' }}>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div onClick={() => setLichtAn(item.id, !an)} style={{
                      width: '32px', height: '18px', borderRadius: '9px', cursor: 'pointer', position: 'relative',
                      background: an ? '#185FA5' : '#E8E6E0', transition: 'background 0.2s', flexShrink: 0,
                    }}>
                      <div style={{
                        position: 'absolute', top: '2px', left: an ? '16px' : '2px',
                        width: '14px', height: '14px', borderRadius: '50%', background: 'white',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}></div>
                    </div>
                    <span onClick={() => removeFurniture(item.id)} style={{ cursor: 'pointer', color: '#D3D1C7', fontSize: '11px' }}
                      onMouseEnter={e => e.target.style.color = '#E24B4A'}
                      onMouseLeave={e => e.target.style.color = '#D3D1C7'}>✕</span>
                  </div>
                </div>
                {an && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {FARBTEMPERATUREN.map(ft => (
                      <div key={ft.name} onClick={() => setFarbtemperatur(item.id, ft.farbe)} title={ft.name} style={{
                        width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer',
                        background: ft.farbe, border: `${farbe === ft.farbe ? '2px' : '1px'} solid ${farbe === ft.farbe ? '#185FA5' : '#E8E6E0'}`,
                      }}></div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        }
      </div>
    </>
  )
}
