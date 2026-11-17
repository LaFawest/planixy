import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { WIZARD_SCHRITTE } from '../constants'
import { useWizard } from '../context/WizardContext'
import { useUI } from '../context/UIContext'

const ERSTER_SCHRITT = WIZARD_SCHRITTE[0].nummer
const LETZTER_SCHRITT = WIZARD_SCHRITTE[WIZARD_SCHRITTE.length - 1].nummer

const navButtonStyle = (deaktiviert) => ({
  padding: '6px 12px', borderRadius: '8px', border: '1px solid #E8E6E0', background: 'white',
  color: deaktiviert ? '#D3D1C7' : '#444441', fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
  cursor: deaktiviert ? 'default' : 'pointer', flexShrink: 0,
})

export default function SchrittLeiste() {
  const { schritt, setSchritt, vorherigerSchritt, naechsterSchritt } = useWizard()
  const { setAktiverTab } = useUI()
  const navigate = useNavigate()
  const { id } = useParams()

  const aktuellerSchritt = WIZARD_SCHRITTE.find(s => s.nummer === schritt)

  // Hinweiskästchen beim Überfahren einer Pille: Name und Beschreibung des Schritts. Es ist fest
  // zum Fenster positioniert und wird AUSSERHALB der Desktop-Leiste gerendert (siehe unten), aus
  // zwei Gründen: Die Leiste hat overflowX auto, alles, was nach unten herausragt, würde also
  // abgeschnitten. Und sie ist ein Größen-Container (container-type in index.css) — ein solcher
  // wird zum Bezugsrahmen für fest positionierte Nachfahren, ein Kästchen darin säße falsch.
  const [hinweis, setHinweis] = useState(null) // { nummer, x, y } oder null
  const hinweisZeigen = (e, s) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHinweis({ nummer: s.nummer, x: r.left + r.width / 2, y: r.bottom + 8 })
  }
  const hinweisVerbergen = () => setHinweis(null)
  const hinweisSchritt = hinweis ? WIZARD_SCHRITTE.find(s => s.nummer === hinweis.nummer) : null

  // Auf mobil öffnet ein Antippen direkt die Schritt-Ansicht im Drawer, statt nur den Schritt zu setzen.
  const schrittWaehlenMobil = (nummer) => {
    setSchritt(nummer)
    setAktiverTab('schritt')
  }

  return (
    <>
      {/* Desktop: volle Leiste mit Labels + Zurück/Weiter */}
      <div className="schritt-leiste-desktop" style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px clamp(16px, 2.2vw, 28px)',
        borderBottom: '1px solid #E8E6E0', background: 'white', flexShrink: 0, overflowX: 'auto',
      }}>
        <button onClick={vorherigerSchritt} disabled={schritt === ERSTER_SCHRITT} style={navButtonStyle(schritt === ERSTER_SCHRITT)} aria-label="Zurück">
          ←<span className="schritt-knopf-text"> Zurück</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          {WIZARD_SCHRITTE.map((s, i) => (
            <div key={s.nummer} style={{ display: 'flex', alignItems: 'center' }}>
              <div onClick={() => { setSchritt(s.nummer); hinweisVerbergen() }}
                onMouseEnter={e => hinweisZeigen(e, s)} onMouseLeave={hinweisVerbergen}
                // Per Tastatur bedienbar (bis zum 17.11.2026 nicht erreichbar): Tab führt hin, Enter
                // und Leertaste lösen aus wie ein Klick, und das Hinweiskästchen erscheint auch bei
                // Fokus. Derselbe zugängliche Name wie in der mobilen Leiste.
                role="button" tabIndex={0}
                aria-label={`Zu Schritt ${s.nummer}: ${s.label} – ${s.beschreibung}`}
                aria-current={schritt === s.nummer ? 'step' : undefined}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSchritt(s.nummer); hinweisVerbergen() }
                }}
                onFocus={e => hinweisZeigen(e, s)} onBlur={hinweisVerbergen}
                className={`schritt-pille${schritt === s.nummer ? ' schritt-pille-aktiv' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '999px',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '500', flexShrink: 0,
                  background: schritt === s.nummer ? '#2F4B39' : (s.bald ? '#F0F0EC' : '#E8E6E0'),
                  color: schritt === s.nummer ? 'white' : '#888780',
                }}>{s.nummer}</span>
                <span className="schritt-pille-name" style={{
                  fontSize: '13px', fontWeight: schritt === s.nummer ? '500' : '400',
                  color: schritt === s.nummer ? '#1F3327' : (s.bald ? '#B4B2A9' : '#444441'),
                }}>{s.label}</span>
                {s.bald && (
                  <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: '#F0F0EC', color: '#B4B2A9', fontWeight: '500' }}>bald</span>
                )}
              </div>
              {i < WIZARD_SCHRITTE.length - 1 && <div className="schritt-strich" style={{ height: '1px', background: '#E8E6E0', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {schritt === LETZTER_SCHRITT ? (
          <button onClick={() => navigate(`/projekt/${id}/zusammenfassung`)} style={{
            padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#2F4B39',
            color: 'white', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', flexShrink: 0,
          }} aria-label="Zusammenfassung">
            <span className="schritt-knopf-text">Zusammenfassung </span>→
          </button>
        ) : (
          <button onClick={naechsterSchritt} disabled={schritt === LETZTER_SCHRITT} style={navButtonStyle(schritt === LETZTER_SCHRITT)} aria-label="Weiter">
            <span className="schritt-knopf-text">Weiter </span>→
          </button>
        )}
      </div>

      {/* Mobil: fest sichtbare Schritt-Beschriftung + kompakte Punkte-Leiste mit 44×44px Antippflächen */}
      <div className="schritt-leiste-mobil" style={{
        padding: '10px 16px', borderBottom: '1px solid #E8E6E0', background: 'white', flexShrink: 0,
      }}>
        <p style={{ fontSize: '12px', color: '#444441', textAlign: 'center', marginBottom: '2px', fontWeight: '500' }}>
          Schritt {schritt} von {WIZARD_SCHRITTE.length} · {aktuellerSchritt?.label}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {WIZARD_SCHRITTE.map((s, i) => (
            <div key={s.nummer} style={{ display: 'flex', alignItems: 'center', flex: i < WIZARD_SCHRITTE.length - 1 ? '1 1 auto' : '0 0 auto' }}>
              <button
                onClick={() => schrittWaehlenMobil(s.nummer)}
                aria-label={`Zu Schritt ${s.nummer}: ${s.label} – ${s.beschreibung}`}
                style={{
                  width: '44px', height: '44px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                }}
              >
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%', display: 'block', boxSizing: 'border-box',
                  background: schritt === s.nummer ? '#2F4B39' : (s.bald ? '#F0F0EC' : '#E8E6E0'),
                  border: s.bald && schritt !== s.nummer ? '1px solid #D3D1C7' : 'none',
                }} />
              </button>
              {i < WIZARD_SCHRITTE.length - 1 && <div style={{ flex: 1, height: '2px', background: '#E8E6E0', minWidth: '4px' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Hinweiskästchen der Desktop-Leiste. Steht bewusst hier außen und nicht in der Leiste. */}
      {hinweisSchritt && (
        <div className="schritt-hinweis" role="tooltip" style={{ left: hinweis.x, top: hinweis.y }}>
          <span className="schritt-hinweis-name">{hinweisSchritt.label}</span>
          <span className="schritt-hinweis-text">{hinweisSchritt.beschreibung}</span>
        </div>
      )}
    </>
  )
}
