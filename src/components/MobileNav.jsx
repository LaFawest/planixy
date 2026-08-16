import RaeumeTab from './RaeumeTab'
import MoebelTab from './MoebelTab'
import EinstellungenTab from './EinstellungenTab'

export default function MobileNav({
  aktiverTab, setAktiverTab,
  rooms, activeRoomId, setActiveRoomId, deleteRoom, addRoom,
  suche, setSuche, aktiveKategorie, setAktiveKategorie, gefilterteMoebel, katalogItemHinzufuegen,
  activeRoom, updateRoom, setBoden, aktiveWand, setAktiveWand, aktuelleWandfarbe, setWandfarbeFuer,
}) {
  return (
    <>
      {/* Mobile Overlay */}
      <div className={`drawer-overlay ${aktiverTab ? 'open' : ''}`} onClick={() => setAktiverTab(null)} />

      {/* Mobile Drawer */}
      <div className={`drawer ${aktiverTab ? 'open' : ''}`}>
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ width: '40px', height: '4px', background: '#E8E6E0', borderRadius: '2px', margin: '0 auto 16px' }}></div>
        </div>
        {aktiverTab === 'raeume' && (
          <RaeumeTab rooms={rooms} activeRoomId={activeRoomId} setActiveRoomId={setActiveRoomId} deleteRoom={deleteRoom} addRoom={addRoom} setAktiverTab={setAktiverTab} />
        )}
        {aktiverTab === 'moebel' && (
          <MoebelTab suche={suche} setSuche={setSuche} aktiveKategorie={aktiveKategorie} setAktiveKategorie={setAktiveKategorie} gefilterteMoebel={gefilterteMoebel} katalogItemHinzufuegen={katalogItemHinzufuegen} setAktiverTab={setAktiverTab} />
        )}
        {aktiverTab === 'einstellungen' && (
          <EinstellungenTab activeRoom={activeRoom} activeRoomId={activeRoomId} updateRoom={updateRoom} setBoden={setBoden} aktiveWand={aktiveWand} setAktiveWand={setAktiveWand} aktuelleWandfarbe={aktuelleWandfarbe} setWandfarbeFuer={setWandfarbeFuer} />
        )}
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
