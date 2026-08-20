import { useRooms } from '../context/RoomsContext'
import { useDesign } from '../context/DesignContext'
import { polygonFlaeche } from '../raumPolygon'

// Breite/Tiefe klemmen wir schon beim Tippen auf mindestens 1 m (deckt sich mit dem min-Attribut
// der Felder) — nicht wegen der Optik, sondern weil ein Zwischenwert unter ~0,53 m (die doppelte
// Wanddicke+Fußleiste) versetztesPolygon() beim nächsten Render zum Werfen bringen würde, noch
// bevor der Nutzer fertig getippt hat. Die Nachjustierung von Möbeln/Trennwänden/Fenstern läuft
// dagegen bewusst NICHT bei jedem Tastendruck, sondern erst in onBlur (siehe nachjustiereRaum in
// RoomsContext.jsx) — sonst würde ein kurzzeitiger 1-m-Raum beim Tippen von z.B. "12" alle Möbel
// in eine Ecke klemmen, obwohl der Raum am Ende viel größer ist.
const klemmeMassEingabe = (wert) => Math.max(1, Number(wert) || 6)
const commitBeiEnter = (e) => { if (e.key === 'Enter') e.target.blur() }

export default function RaumSchritt() {
  const { activeRoom, activeRoomId, updateRoom, nachjustiereRaum } = useRooms()
  const { raumHoehe, setRaumHoehe } = useDesign()
  // Breite und Tiefe gehören zusammen zu einer Formänderung — onBlur sitzt deshalb auf der
  // gemeinsamen Hülle statt auf jedem Feld einzeln. Sonst würde das Springen zwischen beiden
  // Feldern (Breite tippen, in Tiefe klicken) zwei getrennte Nachjustierungen auslösen: die
  // erste noch mit der alten Tiefe, wodurch z.B. ein Fenster kurzzeitig auf eine andere Wand
  // rutschen und von dort aus ein zweites Mal (jetzt mit der neuen Tiefe) weitersnappen würde,
  // statt direkt an seinem endgültigen Platz zu landen. e.relatedTarget ist das Element, das den
  // Fokus als Nächstes bekommt — liegt es noch innerhalb der Hülle (das jeweils andere Feld),
  // wird noch nicht nachjustiert.
  const nachjustierenBeimVerlassen = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) nachjustiereRaum(activeRoomId)
  }
  return (
    <>
      <input type="text" value={activeRoom.name} onChange={e => updateRoom(activeRoomId, { name: e.target.value })}
        placeholder="Raumname"
        style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #E8E6E0', borderRadius: '8px', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', boxSizing: 'border-box' }} />

      <div>
        <div onBlur={nachjustierenBeimVerlassen} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: '#888780' }}>Breite</span>
          <input type="number" min="1" max="20" value={activeRoom.breite || 6}
            onChange={e => updateRoom(activeRoomId, { breite: klemmeMassEingabe(e.target.value) })}
            onKeyDown={commitBeiEnter}
            style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
          <span style={{ fontSize: '12px', color: '#888780' }}>× Tiefe</span>
          <input type="number" min="1" max="20" value={activeRoom.tiefe || 5}
            onChange={e => updateRoom(activeRoomId, { tiefe: klemmeMassEingabe(e.target.value) })}
            onKeyDown={commitBeiEnter}
            style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#888780' }}>Höhe</span>
          <input type="number" min="1.9" max="5" step="0.1" value={raumHoehe} onChange={e => setRaumHoehe(Number(e.target.value))}
            style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
          <span style={{ fontSize: '12px', color: '#888780' }}>m</span>
          <span style={{ marginLeft: 'auto', background: '#EAF3DE', color: '#3B6D11', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: '500' }}>{Math.round(polygonFlaeche(activeRoom.eckpunkte) * 10) / 10} m²</span>
        </div>
      </div>
    </>
  )
}
