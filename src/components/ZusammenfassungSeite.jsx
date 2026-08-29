import { useNavigate, useParams } from 'react-router-dom'
import { useRooms } from '../context/RoomsContext'
import { produktEmpfehlungen } from '../data/produktempfehlungen'
import PlanixyLogo from './PlanixyLogo'

function formatPreis(preis) {
  return preis.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// Gruppiert die Möbel eines Raums nach (Name + gefundenem Produkt), damit z.B. 4 gleiche
// Essstühle als eine Zeile mit "× 4" erscheinen statt vier identischer Zeilen. Wandelemente
// (Türen/Fenster) sind nicht Teil der Einkaufsliste und werden ausgeschlossen.
function gruppiere(furniture) {
  const gruppen = new Map()
  for (const item of furniture) {
    if (item.istWandElement) continue
    const produkt = produktEmpfehlungen.find(p => p.moebelName === item.name)
    const key = item.name + '::' + (produkt?.id ?? 'kein-vorschlag')
    if (!gruppen.has(key)) {
      gruppen.set(key, { name: item.name, produkt, anzahl: 0 })
    }
    gruppen.get(key).anzahl += 1
  }
  return [...gruppen.values()]
}

export default function ZusammenfassungSeite() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { rooms } = useRooms()

  const raeume = rooms.map(room => {
    const gruppen = gruppiere(room.furniture || [])
    const raumSumme = gruppen.reduce((summe, g) => summe + (g.produkt ? g.produkt.preis * g.anzahl : 0), 0)
    return { room, gruppen, raumSumme }
  })
  const gesamtpreis = raeume.reduce((summe, r) => summe + r.raumSumme, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#FBF6EC', padding: '32px 24px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <button onClick={() => navigate(`/projekt/${id}`)} style={{
          background: 'transparent', border: 'none', color: '#888780', fontSize: '13px',
          cursor: 'pointer', marginBottom: '20px', padding: 0, fontFamily: "'DM Sans', sans-serif",
        }}>
          ← Zurück zum Editor
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <PlanixyLogo size={26} />
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: '500', color: '#2C2C2A', margin: 0 }}>
            Zusammenfassung
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: '#888780', marginBottom: '28px' }}>
          Alle platzierten Möbel über deine Räume, mit passenden Produktvorschlägen.
        </p>

        {raeume.map(({ room, gruppen }) => (
          <div key={room.id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #E8E6E0', padding: '20px', marginBottom: '18px' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', fontWeight: '500', color: '#2C2C2A', margin: '0 0 14px' }}>
              {room.name}
            </h2>

            {gruppen.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#B4B2A9' }}>Noch keine Möbel platziert.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {gruppen.map(g => (
                  <div key={g.name + (g.produkt?.id ?? '')} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {g.produkt ? (
                      <img src={g.produkt.bild} alt={g.produkt.name}
                        onError={e => { e.currentTarget.style.display = 'none' }}
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, background: '#F7F6F2' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#F7F6F2', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: '#2C2C2A' }}>
                        {g.name} {g.anzahl > 1 && <span style={{ color: '#B4B2A9' }}>× {g.anzahl}</span>}
                      </div>
                      {g.produkt ? (
                        <a href={g.produkt.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#185FA5', textDecoration: 'none' }}>
                          {g.produkt.name} →
                        </a>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#B4B2A9' }}>Noch kein Produktvorschlag</div>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#2C2C2A', flexShrink: 0 }}>
                      {g.produkt ? formatPreis(g.produkt.preis * g.anzahl) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div style={{ background: '#2F4B39', borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#C9E0D2', letterSpacing: '0.06em' }}>GESCHÄTZTE GESAMTSUMME</div>
            <div style={{ fontSize: '11px', color: '#C9E0D2', marginTop: '2px' }}>Nur für Möbel mit Produktvorschlag · Amazon-Preise können sich ändern</div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: 'white', fontFamily: "'Playfair Display', serif" }}>
            {formatPreis(gesamtpreis)}
          </div>
        </div>
      </div>
    </div>
  )
}
