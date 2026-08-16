import { bodenBelaege, wandSeiten, wandFarben } from '../constants'
import { useRooms } from '../context/RoomsContext'
import { useDesign } from '../context/DesignContext'

export default function EinstellungenTab() {
  const { activeRoom, activeRoomId, updateRoom } = useRooms()
  const { setBoden, aktiveWand, setAktiveWand, aktuelleWandfarbe, setWandfarbeFuer } = useDesign()
  return (
    <div style={{ padding: '0 16px 24px' }}>
      <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.08em' }}>RAUMGRÖSSE</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <span style={{ fontSize: '13px', color: '#888780' }}>Breite</span>
        <input type="number" min="1" max="20" value={activeRoom?.breite || 6} onChange={e => updateRoom(activeRoomId, { breite: Number(e.target.value) })}
          style={{ width: '60px', padding: '8px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }} />
        <span style={{ fontSize: '13px', color: '#888780' }}>m × Tiefe</span>
        <input type="number" min="1" max="20" value={activeRoom?.tiefe || 5} onChange={e => updateRoom(activeRoomId, { tiefe: Number(e.target.value) })}
          style={{ width: '60px', padding: '8px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '13px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }} />
        <span style={{ fontSize: '12px', background: '#EAF3DE', color: '#3B6D11', padding: '4px 8px', borderRadius: '8px' }}>{(activeRoom?.breite || 6) * (activeRoom?.tiefe || 5)} m²</span>
      </div>
      <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.08em' }}>BODENBELAG</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '20px' }}>
        {bodenBelaege.map(boden => (
          <div key={boden.name} onClick={() => setBoden(boden.klasse)}
            style={{ padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', border: `${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '2px' : '1px'} solid ${(activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#E8E6E0'}`, background: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#EEF4FC' : '#FAFAF8' }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{boden.icon}</div>
            <div style={{ fontSize: '10px', color: (activeRoom?.boden || 'boden-standard') === boden.klasse ? '#185FA5' : '#444441' }}>{boden.name}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.08em' }}>WANDFARBE</p>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {wandFarben.map(wand => (
          <div key={wand.name} onClick={() => setWandfarbeFuer(wand.farbe)}
            style={{ padding: '8px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', border: `${aktuelleWandfarbe === wand.farbe ? '2px' : '1px'} solid ${aktuelleWandfarbe === wand.farbe ? '#185FA5' : '#E8E6E0'}`, background: aktuelleWandfarbe === wand.farbe ? '#EEF4FC' : '#FAFAF8' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: wand.farbe, margin: '0 auto 4px', border: '1px solid #E8E6E0' }}></div>
            <div style={{ fontSize: '9px', color: '#444441' }}>{wand.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
