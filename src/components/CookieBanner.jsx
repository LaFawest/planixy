import { useState } from 'react'
import { useEinwilligung } from '../context/EinwilligungContext'

// Cookie-Banner (Phase 6 — Rechtliches). Erscheint, solange keine Entscheidung gespeichert ist,
// und erneut, wenn jemand die Einstellungen über den Link in den Rechtstexten wieder öffnet.
// Bewusst eine Leiste am unteren Rand statt eines bildschirmfüllenden Dialogs: Es werden ohnehin
// erst nach einer Entscheidung nicht-notwendige Dienste geladen, die Seite muss also nicht
// blockiert werden.
// WICHTIG für die Rechtslage: "Alle akzeptieren" und "Nur notwendige" sind absichtlich gleich
// gestaltet (gleiche Größe, gleicher Kontrast). Eine hervorgehobene Zustimmung neben einer blassen
// Ablehnung gilt in Deutschland als unzulässiges Dark Pattern.
export default function CookieBanner() {
  const { bannerSichtbar } = useEinwilligung()
  if (!bannerSichtbar) return null
  // Der Inhalt wird bei jedem Öffnen neu eingehängt, damit die Häkchen aus der aktuell
  // gespeicherten Einwilligung starten — sonst zeigte ein erneutes Öffnen den Stand vom
  // allerersten Seitenaufruf.
  return <BannerInhalt />
}

function BannerInhalt() {
  const { erneutGeoeffnet, einwilligung, speichereEinwilligung } = useEinwilligung()
  // Beim erneuten Öffnen gleich die Kategorien zeigen: Wer über "Cookie-Einstellungen" kommt,
  // will seine Auswahl sehen oder ändern.
  const [detailsOffen, setDetailsOffen] = useState(erneutGeoeffnet)
  const [statistik, setStatistik] = useState(!!einwilligung?.statistik)
  const [marketing, setMarketing] = useState(!!einwilligung?.marketing)

  const knopfBasis = {
    padding: '10px 18px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", border: '1px solid #2F4B39', flex: '1 1 auto', minWidth: '150px',
  }

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9000,
      background: '#FFFFFF', borderTop: '1px solid #E8E6E0', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
      padding: '18px 20px', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A',
      maxHeight: '80vh', overflowY: 'auto',
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', margin: '0 0 8px' }}>
          Datenschutz-Einstellungen
        </h2>
        <p style={{ fontSize: '13px', lineHeight: 1.55, margin: '0 0 14px', color: '#444441' }}>
          Planixy speichert nur das, was für den Betrieb nötig ist — deine Anmeldung und deine
          Raumplanungen. Statistik- und Marketing-Funktionen sind derzeit nicht im Einsatz; wenn sie
          später dazukommen, werden sie nur mit deiner Zustimmung geladen. Mehr dazu in der{' '}
          <a href="https://planixy.app/datenschutz" target="_blank" rel="noopener noreferrer"
            style={{ color: '#2F4B39', textDecoration: 'underline' }}>Datenschutzerklärung</a>.
        </p>

        {detailsOffen && (
          <div style={{ border: '1px solid #E8E6E0', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', background: '#FAFAF8' }}>
            <KategorieZeile
              titel="Notwendig"
              beschreibung="Anmeldung, gespeicherte Projekte und Grundeinstellungen. Ohne diese Speicherung funktioniert die App nicht — sie ist deshalb nicht abwählbar."
              an={true}
              fest
            />
            <KategorieZeile
              titel="Statistik"
              beschreibung="Anonyme Auswertung, welche Bereiche der App genutzt werden, um sie zu verbessern. Derzeit nicht im Einsatz."
              an={statistik}
              onChange={setStatistik}
            />
            <KategorieZeile
              titel="Marketing"
              beschreibung="Messung von Empfehlungslinks zu Möbelshops, damit eine Vermittlung zugeordnet werden kann. Derzeit nicht im Einsatz."
              an={marketing}
              onChange={setMarketing}
              letzte
            />
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => speichereEinwilligung(false, false)}
            style={{ ...knopfBasis, background: 'white', color: '#2F4B39' }}>
            Nur notwendige
          </button>
          <button onClick={() => speichereEinwilligung(true, true)}
            style={{ ...knopfBasis, background: '#2F4B39', color: '#F2E9D8' }}>
            Alle akzeptieren
          </button>
          {detailsOffen ? (
            <button onClick={() => speichereEinwilligung(statistik, marketing)}
              style={{ ...knopfBasis, background: 'white', color: '#2F4B39' }}>
              Auswahl speichern
            </button>
          ) : (
            <button onClick={() => setDetailsOffen(true)}
              style={{ ...knopfBasis, background: 'white', color: '#2F4B39', borderColor: '#D3D1C7' }}>
              Einstellungen
            </button>
          )}
        </div>

        {erneutGeoeffnet && einwilligung && (
          <p style={{ fontSize: '11px', color: '#B4B2A9', margin: '10px 0 0' }}>
            Zuletzt gespeichert am {new Date(einwilligung.zeitpunkt).toLocaleDateString('de-DE')}.
          </p>
        )}
      </div>
    </div>
  )
}

function KategorieZeile({ titel, beschreibung, an, onChange, fest, letzte }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: letzte ? 'none' : '1px solid #E8E6E0' }}>
      <input type="checkbox" checked={an} disabled={!!fest} onChange={e => onChange?.(e.target.checked)}
        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#2F4B39', cursor: fest ? 'not-allowed' : 'pointer' }} />
      <div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#2C2C2A' }}>
          {titel}{fest && <span style={{ fontSize: '11px', color: '#B4B2A9', fontWeight: '400' }}> — immer aktiv</span>}
        </div>
        <div style={{ fontSize: '12px', color: '#666661', lineHeight: 1.45 }}>{beschreibung}</div>
      </div>
    </div>
  )
}
