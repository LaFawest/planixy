import { shopVerweiseFuer } from '../data/shopVerweise'
import { AKZENT } from '../farben'
import Anzeige from './Anzeige'

// Shop-Verweise (Teil B, 18.11.2026): je Verweis eine schlanke Zeile „Linktext ↗ · Anzeige“, ohne
// Rahmen und Fläche. Die Verweise stehen in data/shopVerweise.js; gibt es für das Ziel keine,
// rendert die Komponente nichts. Mehrere Verweise (Spot-Reihe) stehen untereinander, jeder mit
// eigener Kennzeichnung.
//
// Nur reine Links — kein Skript, kein Bild, kein Vorladen. Vor einem Klick geht so keine Anfrage
// an awin1.com oder den Händler. rel="sponsored" kennzeichnet den Link als bezahlt für
// Suchmaschinen, noopener trennt den neuen Tab von Planixy.
//
// Klicks bleiben hier (stopPropagation): Die Zeilen stehen u. a. in einer anklickbaren Zeile
// (LichtSchritt.jsx), die sonst mitreagieren würde.
//
// Umbruch: Bei 681–860 px Fensterbreite bleiben im rechten Panel nur rund 110 px. Dort trennt
// index.css (.shop-verweise) lange Wörter nach Silben, sonst bräche „Schienensysteme“ mitten im
// Wort ohne Trennstrich um. overflowWrap: 'anywhere' ist nur das Netz für Wörter, die trotzdem
// nicht passen. „↗“ hängt mit geschütztem Leerzeichen am letzten Wort.
export default function ShopVerweise({ art, id }) {
  const verweise = shopVerweiseFuer(art, id)
  if (verweise.length === 0) return null

  return (
    <div className="shop-verweise" onClick={e => e.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', minWidth: 0 }}>
      {verweise.map(v => (
        <p key={v.url} style={{ margin: 0, fontSize: '12px', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
          <a href={v.url} target="_blank" rel="sponsored noopener" className="shop-verweis-link"
            style={{ fontSize: '12px', fontWeight: 500, color: AKZENT, textDecoration: 'none' }}>
            {v.text}&nbsp;↗
          </a>
          {' '}
          <Anzeige />
        </p>
      ))}
    </div>
  )
}
