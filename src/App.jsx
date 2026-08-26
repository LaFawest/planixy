import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { UIProvider } from './context/UIContext'
import { ProjekteListeProvider } from './context/ProjekteListeContext'
import { ProjectsProvider } from './context/ProjectsContext'
import { RoomsProvider } from './context/RoomsContext'
import { WizardProvider } from './context/WizardContext'
import { DesignProvider } from './context/DesignContext'
import { FurnitureProvider } from './context/FurnitureContext'
import { TrennwandProvider } from './context/TrennwandContext'
import { KatalogProvider } from './context/KatalogContext'
import { useRaumGeometrie } from './context/useRaumGeometrie'
import Dashboard from './components/Dashboard'
import MigrationsDialog from './components/MigrationsDialog'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import SchrittLeiste from './components/SchrittLeiste'
import MobileNav from './components/MobileNav'
import Canvas2D from './components/Canvas2D'
import PanelRechts from './components/PanelRechts'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <ProjekteListeProvider>
          <MigrationsDialog />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projekt/:id" element={<ProjektRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProjekteListeProvider>
      </UIProvider>
    </AuthProvider>
  )
}

function ProjektRoute() {
  return (
    <ErrorBoundary>
      <ProjectsProvider>
        <RoomsProvider>
          <WizardProvider>
            <DesignProvider>
              <FurnitureProvider>
                <TrennwandProvider>
                  <KatalogProvider>
                    <AppContent />
                  </KatalogProvider>
                </TrennwandProvider>
              </FurnitureProvider>
            </DesignProvider>
          </WizardProvider>
        </RoomsProvider>
      </ProjectsProvider>
    </ErrorBoundary>
  )
}

function AppContent() {
  const { canvasB, canvasT, wandDicke, innenB, innenT, wandSegmente, innenEckpunkte } = useRaumGeometrie()

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>

      <Sidebar />

      {/* Hauptbereich */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <Topbar />
        <SchrittLeiste />

        <Canvas2D canvasB={canvasB} canvasT={canvasT} innenB={innenB} innenT={innenT} wandDicke={wandDicke} wandSegmente={wandSegmente} innenEckpunkte={innenEckpunkte} />

      </div>

      <PanelRechts />

      <MobileNav />

    </div>
  )
}
