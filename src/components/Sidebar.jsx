import KatalogPanel from './KatalogPanel'
import LegalLinks from './LegalLinks'
import ImRaumListe from './ImRaumListe'
import { useUI } from '../context/UIContext'
import { useRooms } from '../context/RoomsContext'
import { useWizard } from '../context/WizardContext'
import { useFurniture } from '../context/FurnitureContext'

const MIN_FENSTER_GROESSE_CM = 30 // muss zu MIN_FENSTER_GROESSE (0.3m) in RoomView3D.jsx passen

export default function Sidebar() {
  const { raumPanelOffen, ausgewaehltesWandElement } = useUI()
  const { rooms, activeRoomId, waehleRaum, deleteRoom, addRoom } = useRooms()
  const { schritt } = useWizard()
  const { furniture, removeFurniture, positioniereWandElement } = useFurniture()
  const wandElemente = furniture.filter(f => f.istWandElement)
  return (
    <div className="sidebar" style={{ width: '260px', background: 'white', borderRight: '1px solid #E8E6E0', padding: '24px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '0 8px', marginBottom: '28px' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '500', color: '#2C2C2A' }}>Planixy</h2>
        <p style={{ fontSize: '11px', color: '#B4B2A9', marginTop: '2px' }}>Intelligente Raumplanung</p>
      </div>
      <LegalLinks style={{ padding: '0 8px', marginBottom: '20px' }} />
      <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '8px', letterSpacing: '0.08em', padding: '0 8px' }}>MEINE RÄUME</p>
      <div>
        {rooms.map(room => (
          <div key={room.id} className="room-item" onClick={() => waehleRaum(room.id)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', marginBottom: '3px', background: activeRoomId === room.id ? '#EEF4FC' : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => { if (activeRoomId !== room.id) e.currentTarget.style.background = '#F7F6F2' }}
            onMouseLeave={e => { if (activeRoomId !== room.id) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ fontSize: '13px', color: activeRoomId === room.id ? '#185FA5' : '#444441', fontWeight: activeRoomId === room.id ? '500' : '400', flex: 1 }}>
              {room.name}
            </span>
            <span style={{ fontSize: '11px', color: activeRoomId === room.id && raumPanelOffen ? '#185FA5' : '#D3D1C7', marginRight: rooms.length > 1 ? '4px' : 0 }}>⚙</span>
            {rooms.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); deleteRoom(room.id) }}
                style={{ fontSize: '11px', color: '#D3D1C7', cursor: 'pointer', marginLeft: '4px' }}
                onMouseEnter={e => e.target.style.color = '#E24B4A'}
                onMouseLeave={e => e.target.style.color = '#D3D1C7'}>✕</span>
            )}
          </div>
        ))}
      </div>
      <div onClick={addRoom}
        style={{ marginTop: '12px', padding: '9px 12px', borderRadius: '10px', border: '1.5px dashed #D3D1C7', cursor: 'pointer', fontSize: '12px', color: '#888780', textAlign: 'center', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.color = '#185FA5' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#D3D1C7'; e.currentTarget.style.color = '#888780' }}>
        + Raum hinzufügen
      </div>

      <div style={{ height: '1px', background: '#E8E6E0', margin: '18px 0' }}></div>

      <KatalogPanel spalten={2} />

      {schritt === 2 && (
        <>
          <div style={{ height: '1px', background: '#E8E6E0', margin: '18px 0' }}></div>
          <ImRaumListe
            titel="FENSTER & TÜREN"
            items={wandElemente}
            removeFurniture={removeFurniture}
            leerText="Noch keine Fenster oder Türen — oben im Katalog auswählen"
          />
        </>
      )}

      {schritt === 2 && ausgewaehltesWandElement && (
        <>
          <div style={{ height: '1px', background: '#E8E6E0', margin: '18px 0' }}></div>
          <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '8px', letterSpacing: '0.08em', padding: '0 8px' }}>GRÖSSE</p>
          <div style={{ display: 'flex', gap: '10px', padding: '0 8px' }}>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: '11px', color: '#888780', display: 'block', marginBottom: '4px' }}>Breite (cm)</span>
              <input
                key={`breite-${ausgewaehltesWandElement.id}-${ausgewaehltesWandElement.breiteCm}`}
                type="number" min={MIN_FENSTER_GROESSE_CM} defaultValue={ausgewaehltesWandElement.breiteCm}
                onBlur={e => {
                  const cm = Math.max(MIN_FENSTER_GROESSE_CM, Number(e.target.value) || MIN_FENSTER_GROESSE_CM)
                  positioniereWandElement(ausgewaehltesWandElement.id, { width: Math.round(cm * 0.6) })
                }}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                style={{ width: '100%', fontSize: '13px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #D3D1C7', boxSizing: 'border-box' }} />
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: '11px', color: '#888780', display: 'block', marginBottom: '4px' }}>
                Höhe (cm){ausgewaehltesWandElement.bogenDurchgang ? ' · Bogen' : ''}
              </span>
              {ausgewaehltesWandElement.bogenDurchgang ? (
                // Rundbogen-Durchgang (Teil 3b): Höhe ergibt sich automatisch aus der Breite
                // (Kämpferhöhe + Radius), kein editierbares Feld — nur zur Information.
                <div style={{ width: '100%', fontSize: '13px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #E8E6E0', boxSizing: 'border-box', color: '#888780', background: '#FAFAF8' }}>
                  {ausgewaehltesWandElement.hoeheCm}
                </div>
              ) : (
                <input
                  key={`hoehe-${ausgewaehltesWandElement.id}-${ausgewaehltesWandElement.hoeheCm}`}
                  type="number" min={MIN_FENSTER_GROESSE_CM} defaultValue={ausgewaehltesWandElement.hoeheCm}
                  onBlur={e => {
                    const cm = Math.max(MIN_FENSTER_GROESSE_CM, Number(e.target.value) || MIN_FENSTER_GROESSE_CM)
                    positioniereWandElement(ausgewaehltesWandElement.id, { hoeheReal: cm / 100 })
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  style={{ width: '100%', fontSize: '13px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #D3D1C7', boxSizing: 'border-box' }} />
              )}
            </label>
          </div>
          {ausgewaehltesWandElement.bogenDurchgang && (
            <div style={{ padding: '10px 8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#888780' }}>Backstein-Einfassung</span>
                <div onClick={() => positioniereWandElement(ausgewaehltesWandElement.id, { backstein: !ausgewaehltesWandElement.backstein })} style={{
                  width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s',
                  background: ausgewaehltesWandElement.backstein ? '#185FA5' : '#E8E6E0', position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: '2px', left: ausgewaehltesWandElement.backstein ? '18px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
