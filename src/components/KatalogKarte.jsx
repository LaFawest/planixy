import { kategorieFarben } from '../constants'
import { moebelIconTyp, moebelShapes } from '../moebelIcons'

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
        <div style={{ width: '36px', height: '14px', background: item.color, border: `2px solid ${item.border}`, borderRadius: '3px', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {item.typ === 'fenster' ? <div style={{ width: '60%', height: '2px', background: item.border, opacity: 0.5 }}></div> : <div style={{ width: '40%', height: '40%', border: `1px solid ${item.border}`, borderRadius: '0 50% 0 0', opacity: 0.6 }}></div>}
        </div>
        <div style={{ fontWeight: '500' }}>{item.name}</div>
        <div style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: item.typ === 'fenster' ? '#E6F1FB' : '#FFF8E6', color: item.typ === 'fenster' ? '#185FA5' : '#BA7517', display: 'inline-block' }}>
          {item.typ === 'fenster' ? 'Fenster' : 'Tür'}
        </div>
      </div>
    )
  }
  return (
    <div onClick={onClick}
      style={{ padding: '10px 6px', border: '1px solid #E8E6E0', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', fontSize: '11px', color: '#444441', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.background = '#EEF4FC' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#FAFAF8' }}>
      <div style={{ width: '28px', height: '28px', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MoebelIcon item={item} />
      </div>
      <div style={{ fontWeight: '500' }}>{item.name}</div>
      <div style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: kategorieFarben[item.kategorie]?.bg, color: kategorieFarben[item.kategorie]?.color, display: 'inline-block' }}>{item.kategorie}</div>
    </div>
  )
}
