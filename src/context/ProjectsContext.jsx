import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { loadProjekte, saveProjekte } from './projekteStorage'
import { maxId } from './roomsStorage'

const ProjectsContext = createContext(null)

let nextProjektId = maxId(loadProjekte().map(p => p.id)) + 1

export function ProjectsProvider({ children }) {
  const { id } = useParams()
  const activeProjectId = Number(id)
  const navigate = useNavigate()
  const [projekte, setProjekte] = useState(loadProjekte)

  useEffect(() => {
    saveProjekte(projekte)
  }, [projekte])

  const activeProject = projekte.find(p => p.id === activeProjectId)

  const updateProjekt = useCallback((id, changes) => {
    setProjekte(prev => prev.map(p => p.id === id
      ? { ...p, ...changes, geaendertAm: new Date().toISOString() }
      : p))
  }, [])

  const addProjekt = useCallback((name = 'Neues Projekt') => {
    const jetzt = new Date().toISOString()
    const neues = { id: nextProjektId++, name, erstelltAm: jetzt, geaendertAm: jetzt, raeume: [] }
    setProjekte(prev => [...prev, neues])
    navigate(`/projekt/${neues.id}`)
  }, [navigate])

  const deleteProjekt = useCallback((id) => {
    if (projekte.length === 1) return
    const remaining = projekte.filter(p => p.id !== id)
    setProjekte(remaining)
    if (activeProjectId === id) navigate(`/projekt/${remaining[0].id}`, { replace: true })
  }, [projekte, activeProjectId, navigate])

  const renameProjekt = useCallback((id, name) => {
    updateProjekt(id, { name })
  }, [updateProjekt])

  const waehleProjekt = useCallback((id) => {
    navigate(`/projekt/${id}`)
  }, [navigate])

  const value = useMemo(() => ({
    projekte, activeProjectId, activeProject,
    updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt,
  }), [projekte, activeProjectId, activeProject, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt])

  // Unbekannte oder gelöschte Projekt-ID: nicht abstürzen, zurück auf die Startroute
  if (!activeProject) {
    return <Navigate to="/" replace />
  }

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useProjekte() {
  return useContext(ProjectsContext)
}
