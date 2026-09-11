import { createContext, useContext, useMemo, useState } from 'react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [ansicht, setAnsicht] = useState('2d')
  const [raumPanelOffen, setRaumPanelOffen] = useState(false)
  const [aktiverTab, setAktiverTab] = useState(null)
  // Phase 4, Teil 2 (Seitenleiste): aktuell im 3D-Fokus ausgewähltes Fenster, { id, breiteCm,
  // hoeheCm } | null — von RoomView3D.jsx geschrieben, von Sidebar.jsx gelesen fürs
  // Breite/Höhe-Bedienfeld. Die beiden Komponenten sind Geschwister ohne direkten Props-Weg.
  const [ausgewaehltesWandElement, setAusgewaehltesWandElement] = useState(null)

  const value = useMemo(() => ({
    ansicht, setAnsicht,
    raumPanelOffen, setRaumPanelOffen,
    aktiverTab, setAktiverTab,
    ausgewaehltesWandElement, setAusgewaehltesWandElement,
  }), [ansicht, raumPanelOffen, aktiverTab, ausgewaehltesWandElement])

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useUI() {
  return useContext(UIContext)
}
