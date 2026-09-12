import RoomView3D from '../RoomView3D'
import { useFurniture } from '../context/FurnitureContext'

// Decken-Ansicht (Phase 6, Teilschritt 1): senkrechter Blick von unten auf die Decke, für die
// Platzierung/Auswahl von Deckenleuchten. Analog zu FensterTuerenAnsicht3D.jsx, aber ohne
// Wand-Auswahl/Mini-Karte — es gibt nur eine Decke, keine mehreren Ansichten zum Durchschalten.
export default function DeckenAnsicht3D() {
  const { setSelectedId } = useFurniture()

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <RoomView3D deckenFokus onDeckenleuchteAusgewaehlt={setSelectedId} />
    </div>
  )
}
