import { useFurniture } from '../context/FurnitureContext'
import { alleKatalogItems } from '../constants'
import { produktEmpfehlungen } from '../data/produktempfehlungen'
import { produktAufKatalogItemAnwenden } from '../data/produktAuswahl'
import { moebelIconTyp, moebelShapes } from '../moebelIcons'

function formatPreis(preis) {
  if (preis == null) return 'Preis auf Amazon prüfen'
  return preis.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// Eigenes, in der aufgelösten Produktfarbe eingefärbtes Icon statt Amazon-Foto — dieselbe
// Icon-Form wie im Katalog (KatalogKarte.jsx), nur mit der Farbe/Kantenfarbe dieses konkreten
// Produkts statt der generischen Katalogfarbe des Möbeltyps.
function ProduktIcon({ moebelName, farbe, kante }) {
  const typ = moebelIconTyp(moebelName)
  const shapes = moebelShapes(farbe, kante)
  return (
    <svg viewBox="0 0 28 28" width="28" height="28">
      {shapes[typ] || shapes.standard}
    </svg>
  )
}

export default function ProduktPanel() {
  const { selectedId, furniture, wechsleProdukt } = useFurniture()
  const selectedItem = furniture.find(f => f.id === selectedId)
  if (!selectedItem) return null

  const passende = produktEmpfehlungen.filter(p => p.moebelName === selectedItem.name)
  const katalogDefault = alleKatalogItems.find(k => k.name === selectedItem.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.08em', margin: 0 }}>PASSENDE PRODUKTE</p>
      <p style={{ fontSize: '13px', fontWeight: '500', color: '#2C2C2A', margin: 0 }}>{selectedItem.name}</p>

      {passende.length === 0 ? (
        <p style={{ fontSize: '12px', color: '#B4B2A9', lineHeight: 1.5 }}>
          Für diesen Möbeltyp gibt es noch keine Produktvorschläge.
        </p>
      ) : (
        passende.map(produkt => {
          const aktiv = selectedItem.produktId === produkt.id
          const { color, border } = katalogDefault
            ? produktAufKatalogItemAnwenden(katalogDefault, produkt)
            : { color: '#D3D1C7', border: '#888780' }
          return (
            <div key={produkt.id}
              onClick={() => wechsleProdukt(selectedItem.id, produkt)}
              style={{
                display: 'flex', gap: '10px', padding: '8px', borderRadius: '10px', cursor: 'pointer',
                border: aktiv ? '2px solid #185FA5' : '1px solid #E8E6E0',
                background: aktiv ? '#EEF4FC' : 'transparent',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { if (!aktiv) e.currentTarget.style.borderColor = '#185FA5' }}
              onMouseLeave={e => { if (!aktiv) e.currentTarget.style.borderColor = '#E8E6E0' }}>
              <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '6px', background: '#F7F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ProduktIcon moebelName={selectedItem.name} farbe={color} kante={border} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {produkt.marke && (
                  <div style={{ fontSize: '10px', color: '#B4B2A9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {produkt.marke}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#444441', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {produkt.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '3px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#185FA5' }}>
                    {formatPreis(produkt.preis)}
                  </div>
                  <span style={{ fontSize: '10px', color: '#B4B2A9' }}>Anzeige</span>
                </div>
              </div>
              <a href={produkt.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                style={{ fontSize: '10px', color: '#B4B2A9', alignSelf: 'flex-start', flexShrink: 0, textDecoration: 'none' }}>
                Amazon ↗
              </a>
            </div>
          )
        })
      )}
    </div>
  )
}
