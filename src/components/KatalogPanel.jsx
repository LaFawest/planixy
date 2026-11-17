import { KatalogKarte } from './KatalogKarte'
import { useKatalog } from '../context/KatalogContext'
import { AKZENT, AKZENT_HELL } from '../farben'

// Gemeinsame Katalog-Ansicht für Desktop-Sidebar und mobilen Möbel-Tab: Suche, Kategorie-Chips
// und Ergebnisraster, plus die beiden Sonderfälle "kein Katalog in diesem Schritt" und
// "Suche trifft nur im jeweils anderen Katalog-Schritt" (siehe KatalogContext.jsx).
// produktwahlRechts: Am Desktop (Sidebar.jsx) wählt ein Klick in Schritt 4 nur die Bauart, das
// Produkt wählt man rechts (ProduktWahl.jsx). Am Handy (MoebelTab.jsx) fügt der Klick bis zum
// eigenen Blatt (Katalog-Umbau Teil 5) weiter direkt das erste Produkt ein.
export default function KatalogPanel({ spalten, onItemHinzugefuegt, produktwahlRechts = false }) {
  const {
    suche, setSuche, aktiverRaum, setAktiverRaum, gefilterteMoebel, gruppen, katalogItemHinzufuegen,
    katalogSichtbar, raumAuswahlSichtbar, raeumeFuerAuswahl, raumHinweis, sprungHinweis, schrittHinweis,
    springeZuSchritt, gewaehlteBauart, waehleBauart,
  } = useKatalog()

  const mitProduktwahl = produktwahlRechts && Boolean(gruppen)
  const karte = (item) => (
    <KatalogKarte key={item.katalogKey || item.name} item={item} ohneEtikett={Boolean(gruppen)}
      aktiv={mitProduktwahl && gewaehlteBauart === item.name}
      onClick={() => {
        if (mitProduktwahl) { waehleBauart(item.name); return }
        katalogItemHinzufuegen(item)
        onItemHinzugefuegt?.()
      }} />
  )
  const raster = (items) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${spalten}, 1fr)`, gap: '8px' }}>
      {items.map(karte)}
    </div>
  )

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

      {/* Raumfilter (Katalog-Umbau Teil 3, 17.11.2026) statt der früheren Kategorie-Chips. Als
          <button>, damit er per Tastatur bedienbar ist; aria-pressed sagt Bildschirmlesern, welcher
          Raum gewählt ist. */}
      {raumAuswahlSichtbar && (
        <div role="group" aria-label="Raum" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {raeumeFuerAuswahl.map(raum => {
            const aktiv = aktiverRaum === raum.key
            return (
              <button key={raum.key} type="button" onClick={() => setAktiverRaum(raum.key)} aria-pressed={aktiv} style={{
                padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontWeight: aktiv ? '500' : '400',
                background: aktiv ? AKZENT : '#F7F6F2',
                color: aktiv ? 'white' : '#888780',
                border: `1px solid ${aktiv ? AKZENT : '#E8E6E0'}`,
              }}>{raum.name}</button>
            )
          })}
        </div>
      )}

      {raumHinweis ? (
        <button type="button" onClick={() => setAktiverRaum('alle')}
          style={{ width: '100%', textAlign: 'left', padding: '12px', borderRadius: '10px', border: '1px solid #E8E6E0', background: '#F7F6F2', fontSize: '12px', color: '#444441', cursor: 'pointer', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = AKZENT; e.currentTarget.style.background = AKZENT_HELL }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#F7F6F2' }}>
          In diesem Raum nichts gefunden. In „Alle Räume“ gibt es {raumHinweis.anzahl} Treffer →
        </button>
      ) : sprungHinweis ? (
        <div onClick={() => springeZuSchritt(sprungHinweis.schritt)}
          style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E8E6E0', background: '#F7F6F2', fontSize: '12px', color: '#444441', cursor: 'pointer', lineHeight: 1.5 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = AKZENT; e.currentTarget.style.background = AKZENT_HELL }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#F7F6F2' }}>
          Das findest du in Schritt {sprungHinweis.schritt} „{sprungHinweis.label}" ({sprungHinweis.beschreibung}) →
        </div>
      ) : (
        <>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '10px', letterSpacing: '0.06em' }}>{gefilterteMoebel.length} MÖBEL GEFUNDEN</p>
          {gefilterteMoebel.length === 0
            ? <p style={{ fontSize: '12px', color: '#B4B2A9', textAlign: 'center', marginTop: '20px' }}>Nichts gefunden 🔍</p>
            : gruppen
              ? gruppen.map(familie => (
                  <section key={familie.key} style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: '500', color: '#444441', margin: '0 0 8px' }}>{familie.name}</h3>
                    {familie.untergruppen
                      ? familie.untergruppen.map(u => (
                          <div key={u.key} style={{ marginBottom: '10px' }}>
                            <h4 style={{ fontSize: '10px', fontWeight: '400', color: '#B4B2A9', letterSpacing: '0.06em', margin: '0 0 6px' }}>{u.name.toUpperCase()}</h4>
                            {raster(u.items)}
                          </div>
                        ))
                      : raster(familie.items)}
                  </section>
                ))
              : raster(gefilterteMoebel)
          }
        </>
      )}
    </div>
  )
}
