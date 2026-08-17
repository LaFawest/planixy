import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { alleKatalogItems } from '../constants'
import { useFurniture } from './FurnitureContext'
import { useWizard } from './WizardContext'

const KatalogContext = createContext(null)

export function KatalogProvider({ children }) {
  const { addFurniture, addWandElement } = useFurniture()
  const { schritt } = useWizard()
  const [aktiveKategorie, setAktiveKategorie] = useState('Alle')
  const [suche, setSuche] = useState('')
  const [gesehenerSchritt, setGesehenerSchritt] = useState(schritt)

  // Katalog beim Schrittwechsel sinnvoll vorfiltern — der Nutzer kann die Kategorie danach
  // jederzeit selbst ändern, die Vorauswahl greift nur einmalig beim Wechsel, nicht dauerhaft.
  // Direkt im Render statt in einem Effect angepasst (React-Empfehlung für "State an eine
  // Prop-Änderung anpassen"), damit es keinen zusätzlichen Render-Durchlauf braucht.
  if (schritt !== gesehenerSchritt) {
    setGesehenerSchritt(schritt)
    if (schritt === 3) setAktiveKategorie('Fenster & Türen')
    if (schritt === 5) setAktiveKategorie('Alle')
  }

  const gefilterteMoebel = useMemo(() => alleKatalogItems.filter(item => {
    const kategorieOk = aktiveKategorie === 'Alle' || item.kategorie === aktiveKategorie
    const sucheOk = item.name.toLowerCase().includes(suche.toLowerCase())
    return kategorieOk && sucheOk
  }), [aktiveKategorie, suche])

  const katalogItemHinzufuegen = useCallback((item) => {
    item.typ ? addWandElement(item) : addFurniture(item)
  }, [addFurniture, addWandElement])

  const value = useMemo(() => ({
    suche, setSuche, aktiveKategorie, setAktiveKategorie, gefilterteMoebel, katalogItemHinzufuegen,
  }), [suche, aktiveKategorie, gefilterteMoebel, katalogItemHinzufuegen])

  return <KatalogContext.Provider value={value}>{children}</KatalogContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useKatalog() {
  return useContext(KatalogContext)
}
