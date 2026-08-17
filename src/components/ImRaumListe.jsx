export default function ImRaumListe({ titel, items, removeFurniture, leerText }) {
  return (
    <div>
      <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '8px', letterSpacing: '0.06em' }}>{titel} ({items.length})</p>
      {items.length === 0
        ? <p style={{ fontSize: '12px', color: '#B4B2A9', textAlign: 'center', marginTop: '8px' }}>{leerText}</p>
        : items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#FAFAF8', borderRadius: '8px', marginBottom: '4px', border: '1px solid #E8E6E0', fontSize: '12px', color: '#444441', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F0F0EC'}
            onMouseLeave={e => e.currentTarget.style.background = '#FAFAF8'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', background: item.color, border: `1px solid ${item.border}`, borderRadius: '3px', flexShrink: 0 }}></div>
              {item.name}
            </div>
            <span onClick={() => removeFurniture(item.id)} style={{ cursor: 'pointer', color: '#D3D1C7', fontSize: '11px' }}
              onMouseEnter={e => e.target.style.color = '#E24B4A'}
              onMouseLeave={e => e.target.style.color = '#D3D1C7'}>✕</span>
          </div>
        ))
      }
    </div>
  )
}
