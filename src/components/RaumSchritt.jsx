import { useRooms } from '../context/RoomsContext'
import { useDesign } from '../context/DesignContext'
import { polygonFlaeche, rechteckPolygon, lFormPolygon, uFormPolygon, boundingBox } from '../raumPolygon'
import { RAUM_FORMEN, L_FORM_ECKEN, U_FORM_SEITEN, MIN_RAUM_SCHENKEL_M } from '../constants'

// Breite/Tiefe/Aussparung klemmen wir schon beim Tippen auf mindestens MIN_RAUM_SCHENKEL_M —
// nicht wegen der Optik, sondern weil ein Zwischenwert, der einen Schenkel schmaler als die
// doppelte Wanddicke+Fußleiste (≈0,53 m) übrig ließe, versetztesPolygon() beim nächsten Render
// zum Werfen bringen würde, noch bevor der Nutzer fertig getippt hat. Die Nachjustierung von
// Möbeln/Trennwänden/Fenstern läuft dagegen bewusst NICHT bei jedem Tastendruck, sondern erst in
// onBlur (siehe nachjustiereRaum in RoomsContext.jsx) — sonst würde ein kurzzeitiger 1-m-Raum
// beim Tippen von z.B. "12" alle Möbel in eine Ecke klemmen, obwohl der Raum am Ende viel größer
// ist.
const klemmeMassEingabe = (wert) => Math.max(1, Number(wert) || 6)
const klemmeAussparungEingabe = (wert, gesamtmass) =>
  Math.max(0.5, Math.min(gesamtmass - MIN_RAUM_SCHENKEL_M, Number(wert) || 1))
const commitBeiEnter = (e) => { if (e.key === 'Enter') e.target.blur() }

// Sinnvoller Startwert für eine neu aktivierte Aussparung: die Hälfte des jeweiligen Maßes,
// geklemmt auf die Leitplanke — landet nie außerhalb des gültigen Bereichs.
const defaultAussparungMass = (gesamtmass) => klemmeAussparungEingabe(Math.round(gesamtmass / 2), gesamtmass)

const gueltigeAusrichtung = (raumForm, wert) =>
  raumForm === 'l-form' ? L_FORM_ECKEN.some(e => e.id === wert)
    : raumForm === 'u-form' ? U_FORM_SEITEN.some(s => s.id === wert)
      : true

// Kleine Konturvorschau (SVG-Polygon), direkt aus den echten Polygon-Generatoren gerendert —
// keine separaten Icon-Assets, die App zeigt sich selbst. Normalisiert auf ein festes Quadrat,
// unabhängig von den tatsächlichen Metern, damit alle Kacheln gleich groß wirken.
const VORSCHAU_GROESSE = 34
function vorschauPunkte(eckpunkte) {
  const box = boundingBox(eckpunkte)
  const skala = (VORSCHAU_GROESSE - 6) / Math.max(box.breite, box.tiefe, 0.01)
  const offsetX = (VORSCHAU_GROESSE - box.breite * skala) / 2
  const offsetY = (VORSCHAU_GROESSE - box.tiefe * skala) / 2
  return eckpunkte.map(p => `${((p.x - box.minX) * skala + offsetX).toFixed(1)},${((p.y - box.minY) * skala + offsetY).toFixed(1)}`).join(' ')
}
function KonturVorschau({ eckpunkte, aktiv }) {
  return (
    <svg width={VORSCHAU_GROESSE} height={VORSCHAU_GROESSE}>
      <polygon points={vorschauPunkte(eckpunkte)}
        fill={aktiv ? '#EEF4FC' : '#FAFAF8'} stroke={aktiv ? '#185FA5' : '#B4B2A9'}
        strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

const kachelStyle = (aktiv) => ({
  padding: '5px 4px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', flex: 1,
  border: `${aktiv ? '2px' : '1px'} solid ${aktiv ? '#185FA5' : '#E8E6E0'}`,
  background: aktiv ? '#EEF4FC' : '#FAFAF8',
})
const kachelLabelStyle = (aktiv) => ({
  fontSize: '10px', color: aktiv ? '#185FA5' : '#444441', fontWeight: aktiv ? '500' : '400', marginTop: '2px',
})

export default function RaumSchritt() {
  const { activeRoom, activeRoomId, updateRoom, nachjustiereRaum } = useRooms()
  const { raumHoehe, setRaumHoehe } = useDesign()
  const raumForm = activeRoom.raumForm || 'rechteck'
  const breite = activeRoom.breite || 6
  const tiefe = activeRoom.tiefe || 5
  const aussparungBreite = activeRoom.aussparungBreite || defaultAussparungMass(breite)
  const aussparungTiefe = activeRoom.aussparungTiefe || defaultAussparungMass(tiefe)

  // Breite/Tiefe/Aussparung gehören zusammen zu einer Formänderung — onBlur sitzt deshalb auf
  // der gemeinsamen Hülle statt auf jedem Feld einzeln. Sonst würde das Springen zwischen zwei
  // Feldern (z.B. Breite tippen, in Tiefe klicken) zwei getrennte Nachjustierungen auslösen: die
  // erste noch mit der alten Tiefe, wodurch z.B. ein Fenster kurzzeitig auf eine andere Wand
  // rutschen und von dort aus ein zweites Mal (jetzt mit der neuen Tiefe) weitersnappen würde,
  // statt direkt an seinem endgültigen Platz zu landen. e.relatedTarget ist das Element, das den
  // Fokus als Nächstes bekommt — liegt es noch innerhalb der Hülle (eines der anderen Felder),
  // wird noch nicht nachjustiert.
  const nachjustierenBeimVerlassen = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) nachjustiereRaum(activeRoomId)
  }

  // Formauswahl-Klick: ändert raumForm und, beim ersten Wechsel zu L-/U-Form, setzt sinnvolle
  // Aussparungsmaße und eine gültige Ausrichtung — alles in einem nachjustiereRaum-Aufruf, damit
  // Möbel/Fenster/Trennwände sofort mit der neuen Form (nicht der alten) nachjustiert werden.
  // Eine schon gesetzte Aussparung/Ausrichtung bleibt beim Wechsel erhalten (auch wenn man
  // zwischendurch auf Rechteck war) — nur wenn die Ausrichtung für die neue Form keinen Sinn
  // ergibt (z.B. eine L-Form-Ecke bei einer U-Form), wird sie auf einen gültigen Standardwert
  // zurückgesetzt.
  const waehleForm = (neueForm) => {
    if (neueForm === raumForm) return
    const changes = { raumForm: neueForm }
    if (neueForm !== 'rechteck') {
      if (!gueltigeAusrichtung(neueForm, activeRoom.ausrichtung)) {
        changes.ausrichtung = neueForm === 'l-form' ? L_FORM_ECKEN[0].id : U_FORM_SEITEN[0].id
      }
      if (!activeRoom.aussparungBreite) changes.aussparungBreite = defaultAussparungMass(breite)
      if (!activeRoom.aussparungTiefe) changes.aussparungTiefe = defaultAussparungMass(tiefe)
    }
    nachjustiereRaum(activeRoomId, changes)
  }
  const waehleAusrichtung = (wert) => {
    if (wert === activeRoom.ausrichtung) return
    nachjustiereRaum(activeRoomId, { ausrichtung: wert })
  }

  const ausrichtungsOptionen = raumForm === 'l-form' ? L_FORM_ECKEN : raumForm === 'u-form' ? U_FORM_SEITEN : []
  const aktuelleAusrichtung = activeRoom.ausrichtung && gueltigeAusrichtung(raumForm, activeRoom.ausrichtung)
    ? activeRoom.ausrichtung
    : ausrichtungsOptionen[0]?.id

  return (
    <>
      <input type="text" value={activeRoom.name} onChange={e => updateRoom(activeRoomId, { name: e.target.value })}
        placeholder="Raumname"
        style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #E8E6E0', borderRadius: '8px', outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', boxSizing: 'border-box' }} />

      <div>
        <p style={{ fontSize: '10px', color: '#B4B2A9', marginBottom: '6px', letterSpacing: '0.06em' }}>FORM</p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          {RAUM_FORMEN.map(form => {
            const vorschauEckpunkte = form.id === 'rechteck' ? rechteckPolygon(6, 5)
              : form.id === 'l-form' ? lFormPolygon(6, 5, 2, 2, 'suedost')
                : uFormPolygon(6, 5, 2, 2, 'nord')
            const aktiv = raumForm === form.id
            return (
              <div key={form.id} onClick={() => waehleForm(form.id)} style={kachelStyle(aktiv)}>
                <KonturVorschau eckpunkte={vorschauEckpunkte} aktiv={aktiv} />
                <div style={kachelLabelStyle(aktiv)}>{form.name}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div onBlur={nachjustierenBeimVerlassen} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#888780' }}>Breite</span>
          <input type="number" min="1" max="20" value={breite}
            onChange={e => updateRoom(activeRoomId, { breite: klemmeMassEingabe(e.target.value) })}
            onKeyDown={commitBeiEnter}
            style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
          <span style={{ fontSize: '12px', color: '#888780' }}>× Tiefe</span>
          <input type="number" min="1" max="20" value={tiefe}
            onChange={e => updateRoom(activeRoomId, { tiefe: klemmeMassEingabe(e.target.value) })}
            onKeyDown={commitBeiEnter}
            style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />

          {raumForm !== 'rechteck' && (
            <>
              <span style={{ fontSize: '12px', color: '#888780' }}>Aussparung</span>
              <input type="number" min="0.5" step="0.5" value={aussparungBreite}
                onChange={e => updateRoom(activeRoomId, { aussparungBreite: klemmeAussparungEingabe(e.target.value, breite) })}
                onKeyDown={commitBeiEnter}
                style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
              <span style={{ fontSize: '12px', color: '#888780' }}>×</span>
              <input type="number" min="0.5" step="0.5" value={aussparungTiefe}
                onChange={e => updateRoom(activeRoomId, { aussparungTiefe: klemmeAussparungEingabe(e.target.value, tiefe) })}
                onKeyDown={commitBeiEnter}
                style={{ width: '48px', padding: '5px 6px', border: '1px solid #E8E6E0', borderRadius: '8px', fontSize: '12px', textAlign: 'center', outline: 'none', background: '#F7F6F2' }} />
            </>
          )}
        </div>

        {raumForm !== 'rechteck' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '10px' }}>
            {ausrichtungsOptionen.map(option => {
              const vorschauEckpunkte = raumForm === 'l-form'
                ? lFormPolygon(breite, tiefe, aussparungBreite, aussparungTiefe, option.id)
                : uFormPolygon(breite, tiefe, aussparungBreite, aussparungTiefe, option.id)
              const aktiv = aktuelleAusrichtung === option.id
              return (
                <div key={option.id} onClick={() => waehleAusrichtung(option.id)} style={{ ...kachelStyle(aktiv), display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}>
                  <KonturVorschau eckpunkte={vorschauEckpunkte} aktiv={aktiv} />
                  <div style={kachelLabelStyle(aktiv)}>{option.name}</div>
                </div>
              )
            })}
          </div>
        )}

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
