import { useFurniture } from '../context/FurnitureContext'
import { alleKatalogItems } from '../constants'
import { produktEmpfehlungen } from '../data/produktempfehlungen'
import { produktAufKatalogItemAnwenden } from '../data/produktAuswahl'
import { produktFuerKatalog } from '../data/bauarten'
import ProduktKarte from './ProduktKarte'

// Produktwechsel für ein platziertes Möbel. Die Karten teilen sich seit dem 17.11.2026 Aufbau und
// Fotoplatz mit der Produktwahl beim Einfügen (ProduktKarte.jsx).
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
            <ProduktKarte key={produkt.id} produkt={produktFuerKatalog(produkt)} bauart={selectedItem.name}
              farbe={color} kante={border} aktiv={aktiv}
              onWaehlen={() => wechsleProdukt(selectedItem.id, produkt)} />
          )
        })
      )}
    </div>
  )
}
