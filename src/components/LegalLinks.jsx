import { useEinwilligung } from '../context/EinwilligungContext'

const LINKS = [
  { label: 'Impressum', href: 'https://planixy.app/impressum' },
  { label: 'Datenschutz', href: 'https://planixy.app/datenschutz' },
  { label: 'Nutzungsbedingungen', href: 'https://planixy.app/nutzungsbedingungen' },
]

// Rechtstexte liegen im Landingpage-Repo (planixy.app), nicht hier — sonst laufen zwei Kopien
// desselben Textes auseinander. Diese Links müssen laut § 5 DDG von jeder Seite der App aus
// erreichbar sein, siehe Verwendungsstellen (Sidebar, Dashboard, Einstellungen, Zusammenfassung, MobileNav).
// "Cookie-Einstellungen" steht bewusst in derselben Zeile und im selben Stil: Die Einwilligung muss
// jederzeit genauso einfach widerrufbar sein, wie sie erteilt wurde — und diese Zeile ist die
// einzige Stelle, die wirklich überall in der App auftaucht.
export default function LegalLinks({ style }) {
  const { oeffneEinstellungen } = useEinwilligung()
  return (
    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', ...style }}>
      {LINKS.map(link => (
        <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '11px', color: '#B4B2A9', textDecoration: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#888780' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#B4B2A9' }}>
          {link.label}
        </a>
      ))}
      <button type="button" onClick={oeffneEinstellungen}
        style={{ fontSize: '11px', color: '#B4B2A9', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#888780' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#B4B2A9' }}>
        Cookie-Einstellungen
      </button>
    </div>
  )
}
