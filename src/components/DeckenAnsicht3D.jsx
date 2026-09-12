import RoomView3D from '../RoomView3D'
import { useFurniture } from '../context/FurnitureContext'

// Decken-Ansicht (Phase 6): senkrechter Blick von unten auf die Decke, für die Platzierung/Auswahl
// von Deckenleuchten. Analog zu FensterTuerenAnsicht3D.jsx, aber ohne Wand-Auswahl/Mini-Karte — es
// gibt nur eine Decke, keine mehreren Ansichten zum Durchschalten. onDeckenleuchteBewegt (Teilschritt
// 2) committed das Ziehen von Spot/Spot-Reihe, analog zu onWandElementBewegt in
// FensterTuerenAnsicht3D.jsx.
export default function DeckenAnsicht3D() {
  const { setSelectedId, positioniereDeckenleuchte } = useFurniture()

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <RoomView3D deckenFokus onDeckenleuchteAusgewaehlt={setSelectedId} onDeckenleuchteBewegt={positioniereDeckenleuchte} />
    </div>
  )
}
