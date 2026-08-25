import { createContext, useContext, useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useProjekteListe } from './ProjekteListeContext'

const ProjectsContext = createContext(null)

export function ProjectsProvider({ children }) {
  const { id } = useParams()
  // id kommt aus der URL und ist deshalb immer ein String — project.id kann aber je nach Alter
  // des Projekts eine echte Zahl (alte Projekte, vor der Umstellung auf crypto.randomUUID() in
  // idZaehler.js) oder ein UUID-String (neue Projekte) sein. String(p.id) === id vergleicht
  // beide Fälle typtolerant, ohne id in eine Zahl zu zwingen (das würde bei einer UUID zu NaN
  // und damit zu einem permanenten Redirect auf "/" führen).
  const activeProjectId = id
  const { projekte, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt } = useProjekteListe()

  const activeProject = projekte.find(p => String(p.id) === activeProjectId)

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
