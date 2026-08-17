import { useFurniture } from '../context/FurnitureContext'
import ImRaumListe from './ImRaumListe'

export default function FensterTuerenSchritt() {
  const { furniture, removeFurniture } = useFurniture()
  const wandElemente = furniture.filter(f => f.istWandElement)
  return (
    <ImRaumListe
      titel="FENSTER & TÜREN"
      items={wandElemente}
      removeFurniture={removeFurniture}
      leerText="Noch keine Fenster oder Türen — links im Katalog auswählen"
    />
  )
}
