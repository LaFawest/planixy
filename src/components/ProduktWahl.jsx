import { alleKatalogItems } from '../constants'
import { useFurniture } from '../context/FurnitureContext'
import { useKatalog } from '../context/KatalogContext'
import { produkteFuerTyp, produktAufKatalogItemAnwenden } from '../data/produktAuswahl'
import { produktFuerKatalog } from '../data/bauarten'
import ProduktKarte from './ProduktKarte'
import { AKZENT } from '../farben'

// Produktwahl beim Einfügen (Katalog-Umbau Teil 4, 17.11.2026): Links wählt man eine Bauart, hier
// rechts das Produkt — erst der Klick auf ein Produkt fügt ein. Die Wahl bleibt danach offen, damit
// man z. B. vier Essstühle nacheinander einfügen kann; „Im Raum: n“ zeigt, wie viele schon stehen.
// Sie schließt über ✕, mit der Auswahl eines platzierten Möbels oder beim Schrittwechsel.
// Bauarten ohne Produkt lassen sich trotzdem einfügen, dann mit den Katalogmaßen.
export default function ProduktWahl() {
  const { gewaehlteBauart, schliesseProduktwahl, fuegeProduktEin } = useKatalog()
  const { furniture } = useFurniture()
  if (!gewaehlteBauart) return null

  const katalogDefault = alleKatalogItems.find(k => k.name === gewaehlteBauart)
  const produkte = produkteFuerTyp(gewaehlteBauart)
  const imRaum = furniture.filter(f => f.name === gewaehlteBauart).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.08em', margin: 0 }}>PRODUKT WÄHLEN</p>
        <button type="button" onClick={schliesseProduktwahl} aria-label="Produktwahl schließen"
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#B4B2A9', fontSize: '14px', lineHeight: 1 }}>✕</button>
      </div>
      <div>
        <p style={{ fontSize: '13px', fontWeight: '500', color: '#2C2C2A', margin: 0 }}>{gewaehlteBauart}</p>
        <p style={{ fontSize: '11px', color: '#888780', margin: '2px 0 0' }}>
          Klick auf ein Produkt fügt es ein.{imRaum > 0 && <span style={{ color: AKZENT }}> Im Raum: {imRaum}</span>}
        </p>
      </div>

      {produkte.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '12px', color: '#B4B2A9', lineHeight: 1.5, margin: 0 }}>Für diese Bauart gibt es noch kein Produkt.</p>
          <button type="button" onClick={() => fuegeProduktEin(null)}
            style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${AKZENT}`, background: 'white', color: AKZENT, fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Ohne Produkt einfügen
          </button>
        </div>
      ) : (
        produkte.map(produkt => {
          const { color, border } = katalogDefault
            ? produktAufKatalogItemAnwenden(katalogDefault, produkt)
            : { color: '#D3D1C7', border: '#888780' }
          return (
            <ProduktKarte key={produkt.id} produkt={produktFuerKatalog(produkt)} bauart={gewaehlteBauart}
              farbe={color} kante={border} onWaehlen={() => fuegeProduktEin(produkt)} />
          )
        })
      )}
    </div>
  )
}
