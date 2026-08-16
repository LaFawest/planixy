import { createContext, useContext, useMemo, useState } from 'react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [ansicht, setAnsicht] = useState('2d')
  const [raumPanelOffen, setRaumPanelOffen] = useState(false)
  const [aktiverTab, setAktiverTab] = useState(null)

  const value = useMemo(() => ({
    ansicht, setAnsicht,
    raumPanelOffen, setRaumPanelOffen,
    aktiverTab, setAktiverTab,
  }), [ansicht, raumPanelOffen, aktiverTab])

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useUI() {
  return useContext(UIContext)
}
