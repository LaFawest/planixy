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
  const { furniture, removeFurniture, updateFurniture, rotateFurniture, selectedId, setSelectedId } = useFurniture()
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
            const ausgewaehlt = selectedId === item.id
            // Zeile anklickbar (Phase 6, Teilschritt 1): wählt dieselbe geteilte Auswahl wie ein
            // Klick auf eine Deckenleuchte in der neuen 3D-Decken-Ansicht (RoomView3D.jsx) —
            // funktioniert deshalb in beide Richtungen, auch für die übrigen (frei platzierbaren)
            // Licht-Typen, die es dort (noch) nicht gibt.
            return (
              <div key={item.id} onClick={() => setSelectedId(item.id)} style={{
                padding: '4px 0 4px 10px', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer',
                background: ausgewaehlt ? '#EEF4FC' : '#FAFAF8',
                border: `1px solid ${ausgewaehlt ? '#185FA5' : '#E8E6E0'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{ width: '10px', height: '10px', background: item.color, border: `1px solid ${item.border}`, borderRadius: '3px', flexShrink: 0 }}></div>
                    <span title={item.name} style={{ fontSize: '12px', color: '#444441', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  </div>
                  {/* 44×44px Antippflächen wie bei der mobilen Schrittleiste — der sichtbare Regler bleibt
                      klein, nur die klickbare/tippbare Fläche drumherum wächst. Für den Entfernen-Knopf nur
                      unterhalb der 680px-Bruchstelle (.licht-entfernen-knopf in index.css): am Desktop reicht
                      dort die kleine, mausgerechte Fläche wie bei den anderen ✕-Icons im Rest der App — sonst
                      schneidet die schmale Sidebar lange Leuchtennamen ab. */}
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={() => setLichtAn(item.id, !an)} aria-label={`${item.name} ${an ? 'ausschalten' : 'einschalten'}`} style={{
                      width: '44px', height: '44px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    }}>
                      <span style={{
                        width: '32px', height: '18px', borderRadius: '9px', position: 'relative', display: 'block',
                        background: an ? '#185FA5' : '#E8E6E0', transition: 'background 0.2s',
                      }}>
                        <span style={{
                          position: 'absolute', top: '2px', left: an ? '16px' : '2px',
                          width: '14px', height: '14px', borderRadius: '50%', background: 'white',
                          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}></span>
                      </span>
                    </button>
                    <button onClick={() => removeFurniture(item.id)} aria-label={`${item.name} entfernen`} className="licht-entfernen-knopf" style={{
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#D3D1C7', fontSize: '13px',
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = '#E24B4A'}
                      onMouseLeave={e => e.currentTarget.style.color = '#D3D1C7'}>✕</button>
                  </div>
                </div>
                {an && (
                  (item.name === 'LED-Streifen' || item.name === 'LED-Panel') ? (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 10px 8px' }}>
                      <span style={{ fontSize: '10px', color: '#B4B2A9' }}>Farbe</span>
                      <input type="color" value={farbe}
                        onChange={e => setFarbtemperatur(item.id, e.target.value)}
                        style={{ width: '32px', height: '32px', padding: 0, border: '1px solid #E8E6E0', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex' }}>
                      {FARBTEMPERATUREN.map(ft => (
                        <button key={ft.name} onClick={() => setFarbtemperatur(item.id, ft.farbe)} aria-label={ft.name} title={ft.name} style={{
                          width: '44px', height: '44px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                        }}>
                          <span style={{
                            width: '20px', height: '20px', borderRadius: '50%', display: 'block',
                            background: ft.farbe, border: `${farbe === ft.farbe ? '2px' : '1px'} solid ${farbe === ft.farbe ? '#185FA5' : '#E8E6E0'}`,
                          }}></span>
                        </button>
                      ))}
                    </div>
                  )
                )}
                {/* Spot-Reihe (Phase 6, Teilschritt 2): Anzahl (1-6) per Dropdown, Ausrichtung per
                    Rotations-Regler — beides nur für diesen einen Leuchtentyp relevant. */}
                {item.name === 'Spot-Reihe' && (
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 10px 8px' }}>
                    <span style={{ fontSize: '10px', color: '#B4B2A9', flexShrink: 0 }}>Anzahl</span>
                    <select
                      value={Math.min(6, Math.max(1, item.spotAnzahl || 3))}
                      onChange={e => updateFurniture(furniture.map(f => f.id === item.id ? { ...f, spotAnzahl: Number(e.target.value) } : f))}
                      style={{ fontSize: '11px', border: '1px solid #E8E6E0', borderRadius: '6px', padding: '2px 4px', color: '#444441', background: 'white', flexShrink: 0 }}>
                      {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span style={{ fontSize: '10px', color: '#B4B2A9', flexShrink: 0, marginLeft: '4px' }}>Ausrichtung</span>
                    <input type="range" min="0" max="359"
                      value={item.rotation || 0}
                      onChange={e => rotateFurniture(item.id, Number(e.target.value))}
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '11px', color: '#185FA5', minWidth: '30px', textAlign: 'right', flexShrink: 0 }}>{item.rotation || 0}°</span>
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
