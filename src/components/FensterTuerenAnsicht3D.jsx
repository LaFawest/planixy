import { useState } from 'react'
import RoomView3D from '../RoomView3D'
import WandMiniKarte from './WandMiniKarte'
import { useRaumGeometrie } from '../context/useRaumGeometrie'

export default function FensterTuerenAnsicht3D() {
  const { wandSegmente } = useRaumGeometrie()
  const [aktiveWand, setAktiveWand] = useState(0)
  // Bei einem Formwechsel (z.B. weniger Wände als zuvor) kann der gespeicherte Index außerhalb
  // liegen — hier direkt beim Rendern auf 0 zurückfallen statt per Effect nachzukorrigieren
  // (vermeidet einen zusätzlichen Render-Zyklus und den entsprechenden Lint-Fehler).
  const effektiveWand = aktiveWand < wandSegmente.length ? aktiveWand : 0

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <RoomView3D fokusWand={effektiveWand} />
      {wandSegmente.length > 0 && (
        <WandMiniKarte wandSegmente={wandSegmente} aktiveWand={effektiveWand} onWechsel={setAktiveWand} />
      )}
    </div>
  )
}
