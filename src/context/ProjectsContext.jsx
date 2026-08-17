import { createContext, useContext, useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useProjekteListe } from './ProjekteListeContext'

const ProjectsContext = createContext(null)

export function ProjectsProvider({ children }) {
  const { id } = useParams()
  const activeProjectId = Number(id)
  const { projekte, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt } = useProjekteListe()

  const activeProject = projekte.find(p => p.id === activeProjectId)

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
