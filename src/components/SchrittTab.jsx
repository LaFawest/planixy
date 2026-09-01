import { WIZARD_SCHRITTE } from '../constants'
import { useWizard } from '../context/WizardContext'
import RaumSchritt from './RaumSchritt'
import FarbenBodenSchritt from './FarbenBodenSchritt'
import FensterTuerenSchritt from './FensterTuerenSchritt'
import LichtSchritt from './LichtSchritt'
import MoebelDekoSchritt from './MoebelDekoSchritt'

const SCHRITT_KOMPONENTEN = {
  1: RaumSchritt,
  2: FarbenBodenSchritt,
  3: FensterTuerenSchritt,
  4: LichtSchritt,
  5: MoebelDekoSchritt,
}

const ERSTER_SCHRITT = WIZARD_SCHRITTE[0].nummer
const LETZTER_SCHRITT = WIZARD_SCHRITTE[WIZARD_SCHRITTE.length - 1].nummer

const navButtonStyle = (deaktiviert) => ({
  flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E8E6E0', background: 'white',
  color: deaktiviert ? '#D3D1C7' : '#444441', fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
  cursor: deaktiviert ? 'default' : 'pointer',
})

export default function SchrittTab() {
  const { schritt } = useWizard()
  const SchrittInhalt = SCHRITT_KOMPONENTEN[schritt]

  return (
    <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <SchrittInhalt />
    </div>
  )
}

// Eigene Komponente statt Teil von SchrittTab: muss im Drawer AUSSERHALB des scrollbaren
// Bereichs sitzen (siehe MobileNav.jsx), damit "Zurück"/"Weiter" bei vielen Einträgen im
// mittleren Bereich (z.B. Bodenbelag-Grid) nicht mit aus dem sichtbaren Bereich scrollen.
export function SchrittTabFooter() {
  const { schritt, vorherigerSchritt, naechsterSchritt } = useWizard()

  return (
    <div className="drawer-footer">
      <button onClick={vorherigerSchritt} disabled={schritt === ERSTER_SCHRITT} style={navButtonStyle(schritt === ERSTER_SCHRITT)}>
        ← Zurück
      </button>
      <button onClick={naechsterSchritt} disabled={schritt === LETZTER_SCHRITT} style={navButtonStyle(schritt === LETZTER_SCHRITT)}>
        Weiter →
      </button>
    </div>
  )
}
