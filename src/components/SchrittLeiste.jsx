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

  const aktuellerSchritt = WIZARD_SCHRITTE.find(s => s.nummer === schritt)

  // Auf mobil öffnet ein Antippen direkt die Schritt-Ansicht im Drawer, statt nur den Schritt zu setzen.
  const schrittWaehlenMobil = (nummer) => {
    setSchritt(nummer)
    setAktiverTab('schritt')
  }

  return (
    <>
      {/* Desktop: volle Leiste mit Labels + Zurück/Weiter */}
      <div className="schritt-leiste-desktop" style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 28px',
        borderBottom: '1px solid #E8E6E0', background: 'white', flexShrink: 0, overflowX: 'auto',
      }}>
        <button onClick={vorherigerSchritt} disabled={schritt === ERSTER_SCHRITT} style={navButtonStyle(schritt === ERSTER_SCHRITT)}>
          ← Zurück
        </button>

        <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          {WIZARD_SCHRITTE.map((s, i) => (
            <div key={s.nummer} style={{ display: 'flex', alignItems: 'center' }}>
              <div onClick={() => setSchritt(s.nummer)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '20px',
                cursor: 'pointer', background: schritt === s.nummer ? '#EEF4FC' : 'transparent', whiteSpace: 'nowrap',
              }}>
                <span style={{
                  width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '500', flexShrink: 0,
                  background: schritt === s.nummer ? '#185FA5' : (s.bald ? '#F0F0EC' : '#E8E6E0'),
                  color: schritt === s.nummer ? 'white' : '#888780',
                }}>{s.nummer}</span>
                <span style={{
                  fontSize: '13px', fontWeight: schritt === s.nummer ? '500' : '400',
                  color: schritt === s.nummer ? '#185FA5' : (s.bald ? '#B4B2A9' : '#444441'),
                }}>{s.label}</span>
                {s.bald && (
                  <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: '#F0F0EC', color: '#B4B2A9', fontWeight: '500' }}>bald</span>
                )}
              </div>
              {i < WIZARD_SCHRITTE.length - 1 && <div style={{ width: '14px', height: '1px', background: '#E8E6E0', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        <button onClick={naechsterSchritt} disabled={schritt === LETZTER_SCHRITT} style={navButtonStyle(schritt === LETZTER_SCHRITT)}>
          Weiter →
        </button>
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
                aria-label={`Zu Schritt ${s.nummer}: ${s.label}`}
                style={{
                  width: '44px', height: '44px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                }}
              >
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%', display: 'block', boxSizing: 'border-box',
                  background: schritt === s.nummer ? '#185FA5' : (s.bald ? '#F0F0EC' : '#E8E6E0'),
                  border: s.bald && schritt !== s.nummer ? '1px solid #D3D1C7' : 'none',
                }} />
              </button>
              {i < WIZARD_SCHRITTE.length - 1 && <div style={{ flex: 1, height: '2px', background: '#E8E6E0', minWidth: '4px' }} />}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
