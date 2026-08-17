import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadProjekte, saveProjekte } from './projekteStorage'
import { vergibProjektId, vergibRaumId } from './idZaehler'
import { DEFAULT_RAUM_DESIGN } from '../constants'

const ProjekteListeContext = createContext(null)

export function ProjekteListeProvider({ children }) {
  const navigate = useNavigate()
  const [projekte, setProjekte] = useState(loadProjekte)

  useEffect(() => {
    saveProjekte(projekte)
  }, [projekte])

  const updateProjekt = useCallback((id, changes) => {
    setProjekte(prev => prev.map(p => p.id === id
      ? { ...p, ...changes, geaendertAm: new Date().toISOString() }
      : p))
  }, [])

  const addProjekt = useCallback((name) => {
    const jetzt = new Date().toISOString()
    const raumId = vergibRaumId()
    const standardRaum = { id: raumId, name: `Raum ${raumId}`, breite: 5, tiefe: 4, furniture: [], ...DEFAULT_RAUM_DESIGN }
    const neues = { id: vergibProjektId(), name, erstelltAm: jetzt, geaendertAm: jetzt, raeume: [standardRaum] }
    setProjekte(prev => [...prev, neues])
    navigate(`/projekt/${neues.id}`)
  }, [navigate])

  const deleteProjekt = useCallback((id) => {
    setProjekte(prev => prev.length === 1 ? prev : prev.filter(p => p.id !== id))
  }, [])

  const renameProjekt = useCallback((id, name) => {
    updateProjekt(id, { name })
  }, [updateProjekt])

  const waehleProjekt = useCallback((id) => {
    navigate(`/projekt/${id}`)
  }, [navigate])

  const value = useMemo(() => ({
    projekte, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt,
  }), [projekte, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt])

  return <ProjekteListeContext.Provider value={value}>{children}</ProjekteListeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useProjekteListe() {
  return useContext(ProjekteListeContext)
}
