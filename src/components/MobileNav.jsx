import RaeumeTab from './RaeumeTab'
import MoebelTab from './MoebelTab'
import EinstellungenTab from './EinstellungenTab'
import { useUI } from '../context/UIContext'

export default function MobileNav() {
  const { aktiverTab, setAktiverTab } = useUI()
  return (
    <>
      {/* Mobile Overlay */}
      <div className={`drawer-overlay ${aktiverTab ? 'open' : ''}`} onClick={() => setAktiverTab(null)} />

      {/* Mobile Drawer */}
      <div className={`drawer ${aktiverTab ? 'open' : ''}`}>
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ width: '40px', height: '4px', background: '#E8E6E0', borderRadius: '2px', margin: '0 auto 16px' }}></div>
        </div>
        {aktiverTab === 'raeume' && <RaeumeTab />}
        {aktiverTab === 'moebel' && <MoebelTab />}
        {aktiverTab === 'einstellungen' && <EinstellungenTab />}
      </div>

      {/* Mobile Tab Bar */}
      <div className="mobile-tabs">
        {[
          { id: 'raeume', icon: '🏠', label: 'Räume' },
          { id: 'moebel', icon: '🛋️', label: 'Möbel' },
          { id: 'einstellungen', icon: '⚙️', label: 'Design' },
        ].map(tab => (
          <div key={tab.id} onClick={() => setAktiverTab(aktiverTab === tab.id ? null : tab.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: aktiverTab === tab.id ? '#185FA5' : '#B4B2A9', transition: 'color 0.15s' }}>
            <div style={{ fontSize: '22px', marginBottom: '2px' }}>{tab.icon}</div>
            <div style={{ fontSize: '10px', fontWeight: aktiverTab === tab.id ? '500' : '400' }}>{tab.label}</div>
          </div>
        ))}
      </div>
    </>
  )
}
