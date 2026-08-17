import { WIZARD_SCHRITTE } from '../constants'
import { useWizard } from '../context/WizardContext'

const ERSTER_SCHRITT = WIZARD_SCHRITTE[0].nummer
const LETZTER_SCHRITT = WIZARD_SCHRITTE[WIZARD_SCHRITTE.length - 1].nummer

const navButtonStyle = (deaktiviert) => ({
  padding: '6px 12px', borderRadius: '8px', border: '1px solid #E8E6E0', background: 'white',
  color: deaktiviert ? '#D3D1C7' : '#444441', fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
  cursor: deaktiviert ? 'default' : 'pointer', flexShrink: 0,
})

export default function SchrittLeiste() {
  const { schritt, setSchritt, vorherigerSchritt, naechsterSchritt } = useWizard()

  return (
    <div style={{
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
  )
}
