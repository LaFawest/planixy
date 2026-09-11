import { useEffect, useState } from 'react'
import RoomView3D from '../RoomView3D'
import WandMiniKarte from './WandMiniKarte'
import { useRaumGeometrie } from '../context/useRaumGeometrie'
import { useFurniture } from '../context/FurnitureContext'
import { useUI } from '../context/UIContext'

export default function FensterTuerenAnsicht3D() {
  const { wandSegmente } = useRaumGeometrie()
  const { positioniereWandElement } = useFurniture()
  const { setFokusWandIndex } = useUI()
  const [aktiveWand, setAktiveWand] = useState(0)
  // Bei einem Formwechsel (z.B. weniger Wände als zuvor) kann der gespeicherte Index außerhalb
  // liegen — hier direkt beim Rendern auf 0 zurückfallen statt per Effect nachzukorrigieren
  // (vermeidet einen zusätzlichen Render-Zyklus und den entsprechenden Lint-Fehler).
  const effektiveWand = aktiveWand < wandSegmente.length ? aktiveWand : 0

  // Meldet die gerade betrachtete Wand nach UIContext, damit FurnitureContext.addWandElement
  // weiß, wo ein neu aus dem Katalog hinzugefügtes Fenster/Tür/Durchgang landen soll (siehe
  // dortiger Kommentar).
  useEffect(() => {
    setFokusWandIndex(effektiveWand)
  }, [effektiveWand, setFokusWandIndex])

  // Beim Verlassen dieser Ansicht (Unmount, z.B. Wechsel zu einem anderen Wizard-Schritt) wieder
  // auf null zurücksetzen — eigener Effect mit stabilen Deps, damit das NUR beim echten Unmount
  // passiert und nicht bei jedem Wandwechsel (der obige Effect liefe sonst kurz auf null, bevor
  // er den neuen Wert setzt).
  useEffect(() => () => setFokusWandIndex(null), [setFokusWandIndex])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <RoomView3D fokusWand={effektiveWand} onWandElementBewegt={positioniereWandElement} />
      {wandSegmente.length > 0 && (
        <WandMiniKarte wandSegmente={wandSegmente} aktiveWand={effektiveWand} onWechsel={setAktiveWand} />
      )}
    </div>
  )
}
