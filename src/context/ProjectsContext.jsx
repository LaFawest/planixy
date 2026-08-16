import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { loadProjekte, saveProjekte } from './projekteStorage'
import { maxId } from './roomsStorage'

const ProjectsContext = createContext(null)

let nextProjektId = maxId(loadProjekte().map(p => p.id)) + 1

export function ProjectsProvider({ children }) {
  const [projekte, setProjekte] = useState(loadProjekte)
  const [activeProjectId, setActiveProjectId] = useState(() => loadProjekte()[0]?.id ?? 1)

  useEffect(() => {
    saveProjekte(projekte)
  }, [projekte])

  const activeProject = projekte.find(p => p.id === activeProjectId) || projekte[0]

  const updateProjekt = useCallback((id, changes) => {
    setProjekte(prev => prev.map(p => p.id === id
      ? { ...p, ...changes, geaendertAm: new Date().toISOString() }
      : p))
  }, [])

  const addProjekt = useCallback((name = 'Neues Projekt') => {
    const jetzt = new Date().toISOString()
    const neues = { id: nextProjektId++, name, erstelltAm: jetzt, geaendertAm: jetzt, raeume: [] }
    setProjekte(prev => [...prev, neues])
    setActiveProjectId(neues.id)
  }, [])

  const deleteProjekt = useCallback((id) => {
    if (projekte.length === 1) return
    const remaining = projekte.filter(p => p.id !== id)
    setProjekte(remaining)
    if (activeProjectId === id) setActiveProjectId(remaining[0].id)
  }, [projekte, activeProjectId])

  const renameProjekt = useCallback((id, name) => {
    updateProjekt(id, { name })
  }, [updateProjekt])

  const waehleProjekt = useCallback((id) => {
    setActiveProjectId(id)
  }, [])

  const value = useMemo(() => ({
    projekte, activeProjectId, activeProject,
    updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt,
  }), [projekte, activeProjectId, activeProject, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt])

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useProjekte() {
  return useContext(ProjectsContext)
}
