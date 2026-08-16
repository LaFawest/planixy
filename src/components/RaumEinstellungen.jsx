import { bodenBelaege, wandSeiten, wandFarben } from '../constants'
import { useUI } from '../context/UIContext'
import { useRooms } from '../context/RoomsContext'
import { useDesign } from '../context/DesignContext'

export default function RaumEinstellungen() {
  const { setRaumPanelOffen } = useUI()
  const { activeRoom, activeRoomId, updateRoom } = useRooms()
  const {
    raumHoehe, setRaumHoehe, fussleiste, setFussleiste, fussleisteFarbe, setFussleisteFarbe, setBoden,
    aktiveWand, setAktiveWand, aktuelleWandfarbe, setWandfarbeFuer,
  } = useDesign()
  return (
    <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.08em', margin: 0 }}>RAUMEINSTELLUNGEN</p>
          <span onClick={() => setRaumPanelOffen(false)} style={{ cursor: 'pointer', color: '#B4B2A9', fontSize: '14px' }}>✕</span>
        </div>

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
            <span style={{ marginLeft: 'auto', background: '#EAF3DE', color: '#3B6D11', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '500' }}>{(activeRoom.breite || 6) * (activeRoom.tiefe || 5)} m²</span>
          </div>
        </div>

        <div style={{ height: '1px', background: '#E8E6E0' }}></div>

        {/* Fußleiste */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.06em' }}>FUSSLEISTE</p>
            <div onClick={() => setFussleiste(!fussleiste)} style={{
              width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s',
              background: fussleiste ? '#185FA5' : '#E8E6E0', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: '2px', left: fussleiste ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}></div>
            </div>
          </div>
          {fussleiste && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { name: 'Weiß',    farbe: '#FFFFFF' },
                { name: 'Creme',   farbe: '#E0DDD8' },
                { name: 'Grau',    farbe: '#B4B2A9' },
                { name: 'Schwarz', farbe: '#2C2C2A' },
                { name: 'Holz',    farbe: '#C8A97A' },
                { name: 'Wand',    farbe: activeRoom?.wandfarbe || '#FFFFFF' },
              ].map(f => (
                <div key={f.name} onClick={() => setFussleisteFarbe(f.farbe)} style={{
                  width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                  background: f.farbe, border: `${fussleisteFarbe === f.farbe ? '3px' : '1px'} solid ${fussleisteFarbe === f.farbe ? '#185FA5' : '#E8E6E0'}`,
                  title: f.name,
                }} title={f.name}></div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: '1px', background: '#E8E6E0' }}></div>

        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>BODENBELAG</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {bodenBelaege.map(boden => (
              <div key={boden.name} onClick={() => setBoden(boden.klasse)} style={{
                padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                border: `${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '2px' : '1px'} solid ${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#E8E6E0'}`,
                background: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#EEF4FC' : '#FAFAF8',
                fontSize: '10px', color: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#444441',
              }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{boden.icon}</div>
                {boden.name}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>WANDFARBE</p>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {[{ seite: 'alle', name: 'Alle' }, ...wandSeiten].map(w => (
              <div key={w.seite} onClick={() => setAktiveWand(w.seite)} style={{
                padding: '4px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                background: aktiveWand === w.seite ? '#185FA5' : '#F7F6F2',
                color: aktiveWand === w.seite ? 'white' : '#888780',
                border: `1px solid ${aktiveWand === w.seite ? '#185FA5' : '#E8E6E0'}`,
              }}>{w.name}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {wandFarben.map(wand => (
              <div key={wand.name} onClick={() => setWandfarbeFuer(wand.farbe)} style={{
                padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                border: `${aktuelleWandfarbe === wand.farbe ? '2px' : '1px'} solid ${aktuelleWandfarbe === wand.farbe ? '#185FA5' : '#E8E6E0'}`,
                background: aktuelleWandfarbe === wand.farbe ? '#EEF4FC' : '#FAFAF8',
              }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: wand.farbe, margin: '0 auto 4px', border: '1px solid #E8E6E0' }}></div>
                <div style={{ fontSize: '10px', color: aktuelleWandfarbe === wand.farbe ? '#185FA5' : '#444441', fontWeight: aktuelleWandfarbe === wand.farbe ? '500' : '400' }}>{wand.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: '1px', background: '#E8E6E0' }}></div>
    </>
  )
}
