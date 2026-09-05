import { useState } from 'react'
import { kategorieFarben } from '../constants'
import { moebelIconTyp, moebelShapes } from '../moebelIcons'
import { formatPreis } from '../data/produktAuswahl'

function MoebelIcon({ item }) {
  const typ = moebelIconTyp(item.name)
  const shapes = moebelShapes(item.color, item.border)
  return (
    <svg viewBox="0 0 28 28" width="28" height="28">
      {shapes[typ] || shapes.standard}
    </svg>
  )
}

// Zeigt das echte Amazon-Produktfoto (item.produkt.bild), fällt aber sauber auf das bisherige
// generische Icon zurück statt ein kaputtes Bild-Symbol zu zeigen, falls die Bild-URL mal nicht
// lädt (onError statt vorab prüfen — Bild-URLs zeigen auf Amazon-CDN, nicht selbst gehostet).
function KatalogFoto({ item }) {
  const [fehler, setFehler] = useState(false)
  if (fehler) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MoebelIcon item={item} />
      </div>
    )
  }
  return (
    <img src={item.produkt.bild} alt={item.name} loading="lazy" onError={() => setFehler(true)}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  )
}

export function KatalogKarte({ item, onClick }) {
  if (item.typ) {
    return (
      <div onClick={onClick}
        style={{ padding: '10px 6px', border: '1px solid #E8E6E0', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', fontSize: '11px', color: '#444441', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = item.typ === 'fenster' ? '#185FA5' : '#BA7517'; e.currentTarget.style.background = item.typ === 'fenster' ? '#EEF4FC' : '#FFF8E6' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#FAFAF8' }}>
        <div style={{ width: '36px', height: '14px', background: item.color, border: `2px solid ${item.border}`, borderRadius: '3px', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {item.typ === 'fenster' ? <div style={{ width: '60%', height: '2px', background: item.border, opacity: 0.5 }}></div> : <div style={{ width: '40%', height: '40%', border: `1px solid ${item.border}`, borderRadius: '0 50% 0 0', opacity: 0.6 }}></div>}
        </div>
        <div style={{ fontWeight: '500' }}>{item.name}</div>
        <div style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: item.typ === 'fenster' ? '#E6F1FB' : '#FFF8E6', color: item.typ === 'fenster' ? '#185FA5' : '#BA7517', display: 'inline-block' }}>
          {item.typ === 'fenster' ? 'Fenster' : 'Tür'}
        </div>
      </div>
    )
  }

  const produkt = item.produkt
  // Manche echten Produkte haben (noch) keine erfasste Bild-URL (bild: fehlt komplett) — dafür
  // reicht der onError-Fallback in KatalogFoto nicht: ein <img> ohne src lädt nie und feuert nie
  // ein error-Event, würde also dauerhaft das kaputte Browser-Platzhaltersymbol zeigen statt des
  // Icons. Deshalb hier schon vorab prüfen statt erst beim Ladefehler.
  const hatFoto = Boolean(produkt?.bild)

  return (
    <div onClick={onClick}
      style={{ padding: '10px 6px', border: '1px solid #E8E6E0', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8', fontSize: '11px', color: '#444441', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.background = '#EEF4FC' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.background = '#FAFAF8' }}>
      <div style={{ width: '44px', height: '44px', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: hatFoto ? '#FFFFFF' : 'transparent', border: hatFoto ? '1px solid #F0EFEA' : 'none', borderRadius: '6px', overflow: 'hidden' }}>
        {hatFoto ? <KatalogFoto item={item} /> : <MoebelIcon item={item} />}
      </div>
      <div style={{ fontWeight: '500' }}>{item.name}</div>
      {produkt ? (
        <>
          {produkt.marke && (
            <div style={{ marginTop: '2px', fontSize: '9px', color: '#B4B2A9', textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {produkt.marke}
            </div>
          )}
          <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '10px', background: '#EEF4FC', color: '#185FA5', display: 'inline-block' }}>
            {formatPreis(produkt.preis)}
          </div>
        </>
      ) : (
        <div style={{ marginTop: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: kategorieFarben[item.kategorie]?.bg, color: kategorieFarben[item.kategorie]?.color, display: 'inline-block' }}>{item.kategorie}</div>
      )}
    </div>
  )
}
