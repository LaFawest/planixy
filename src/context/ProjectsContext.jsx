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
  const { projekte, projekteLadeStatus, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt } = useProjekteListe()

  const activeProject = projekte.find(p => String(p.id) === activeProjectId)

  const value = useMemo(() => ({
    projekte, activeProjectId, activeProject,
    updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt,
  }), [projekte, activeProjectId, activeProject, updateProjekt, addProjekt, deleteProjekt, renameProjekt, waehleProjekt])

  if (!activeProject) {
    // Projekte werden noch geladen (Auth-Status bzw. Supabase-Fetch, siehe ProjekteListeContext.jsx)
    // — noch nicht redirecten, sonst würde ein Reload auf einer Projektseite eines eingeloggten
    // Nutzers ihn fälschlich zurück aufs Dashboard schicken, bevor seine Supabase-Projekte da sind.
    if (projekteLadeStatus) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", color: '#B4B2A9', fontSize: '13px' }}>
          Lädt…
        </div>
      )
    }
    // Unbekannte oder gelöschte Projekt-ID: nicht abstürzen, zurück auf die Startroute
    return <Navigate to="/" replace />
  }

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useProjekte() {
  return useContext(ProjectsContext)
}
