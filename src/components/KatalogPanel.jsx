import { KatalogKarte } from './KatalogKarte'
import { useKatalog } from '../context/KatalogContext'

// Gemeinsame Katalog-Ansicht für Desktop-Sidebar und mobilen Möbel-Tab: Suche, Kategorie-Chips
// und Ergebnisraster, plus die beiden Sonderfälle "kein Katalog in diesem Schritt" und
// "Suche trifft nur im jeweils anderen Katalog-Schritt" (siehe KatalogContext.jsx).
export default function KatalogPanel({ spalten, onItemHinzugefuegt }) {
  const {
    suche, setSuche, aktiveKategorie, setAktiveKategorie, gefilterteMoebel, katalogItemHinzufuegen,
    katalogSichtbar, kategorieAuswahlSichtbar, kategorienFuerAuswahl, sprungHinweis, schrittHinweis,
    springeZuSchritt,
  } = useKatalog()

  if (!katalogSichtbar) {
    return (
      <div style={{ padding: '14px', background: '#F7F6F2', borderRadius: '10px', fontSize: '12px', color: '#888780', lineHeight: 1.5 }}>
        {schrittHinweis}
      </div>
    )
  }

  return (
    <div>
      <input type="text" placeholder="Möbel suchen..." value={suche} onChange={e => setSuche(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '1px solid #E8E6E0', borderRadius: '10px', background: '#F7F6F2', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', marginBottom: '12px' }} />

      {kategorieAuswahlSichtbar && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {kategorienFuerAuswahl.map(kat => (
            <div key={kat} onClick={() => setAktiveKategorie(kat)} style={{
              padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
              fontWeight: aktiveKategorie === kat ? '500' : '400',
              background: aktiveKategorie === kat ? '#185FA5' : '#F7F6F2',
              color: aktiveKategorie === kat ? 'white' : '#888780',
              border: `1px solid ${aktiveKategorie === kat ? '#185FA5' : '#E8E6E0'}`,
            }}>{kat}</div>
          ))}
        </div>
      )}

      {sprungHinweis ? (
        <div onClick={() => springeZuSchritt(sprungHinweis.schritt)}
          style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E8E6E0', background: '#F7F6F2', fontSize: '12px', color: '#444441', cursor: 'pointer', lineHeight: 1.5 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.background = '#EEF4FC' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#F7F6F2' }}>
          Das findest du in Schritt {sprungHinweis.schritt} „{sprungHinweis.label}" →
        </div>
      ) : (
        <>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>{gefilterteMoebel.length} MÖBEL GEFUNDEN</p>
          {gefilterteMoebel.length === 0
            ? <p style={{ fontSize: '12px', color: '#B4B2A9', textAlign: 'center', marginTop: '20px' }}>Nichts gefunden 🔍</p>
            : <div style={{ display: 'grid', gridTemplateColumns: `repeat(${spalten}, 1fr)`, gap: '8px' }}>
                {gefilterteMoebel.map(item => (
                  <KatalogKarte key={item.katalogKey || item.name} item={item} onClick={() => { katalogItemHinzufuegen(item); onItemHinzugefuegt?.() }} />
                ))}
              </div>
          }
        </>
      )}
    </div>
  )
}
