import { moebelIconTyp, moebelShapes } from '../moebelIcons'
import { AKZENT, AKZENT_HELL } from '../farben'

// Eine Produktkarte mit festem Fotoplatz (Katalog-Umbau Teil 4, 17.11.2026). Gemeinsam genutzt von
// der Produktwahl beim Einfügen (ProduktWahl.jsx) und beim Wechseln (ProduktPanel.jsx).
//
// produkt hat die Form aus produktFuerKatalog (data/bauarten.js). farbe und kante sind die schon
// aufgelöste Produktfarbe für das Symbol im Fotoplatz.
//
// Fotos: Solange ein Produkt kein eigenes Bild hat, zeigt der Fotoplatz das Symbol in der
// Produktfarbe und „Foto folgt“. Angezeigt werden nur Bilder vom eigenen Server (Pfad mit "/"
// am Anfang). Ein Bild von einem fremden Server würde die IP-Adresse jedes Besuchers dorthin
// übertragen; ob und wie das für Händler-Bilder geht, wird entschieden, wenn die ersten kommen.

const HAENDLER_NAMEN = { amazon: 'Amazon' }

const cm = (wert) => wert.toLocaleString('de-DE', { maximumFractionDigits: 1 })

export default function ProduktKarte({ produkt, bauart, farbe, kante, aktiv = false, onWaehlen }) {
  const typ = moebelIconTyp(bauart)
  const shapes = moebelShapes(farbe, kante)
  const eigenesBild = typeof produkt.bildUrl === 'string' && produkt.bildUrl.startsWith('/')
  const { breiteCm: b, tiefeCm: t, hoeheCm: h } = produkt
  const masse = b != null && t != null && h != null ? `${cm(b)} × ${cm(t)} × ${cm(h)} cm` : null
  const haendlerName = HAENDLER_NAMEN[produkt.haendler] || produkt.haendler

  return (
    <div role="button" tabIndex={0} aria-pressed={aktiv}
      aria-label={`${produkt.titel}${masse ? `, ${masse}` : ''}`}
      onClick={onWaehlen}
      onKeyDown={e => {
        // Nur die Karte selbst, nicht der Händler-Link darin.
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onWaehlen?.() }
      }}
      style={{
        display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', borderRadius: '10px', cursor: 'pointer',
        border: aktiv ? `2px solid ${AKZENT}` : '1px solid #E8E6E0',
        background: aktiv ? AKZENT_HELL : 'white',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { if (!aktiv) e.currentTarget.style.borderColor = AKZENT }}
      onMouseLeave={e => { if (!aktiv) e.currentTarget.style.borderColor = '#E8E6E0' }}>
      <div style={{
        width: '100%', aspectRatio: '4 / 3', borderRadius: '6px', background: '#F7F6F2', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
      }}>
        {eigenesBild ? (
          <img src={produkt.bildUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <>
            <svg viewBox="0 0 28 28" width="36" height="36" aria-hidden="true">
              {shapes[typ] || shapes.standard}
            </svg>
            <span style={{ fontSize: '10px', color: '#B4B2A9' }}>Foto folgt</span>
          </>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        {produkt.hersteller && (
          <div style={{ fontSize: '10px', color: '#B4B2A9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {produkt.hersteller}
          </div>
        )}
        <div title={produkt.titel} style={{ fontSize: '11px', color: '#444441', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {produkt.titel}
        </div>
        {masse && <div style={{ fontSize: '10px', color: '#888780', marginTop: '2px' }}>{masse}</div>}
        {produkt.link && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
            <a href={produkt.link} target="_blank" rel="noopener noreferrer sponsored" onClick={e => e.stopPropagation()}
              style={{ fontSize: '10px', color: AKZENT, textDecoration: 'none' }}>
              {haendlerName ? `${haendlerName} ↗` : 'Zum Händler ↗'}
            </a>
            <span style={{ fontSize: '10px', color: '#B4B2A9' }}>Anzeige</span>
          </div>
        )}
      </div>
    </div>
  )
}
