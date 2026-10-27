import { kategorieFarben } from '../constants'
import { moebelIconTyp, moebelShapes, wandElementIconTyp, wandElementShapes } from '../moebelIcons'

function MoebelIcon({ item }) {
  const typ = moebelIconTyp(item.name)
  const shapes = moebelShapes(item.color, item.border)
  return (
    <svg viewBox="0 0 28 28" width="28" height="28">
      {shapes[typ] || shapes.standard}
    </svg>
  )
}

export function KatalogKarte({ item, onClick }) {
  if (item.typ) {
    return (
      <div onClick={onClick}
        style={{ padding: '10px 6px', border: '1px solid #E8E6E0', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', fontSize: '11px', color: '#444441', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = item.typ === 'fenster' ? '#185FA5' : '#BA7517'; e.currentTarget.style.background = item.typ === 'fenster' ? '#EEF4FC' : '#FFF8E6' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#FAFAF8' }}>
        {/* 28 x 28 wie bei allen anderen Kategorien. Der bisherige 36 x 14 flache Streifen war
            der Grund, warum alle siebzehn Einträge gleich aussahen: Darin ist kein Platz für
            mehr als einen Balken. */}
        <svg viewBox="0 0 28 28" width="28" height="28" style={{ display: 'block', margin: '0 auto 6px' }}>
          {wandElementShapes(item.color, item.border)[wandElementIconTyp(item)]}
        </svg>
        <div style={{ fontWeight: '500' }}>{item.name}</div>
        {/* Ein Durchgang ist keine Tür — er hat kein Blatt. Vorher stand unter beiden "Tür",
            weil die Beschriftung nur fenster von allem anderen unterschied. */}
        <div style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: item.typ === 'fenster' ? '#E6F1FB' : '#FFF8E6', color: item.typ === 'fenster' ? '#185FA5' : '#BA7517', display: 'inline-block' }}>
          {item.typ === 'fenster' ? 'Fenster' : item.typ === 'durchgang' ? 'Durchgang' : 'Tür'}
        </div>
      </div>
    )
  }

  // Kein Produktfoto, keine Marke, kein Preis. Im Katalog wählt man eine Bauart, kein Produkt —
  // ein Foto genau einer Lampe sieht aus, als würde man genau diese setzen. Die Produktdaten
  // bleiben vollständig erhalten; die Zusammenfassung zeigt sie weiterhin, dort gehören sie hin.
  return (
    <div onClick={onClick}
      style={{ padding: '10px 6px', border: '1px solid #E8E6E0', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', fontSize: '11px', color: '#444441', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.background = '#EEF4FC' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#FAFAF8' }}>
      <div style={{ width: '44px', height: '44px', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MoebelIcon item={item} />
      </div>
      <div style={{ fontWeight: '500' }}>{item.name}</div>
      <div style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: kategorieFarben[item.kategorie]?.bg, color: kategorieFarben[item.kategorie]?.color, display: 'inline-block' }}>{item.kategorie}</div>
    </div>
  )
}
