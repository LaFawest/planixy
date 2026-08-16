import { kategorien } from '../constants'
import { KatalogKarte } from './KatalogKarte'
import { useUI } from '../context/UIContext'
import { useKatalog } from '../context/KatalogContext'

export default function MoebelTab() {
  const { setAktiverTab } = useUI()
  const { suche, setSuche, aktiveKategorie, setAktiveKategorie, gefilterteMoebel, katalogItemHinzufuegen } = useKatalog()
  return (
    <div style={{ padding: '0 16px 24px' }}>
      <input type="text" placeholder="Möbel suchen..." value={suche} onChange={e => setSuche(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '1px solid #E8E6E0', borderRadius: '10px', background: '#F7F6F2', outline: 'none', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }} />
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {kategorien.map(kat => (
          <div key={kat} onClick={() => setAktiveKategorie(kat)} style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', background: aktiveKategorie === kat ? '#185FA5' : '#F7F6F2', color: aktiveKategorie === kat ? 'white' : '#888780', border: `1px solid ${aktiveKategorie === kat ? '#185FA5' : '#E8E6E0'}` }}>{kat}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {gefilterteMoebel.map(item => (
          <KatalogKarte key={item.name} item={item} onClick={() => { katalogItemHinzufuegen(item); setAktiverTab(null) }} />
        ))}
      </div>
    </div>
  )
}
