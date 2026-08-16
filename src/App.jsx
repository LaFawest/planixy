import { UIProvider } from './context/UIContext'
import { ProjectsProvider } from './context/ProjectsContext'
import { RoomsProvider } from './context/RoomsContext'
import { DesignProvider } from './context/DesignContext'
import { FurnitureProvider } from './context/FurnitureContext'
import { TrennwandProvider } from './context/TrennwandContext'
import { KatalogProvider } from './context/KatalogContext'
import { useRaumGeometrie } from './context/useRaumGeometrie'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import MobileNav from './components/MobileNav'
import Canvas2D from './components/Canvas2D'
import PanelRechts from './components/PanelRechts'

export default function App() {
  return (
    <UIProvider>
      <ProjectsProvider>
        <RoomsProvider>
          <DesignProvider>
            <FurnitureProvider>
              <TrennwandProvider>
                <KatalogProvider>
                  <AppContent />
                </KatalogProvider>
              </TrennwandProvider>
            </FurnitureProvider>
          </DesignProvider>
        </RoomsProvider>
      </ProjectsProvider>
    </UIProvider>
  )
}

function AppContent() {
  const { canvasB, canvasT, wandDicke, innenB, innenT } = useRaumGeometrie()

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>

      <Sidebar />

      {/* Hauptbereich */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <Topbar />

        <Canvas2D canvasB={canvasB} canvasT={canvasT} innenB={innenB} innenT={innenT} wandDicke={wandDicke} />

      </div>

      <PanelRechts />

      <MobileNav />

    </div>
  )
}
