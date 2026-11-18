// Werbekennzeichnung „· Anzeige“ hinter einem Händler-Link (Teil E, 18.11.2026). Eine Stelle für
// alle Kennzeichnungen in der App: Shop-Verweise, Produktkarten und Zusammenfassung.
//
// #5F5E5A auf Weiß ≈ 6,4 : 1 — eine Pflichtkennzeichnung muss lesbar sein; das blasse #B4B2A9 der
// übrigen Beschriftungen (≈ 2,1 : 1) reicht dafür nicht. nowrap mit geschütztem Leerzeichen: „·“
// und „Anzeige“ brechen nie getrennt um.
export default function Anzeige() {
  return (
    <span style={{ fontSize: '10px', fontWeight: 400, color: '#5F5E5A', whiteSpace: 'nowrap' }}>
      ·&nbsp;Anzeige
    </span>
  )
}
