import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { alleKatalogItems } from '../constants'
import { useFurniture } from './FurnitureContext'

const KatalogContext = createContext(null)

export function KatalogProvider({ children }) {
  const { addFurniture, addWandElement } = useFurniture()
  const [aktiveKategorie, setAktiveKategorie] = useState('Alle')
  const [suche, setSuche] = useState('')

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
