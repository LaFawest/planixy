import { useFurniture } from '../context/FurnitureContext'
import { produktEmpfehlungen } from '../data/produktempfehlungen'

function formatPreis(preis) {
  return preis.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function ProduktPanel() {
  const { selectedId, furniture } = useFurniture()
  const selectedItem = furniture.find(f => f.id === selectedId)
  if (!selectedItem) return null

  const passende = produktEmpfehlungen.filter(p => p.moebelName === selectedItem.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.08em', margin: 0 }}>PASSENDE PRODUKTE</p>
      <p style={{ fontSize: '13px', fontWeight: '500', color: '#2C2C2A', margin: 0 }}>{selectedItem.name}</p>

      {passende.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#B4B2A9', lineHeight: 1.5 }}>
          Für diesen Möbeltyp gibt es noch keine Produktvorschläge.
        </p>
      ) : (
        passende.map(produkt => (
          <a key={produkt.id} href={produkt.link} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', gap: '10px', padding: '8px', border: '1px solid #E8E6E0', borderRadius: '10px', textDecoration: 'none', color: 'inherit', transition: 'border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0' }}>
            <img src={produkt.bild} alt={produkt.name}
              onError={e => { e.currentTarget.style.display = 'none' }}
              style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, background: '#F7F6F2' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: '#444441', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {produkt.name}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#185FA5', marginTop: '3px' }}>
                {formatPreis(produkt.preis)}
              </div>
            </div>
          </a>
        ))
      )}
    </div>
  )
}
