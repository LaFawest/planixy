import { useState } from 'react'
import { HIMMELSRICHTUNG_NAME } from '../constants'
import { himmelsrichtungAusNormale } from '../raumPolygon'

// ausschnitt: { wand, ganz, von, bis } aus RoomView3D — welcher Teil der Fokuswand im Bild ist,
// als Anteil von segment.start (0) bis segment.ende (1). onSprung(anteil): Klick auf die aktive Wand.
export default function WandMiniKarte({ wandSegmente, aktiveWand, onWechsel, ausschnitt = null, onSprung }) {
  // Nur in der schmalen Fassung (Handy, index.css): Dort ist die Minikarte eine schmale Leiste
  // „WAND 1 · NORD ‹ ›", und die Karte selbst klappt erst auf Tipp auf den Titel auf. In der
  // breiten Fassung ist die Karte immer zu sehen, der Titel ist dort nicht anklickbar.
  const [offen, setOffen] = useState(false)
  if (!wandSegmente.length) return null
  const punkte = wandSegmente.map(s => s.start)
  const xs = punkte.map(p => p.x), ys = punkte.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const breite = Math.max(1, maxX - minX)
  const tiefe = Math.max(1, maxY - minY)
  const VB = 100
  const PAD = 10
  const skala = Math.min((VB - PAD * 2) / breite, (VB - PAD * 2) / tiefe)
  const zu = (p) => ({
    x: PAD + (p.x - minX) * skala + (VB - PAD * 2 - breite * skala) / 2,
    y: PAD + (p.y - minY) * skala + (VB - PAD * 2 - tiefe * skala) / 2,
  })
  const pfad = punkte.map(zu).map(p => `${p.x},${p.y}`).join(' ')
  const segment = wandSegmente[aktiveWand] || wandSegmente[0]
  const a = zu(segment.start), b = zu(segment.ende)
  const mitte = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const normWinkel = Math.atan2(segment.normale.y, segment.normale.x) * 180 / Math.PI
  const weiter = (delta) => onWechsel((aktiveWand + delta + wandSegmente.length) % wandSegmente.length)
  // Sichtbarer Teil der aktiven Wand (Schritt 2, Teil 2b). Ist die Wand ganz im Bild, bleibt die
  // Linie wie bisher durchgehend kräftig.
  const teil = ausschnitt && ausschnitt.wand === aktiveWand && !ausschnitt.ganz
    ? { von: Math.max(0, ausschnitt.von), bis: Math.min(1, ausschnitt.bis) }
    : null
  const punktAuf = (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  // Klick: Die nächste Wand gewinnt. Ist es eine andere, wird zu ihr gewechselt; ist es die aktive,
  // springt der Ausschnitt an die angeklickte Stelle. getScreenCTM statt einfacher Skalierung, weil
  // das SVG per flex: 1 breiter werden kann als 70 px und viewBox dann mittig einpasst.
  const onKarteKlick = (e) => {
    const svg = e.currentTarget
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(ctm.inverse())
    let bester = null
    wandSegmente.forEach((s, i) => {
      const s1 = zu(s.start), s2 = zu(s.ende)
      const lx = s2.x - s1.x, ly = s2.y - s1.y
      const t = Math.max(0, Math.min(1, ((p.x - s1.x) * lx + (p.y - s1.y) * ly) / (lx * lx + ly * ly || 1)))
      const abstand = Math.hypot(s1.x + lx * t - p.x, s1.y + ly * t - p.y)
      if (!bester || abstand < bester.abstand) bester = { i, t, abstand }
    })
    if (!bester) return
    if (bester.i === aktiveWand) onSprung?.(bester.t)
    else onWechsel(bester.i)
  }
  return (
    // Lage und Aussehen in index.css (.minikarte): breit oben links mit Karte, schmal als Leiste,
    // deren Karte auf Tipp aufklappt (Hassans Entscheidung vom 16.11.2026, Variante 1). Gemessen
    // vorher am Handy: Die Live-Beschriftung oben mittig lag halb unter der Minikarte.
    <div className={`minikarte${offen ? ' minikarte-offen' : ''}`}>
      <button type="button" className="minikarte-titel" onClick={() => setOffen(o => !o)} aria-expanded={offen}>
        WAND {aktiveWand + 1} · {HIMMELSRICHTUNG_NAME[himmelsrichtungAusNormale(segment.normale)].toUpperCase()}
        <span className="minikarte-auf" aria-hidden="true">{offen ? '▴' : '▾'}</span>
      </button>
      <div className="minikarte-zeile">
        <button onClick={() => weiter(-1)} style={pfeilButtonStil} aria-label="Vorherige Wand">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444441" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <svg viewBox={`0 0 ${VB} ${VB}`} width="70" height="70" onClick={onKarteKlick} className="minikarte-karte" style={{ background: '#FAFAF8', border: '1.5px solid #D3D1C7', borderRadius: '4px', cursor: 'pointer' }}>
          <title>Wand anklicken: zur Wand wechseln oder an diese Stelle springen</title>
          <polygon points={pfad} fill="none" stroke="#D3D1C7" strokeWidth="1.5" />
          {teil ? (
            <>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#185FA5" strokeOpacity="0.3" strokeWidth="3.5" strokeLinecap="round" />
              <line x1={punktAuf(teil.von).x} y1={punktAuf(teil.von).y} x2={punktAuf(teil.bis).x} y2={punktAuf(teil.bis).y} stroke="#185FA5" strokeWidth="5" strokeLinecap="round" />
            </>
          ) : (
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#185FA5" strokeWidth="3.5" strokeLinecap="round" />
          )}
          <polygon
            points="0,-4 4,4 -4,4"
            fill="#185FA5"
            transform={`translate(${mitte.x + segment.normale.x * 8}, ${mitte.y + segment.normale.y * 8}) rotate(${normWinkel + 270})`}
          />
        </svg>
        <button onClick={() => weiter(1)} style={pfeilButtonStil} aria-label="Nächste Wand">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444441" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  )
}

const pfeilButtonStil = {
  width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #E8E6E0', background: 'white',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', padding: 0,
}
