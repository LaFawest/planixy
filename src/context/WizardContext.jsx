import { createContext, useContext, useCallback, useMemo } from 'react'
import { useRooms } from './RoomsContext'
import { DEFAULT_WIZARD_SCHRITT, WIZARD_SCHRITTE } from '../constants'

const WizardContext = createContext(null)

const ERSTER_SCHRITT = WIZARD_SCHRITTE[0].nummer
const LETZTER_SCHRITT = WIZARD_SCHRITTE[WIZARD_SCHRITTE.length - 1].nummer

export function WizardProvider({ children }) {
  const { activeRoom, activeRoomId, updateRoom } = useRooms()

  const schritt = activeRoom?.wizardSchritt ?? DEFAULT_WIZARD_SCHRITT

  const setSchritt = useCallback((nummer) => {
    updateRoom(activeRoomId, { wizardSchritt: nummer })
  }, [updateRoom, activeRoomId])

  const vorherigerSchritt = useCallback(() => {
    setSchritt(Math.max(ERSTER_SCHRITT, schritt - 1))
  }, [setSchritt, schritt])

  const naechsterSchritt = useCallback(() => {
    setSchritt(Math.min(LETZTER_SCHRITT, schritt + 1))
  }, [setSchritt, schritt])

  const value = useMemo(() => ({
    schritt, setSchritt, vorherigerSchritt, naechsterSchritt,
  }), [schritt, setSchritt, vorherigerSchritt, naechsterSchritt])

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useWizard() {
  return useContext(WizardContext)
}
