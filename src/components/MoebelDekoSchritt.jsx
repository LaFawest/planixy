import { useFurniture } from '../context/FurnitureContext'
import ImRaumListe from './ImRaumListe'

export default function MoebelDekoSchritt() {
  const { furniture, removeFurniture } = useFurniture()
  const moebelUndDeko = furniture.filter(f => !f.istWandElement && f.kategorie !== 'Licht')
  return (
    <ImRaumListe
      titel="MÖBEL & DEKO"
      items={moebelUndDeko}
      removeFurniture={removeFurniture}
      leerText="Noch keine Möbel"
    />
  )
}
