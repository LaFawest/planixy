import { useUI } from '../context/UIContext'
import { useRooms } from '../context/RoomsContext'
import { useWizard } from '../context/WizardContext'
import { useFurniture } from '../context/FurnitureContext'
import RaumSchritt from './RaumSchritt'
import FensterTuerenSchritt from './FensterTuerenSchritt'
import LichtSchritt from './LichtSchritt'
import MoebelDekoSchritt from './MoebelDekoSchritt'
import ProduktPanel from './ProduktPanel'

const SCHRITT_KOMPONENTEN = {
  1: RaumSchritt,
  2: FensterTuerenSchritt,
  3: LichtSchritt,
  4: MoebelDekoSchritt,
}

export default function PanelRechts() {
  const { raumPanelOffen, setRaumPanelOffen } = useUI()
  const { activeRoom } = useRooms()
  const { schritt } = useWizard()
  const { selectedId } = useFurniture()
  const SchrittInhalt = SCHRITT_KOMPONENTEN[schritt]

  // Licht-Schritt (Phase 6, Teilschritt 1 — 7. Nachbesserung, ersetzt die 6.): die Leuchten-Liste
  // aus LichtSchritt (Überschrift "LEUCHTEN (n)" + eine Zeile je eingefügter Leuchte) hing in der
  // 6. Nachbesserung noch von `raumPanelOffen` ab — dieser Zustand wird aber u.a. umgeschaltet,
  // sobald man in der linken Raumliste auf den bereits aktiven Raum klickt (waehleRaum in
  // RoomsContext.jsx), und schloss die gerade erst sichtbar gemachte Liste dadurch sofort wieder.
  // Im Licht-Schritt hängt die Liste jetzt gar nicht mehr von `raumPanelOffen` ab — sie ist hier
  // immer da, unabhängig von diesem (für die anderen Schritte gedachten) Auf/Zu-Zustand. Die
  // "RAUMEINSTELLUNGEN"-Kopfzeile mit dem ✕-Schließen-Knopf passt inhaltlich ohnehin nicht zur
  // Leuchten-Liste und entfällt hier deshalb — die Liste beginnt jetzt direkt am oberen Rand.
  const zeigtLichtListeImmer = schritt === 3 && activeRoom

  return (
    <div className="panel-rechts" style={{ width: '220px', background: 'white', borderLeft: '1px solid #E8E6E0', padding: '16px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '-2px 0 8px rgba(0,0,0,0.04)' }}>
      {zeigtLichtListeImmer ? (
        <>
          <LichtSchritt />
          {selectedId !== null && (
            <>
              <div style={{ height: '1px', background: '#E8E6E0' }}></div>
              <ProduktPanel />
            </>
          )}
        </>
      ) : selectedId !== null ? (
        <ProduktPanel />
      ) : raumPanelOffen && activeRoom ? (
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
