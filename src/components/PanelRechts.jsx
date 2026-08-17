import { useUI } from '../context/UIContext'
import { useRooms } from '../context/RoomsContext'
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

export default function PanelRechts() {
  const { raumPanelOffen, setRaumPanelOffen } = useUI()
  const { activeRoom } = useRooms()
  const { schritt } = useWizard()
  const SchrittInhalt = SCHRITT_KOMPONENTEN[schritt]

  return (
    <div className="panel-rechts" style={{ width: '220px', background: 'white', borderLeft: '1px solid #E8E6E0', padding: '16px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '-2px 0 8px rgba(0,0,0,0.04)' }}>
      {raumPanelOffen && activeRoom ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '10px', color: '#B4B2A9', letterSpacing: '0.08em', margin: 0 }}>RAUMEINSTELLUNGEN</p>
            <span onClick={() => setRaumPanelOffen(false)} style={{ cursor: 'pointer', color: '#B4B2A9', fontSize: '14px' }}>✕</span>
          </div>
          <SchrittInhalt />
        </>
      ) : (
        <p style={{ fontSize: '12px', color: '#B4B2A9', lineHeight: 1.5 }}>Klicke links auf einen Raum, um Name, Größe, Fußleiste, Bodenbelag und Wandfarbe einzustellen.</p>
      )}
    </div>
  )
}
