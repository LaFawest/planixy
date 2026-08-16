import { wandFarben } from '../constants'
import { useUI } from '../context/UIContext'
import { useTrennwand } from '../context/TrennwandContext'

export default function TrennwandPanel() {
  const { ansicht } = useUI()
  const { selectedWandId, trennwaende, setSelectedWandId, setTrennwandFarbe, setTrennwandDicke, removeTrennwand } = useTrennwand()
  if (selectedWandId === null || ansicht !== '2d') return null
  const selectedWand = trennwaende.find(w => w.id === selectedWandId)
  if (!selectedWand) return null
  return (
    <div onClick={e => e.stopPropagation()} style={{
      background: 'white', borderTop: '1px solid #E8E6E0',
      padding: '10px 24px', display: 'flex', alignItems: 'center',
      gap: '12px', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: '12px', color: '#888780', fontWeight: '500' }}>Trennwand</span>
      <div style={{ display: 'flex', gap: '5px' }}>
        {wandFarben.slice(0, 12).map(f => (
          <div key={f.name} onClick={() => setTrennwandFarbe(selectedWand.id, f.farbe)} title={f.name}
            style={{
              width: '20px', height: '20px', borderRadius: '50%', cursor: 'pointer', background: f.farbe,
              border: `${selectedWand.farbe === f.farbe ? '2px' : '1px'} solid ${selectedWand.farbe === f.farbe ? '#185FA5' : '#E8E6E0'}`,
            }} />
        ))}
      </div>
      <span style={{ fontSize: '12px', color: '#B4B2A9' }}>Dicke</span>
      <input type="range" min="4" max="30" step="2"
        value={selectedWand.dicke || 10}
        onChange={e => setTrennwandDicke(selectedWand.id, Number(e.target.value))}
        style={{ width: '120px', cursor: 'pointer' }}
      />
      <span style={{ fontSize: '13px', color: '#185FA5', fontWeight: '500', minWidth: '32px' }}>{Math.round((selectedWand.dicke || 10) / 0.6)} cm</span>
      <div onClick={() => removeTrennwand(selectedWand.id)} style={{ cursor: 'pointer', color: '#E24B4A', fontSize: '12px', fontWeight: '500', padding: '4px 10px', borderRadius: '8px', border: '1px solid #F4C0C0' }}>Löschen</div>
      <span onClick={() => setSelectedWandId(null)} style={{ cursor: 'pointer', color: '#B4B2A9', fontSize: '16px', marginLeft: '8px' }}>✕</span>
    </div>
  )
}
