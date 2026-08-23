import { useFurniture } from '../context/FurnitureContext'
import ImRaumListe from './ImRaumListe'

export default function LichtSchritt() {
  const { furniture, removeFurniture } = useFurniture()
  const leuchten = furniture.filter(f => f.kategorie === 'Licht')
  return (
    <ImRaumListe
      titel="LEUCHTEN"
      items={leuchten}
      removeFurniture={removeFurniture}
      leerText="Noch keine Leuchten — links im Katalog auswählen"
    />
  )
}
