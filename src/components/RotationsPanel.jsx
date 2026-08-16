export default function RotationsPanel({ ansicht, selectedId, furniture, setSelectedId, rotateFurniture }) {
  if (selectedId === null || ansicht !== '2d') return null
  const selectedItem = furniture.find(f => f.id === selectedId)
  if (!selectedItem) return null
  return (
    <div onClick={e => e.stopPropagation()} style={{
      background: 'white', borderTop: '1px solid #E8E6E0',
      padding: '10px 24px', display: 'flex', alignItems: 'center',
      gap: '12px', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: '12px', color: '#888780', fontWeight: '500' }}>{selectedItem.name}</span>
      <span style={{ fontSize: '12px', color: '#B4B2A9' }}>↻</span>
      <input type="range" min="0" max="359"
        value={selectedItem.rotation || 0}
        onChange={e => rotateFurniture(selectedItem.id, Number(e.target.value))}
        style={{ width: '160px', cursor: 'pointer' }}
      />
      <span style={{ fontSize: '13px', color: '#185FA5', fontWeight: '500', minWidth: '40px' }}>{selectedItem.rotation || 0}°</span>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 90, 180, 270].map(w => (
          <div key={w} onClick={() => rotateFurniture(selectedItem.id, w)} style={{
            padding: '4px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
            background: (selectedItem.rotation || 0) === w ? '#185FA5' : '#F7F6F2',
            color: (selectedItem.rotation || 0) === w ? 'white' : '#888780',
            border: '1px solid #E8E6E0',
          }}>{w}°</div>
        ))}
      </div>
      <span onClick={() => setSelectedId(null)} style={{ cursor: 'pointer', color: '#B4B2A9', fontSize: '16px', marginLeft: '8px' }}>✕</span>
    </div>
  )
}
