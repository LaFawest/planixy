import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjekteListe } from '../context/ProjekteListeContext'
import { useAuth } from '../context/AuthContext'
import { PlanixyIcon } from './PlanixyLogo'
import GastBanner from './GastBanner'

// Suchfeld und Sortierung würden bei ein, zwei Projekten nur unnötig im Weg stehen — sie
// erscheinen erst ab dieser Anzahl, wenn Scannen der Kacheln allein umständlicher wird.
const MIND_PROJEKTE_FUER_STEUERUNG = 4

const SORTIERUNGEN = [
  { id: 'geaendert', label: 'Zuletzt geändert', vergleiche: (a, b) => new Date(b.geaendertAm) - new Date(a.geaendertAm) },
  { id: 'name', label: 'Name', vergleiche: (a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }) },
  { id: 'erstellt', label: 'Erstellungsdatum', vergleiche: (a, b) => new Date(b.erstelltAm) - new Date(a.erstelltAm) },
]

const tageSeit = (datumIso) => (Date.now() - new Date(datumIso).getTime()) / 86400000

// Zeitraum- und Raum-Filter fürs Dashboard (zusätzlich zur bestehenden Suche/Sortierung).
// Beide Gruppen sind je Einfachauswahl mit "Alle" als Grundzustand, kombinierbar miteinander.
const ZEITRAUM_FILTER = [
  { id: 'alle', label: 'Alle', passt: () => true },
  { id: 'heute', label: 'Heute', passt: p => tageSeit(p.geaendertAm) < 1 },
  { id: 'woche', label: 'Diese Woche', passt: p => tageSeit(p.geaendertAm) < 7 },
  { id: 'monat', label: 'Dieser Monat', passt: p => tageSeit(p.geaendertAm) < 30 },
  { id: 'aelter', label: 'Älter', passt: p => tageSeit(p.geaendertAm) >= 30 },
]

const RAUM_FILTER = [
  { id: 'alle', label: 'Alle', passt: () => true },
  { id: '1', label: '1', passt: p => p.raeume.length === 1 },
  { id: '2-3', label: '2–3', passt: p => p.raeume.length >= 2 && p.raeume.length <= 3 },
  { id: '4+', label: '4+', passt: p => p.raeume.length >= 4 },
]

const ALLE_BUCHSTABEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const formatiereRelativeZeit = (datumIso) => {
  const diffMs = Date.now() - new Date(datumIso).getTime()
  const minuten = Math.floor(diffMs / 60000)
  if (minuten < 1) return 'gerade eben'
  if (minuten < 60) return `vor ${minuten} Minute${minuten === 1 ? '' : 'n'}`
  const stunden = Math.floor(minuten / 60)
  if (stunden < 24) return `vor ${stunden} Stunde${stunden === 1 ? '' : 'n'}`
  const tage = Math.floor(stunden / 24)
  if (tage < 30) return `vor ${tage} Tag${tage === 1 ? '' : 'en'}`
  const monate = Math.floor(tage / 30)
  if (monate < 12) return `vor ${monate} Monat${monate === 1 ? '' : 'en'}`
  const jahre = Math.floor(monate / 12)
  return `vor ${jahre} Jahr${jahre === 1 ? '' : 'en'}`
}

function DialogGeruest({ onAbbrechen, children }) {
  return (
    <div onClick={onAbbrechen} style={{
      position: 'fixed', inset: 0, background: 'rgba(44,44,42,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: '16px', padding: '24px', width: '320px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        {children}
      </div>
    </div>
  )
}

function NamensDialog({ titel, anfangswert = '', bestaetigenLabel, onBestaetigen, onAbbrechen }) {
  const [name, setName] = useState(anfangswert)
  const bestaetigen = () => { if (name.trim()) onBestaetigen(name.trim()) }

  return (
    <DialogGeruest onAbbrechen={onAbbrechen}>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', marginBottom: '16px' }}>
        {titel}
      </p>
      <input
        autoFocus
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        onFocus={e => e.target.select()}
        onKeyDown={e => { if (e.key === 'Enter') bestaetigen(); if (e.key === 'Escape') onAbbrechen() }}
        placeholder="Projektname"
        style={{
          width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #E8E6E0', borderRadius: '10px',
          outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', boxSizing: 'border-box', marginBottom: '16px',
        }}
      />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onAbbrechen} style={{
          padding: '8px 16px', borderRadius: '10px', border: '1px solid #E8E6E0', background: 'white',
          color: '#888780', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          Abbrechen
        </button>
        <button onClick={bestaetigen} disabled={!name.trim()} style={{
          padding: '8px 16px', borderRadius: '10px', border: 'none',
          background: name.trim() ? '#2F4B39' : '#D3D1C7', color: 'white', fontSize: '13px', fontWeight: '500',
          cursor: name.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans', sans-serif",
        }}>
          {bestaetigenLabel}
        </button>
      </div>
    </DialogGeruest>
  )
}

function LoeschenDialog({ projektName, onBestaetigen, onAbbrechen }) {
  return (
    <DialogGeruest onAbbrechen={onAbbrechen}>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', marginBottom: '12px' }}>
        Projekt löschen?
      </p>
      <p style={{ fontSize: '13px', color: '#444441', lineHeight: 1.5, marginBottom: '20px' }}>
        „{projektName}" wird endgültig gelöscht. Das kann nicht rückgängig gemacht werden.
      </p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onAbbrechen} style={{
          padding: '8px 16px', borderRadius: '10px', border: '1px solid #E8E6E0', background: 'white',
          color: '#888780', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          Abbrechen
        </button>
        <button onClick={onBestaetigen} style={{
          padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#E24B4A', color: 'white',
          fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          Endgültig löschen
        </button>
      </div>
    </DialogGeruest>
  )
}

function FehlerDialog({ titel, meldung, onSchliessen }) {
  return (
    <DialogGeruest onAbbrechen={onSchliessen}>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', marginBottom: '12px' }}>
        {titel}
      </p>
      <p style={{ fontSize: '13px', color: '#444441', lineHeight: 1.5, marginBottom: '20px' }}>
        {meldung}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onSchliessen} style={{
          padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#2F4B39', color: 'white',
          fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          OK
        </button>
      </div>
    </DialogGeruest>
  )
}

function ImportButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px', background: 'white', color: '#444441', border: '1px solid #E4DED0', borderRadius: '10px',
      cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif",
    }}>
      Importieren
    </button>
  )
}

function KontoMenu({ user }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [offen, setOffen] = useState(false)
  const kuerzel = user.email?.slice(0, 2).toUpperCase()

  return (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOffen(o => !o)} title={user.email} style={{
        width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #E4DED0', background: '#EDF1EC',
        color: '#2F4B39', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
      }}>
        {kuerzel}
      </button>
      {offen && (
        <>
          <div onClick={() => setOffen(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
          <div style={{
            position: 'absolute', top: '44px', right: 0, background: 'white', border: '1px solid #E4DED0',
            borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 6, overflow: 'hidden', width: '220px',
          }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #F2EFE7' }}>
              <p style={{ fontSize: '11px', color: '#B4B2A9', marginBottom: '2px' }}>Angemeldet als</p>
              <p style={{ fontSize: '13px', color: '#2C2C2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
            </div>
            <div
              onClick={() => { setOffen(false); navigate('/einstellungen') }}
              style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', color: '#444441', fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F6F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Einstellungen
            </div>
            <div
              onClick={() => { setOffen(false); signOut() }}
              style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', color: '#E24B4A', fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={e => e.currentTarget.style.background = '#FCEBEB'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Abmelden
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function KachelMenu({ gruppen, gruppeAktuell, onGruppeAendern, onUmbenennen, onDuplizieren, onExportieren, onLoeschen }) {
  const [offen, setOffen] = useState(false)
  const [gruppenUntermenuOffen, setGruppenUntermenuOffen] = useState(false)
  const [neueGruppeName, setNeueGruppeName] = useState('')
  // Das Untermenü öffnet standardmäßig nach links (neben dem Hauptmenü). Bei Kacheln ganz links im
  // Raster (z.B. hinter der Sidebar) reicht der Platz dafür nicht — dann stattdessen nach rechts
  // öffnen. Wird beim Öffnen anhand der tatsächlichen Position auf dem Bildschirm entschieden.
  const [untermenuRechts, setUntermenuRechts] = useState(false)
  const wrapperRef = useRef(null)

  const schliesseAlles = () => { setOffen(false); setGruppenUntermenuOffen(false); setNeueGruppeName('') }

  const eintrag = (label, onClick, gefaehrlich) => (
    <div onClick={e => { e.stopPropagation(); schliesseAlles(); onClick() }} style={{
      padding: '9px 14px', fontSize: '13px', cursor: 'pointer', color: gefaehrlich ? '#E24B4A' : '#444441',
      fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => e.currentTarget.style.background = gefaehrlich ? '#FCEBEB' : '#F7F6F2'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {label}
    </div>
  )

  const gruppeWaehlen = (neueGruppe) => { schliesseAlles(); onGruppeAendern(neueGruppe) }

  const neueGruppeAnlegen = () => {
    const name = neueGruppeName.trim()
    if (name) gruppeWaehlen(name)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'absolute', top: '10px', right: '10px' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOffen(o => !o)} style={{
        width: '26px', height: '26px', borderRadius: '8px', border: 'none', background: offen ? 'white' : 'transparent',
        color: '#888780', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: offen ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', lineHeight: 1,
      }}>
        ⋮
      </button>
      {offen && (
        <>
          <div onClick={schliesseAlles} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
          <div style={{
            position: 'absolute', top: '30px', right: 0, background: 'white', border: '1px solid #E8E6E0',
            borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 6, overflow: 'hidden',
          }}>
            {eintrag('Umbenennen', onUmbenennen)}
            <div
              onClick={e => {
                e.stopPropagation()
                setGruppenUntermenuOffen(o => {
                  const wirdGeoeffnet = !o
                  if (wirdGeoeffnet) {
                    // In der Standard-Position (links vom Hauptmenü) läge die linke Kante des
                    // Untermenüs bei wrapper.right minus beide Menübreiten (je ~190px) — dazu noch
                    // etwas Sicherheitsabstand (deckt z.B. die Gruppen-Sidebar links im Dashboard
                    // ab). Reicht der Platz nicht, öffnet das Untermenü stattdessen nach rechts.
                    const NOETIGER_PLATZ_LINKS = 190 + 190 + 280
                    const wrapperRechts = wrapperRef.current?.getBoundingClientRect().right ?? NOETIGER_PLATZ_LINKS
                    setUntermenuRechts(wrapperRechts < NOETIGER_PLATZ_LINKS)
                  }
                  return wirdGeoeffnet
                })
              }}
              style={{
                padding: '9px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                background: gruppenUntermenuOffen ? '#F7F6F2' : 'transparent', fontWeight: gruppenUntermenuOffen ? '500' : '400',
                color: gruppenUntermenuOffen ? '#1F3327' : '#444441',
              }}
              onMouseEnter={e => { if (!gruppenUntermenuOffen) e.currentTarget.style.background = '#F7F6F2' }}
              onMouseLeave={e => { if (!gruppenUntermenuOffen) e.currentTarget.style.background = 'transparent' }}
            >
              Gruppe zuweisen ›
            </div>
            {eintrag('Duplizieren', onDuplizieren)}
            {eintrag('Exportieren', onExportieren)}
            <div style={{ height: '1px', background: '#EDEBE3', margin: '4px 0' }} />
            {eintrag('Löschen', onLoeschen, true)}
          </div>

          {gruppenUntermenuOffen && (
            <div onClick={e => e.stopPropagation()} style={{
              position: 'absolute', top: '30px', background: 'white', border: '1px solid #E8E6E0',
              borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 6, overflow: 'hidden', width: '190px', padding: '6px 0',
              // Rechts öffnen: an der (schmalen, nur button-breiten) Wrapper-Kante direkt anschließen
              // (100% statt fixem 190px, da das Hauptmenü hier links liegt statt rechts).
              ...(untermenuRechts ? { left: '100%' } : { right: '190px' }),
            }}>
              <div style={{ fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', color: '#B4B2A9', fontWeight: '600', padding: '8px 14px 4px' }}>
                Gruppe wählen
              </div>
              {[{ id: null, label: 'Ohne Gruppe' }, ...gruppen.map(g => ({ id: g, label: g }))].map(({ id, label }) => {
                const gewaehlt = (gruppeAktuell || null) === id
                return (
                  <div key={label} onClick={() => gruppeWaehlen(id)} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer',
                    color: gewaehlt ? '#1F3327' : '#444441', fontWeight: gewaehlt ? '500' : '400', fontFamily: "'DM Sans', sans-serif",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F7F6F2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, position: 'relative',
                      border: `1.6px solid ${gewaehlt ? '#2F4B39' : '#C7C3B6'}`,
                    }}>
                      {gewaehlt && <div style={{ position: 'absolute', inset: '2.5px', borderRadius: '50%', background: '#2F4B39' }} />}
                    </div>
                    {label}
                  </div>
                )
              })}
              <div style={{ height: '1px', background: '#EDEBE3', margin: '6px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px 8px' }}>
                <span style={{ color: '#2F4B39', fontSize: '15px', fontWeight: '700' }}>+</span>
                <input
                  value={neueGruppeName}
                  onChange={e => setNeueGruppeName(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => { if (e.key === 'Enter') neueGruppeAnlegen(); if (e.key === 'Escape') schliesseAlles() }}
                  placeholder="Neue Gruppe, z. B. Haus 3"
                  style={{
                    flex: 1, border: '1px solid #E4DED0', borderRadius: '7px', padding: '6px 9px', fontSize: '12px',
                    fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProjektKachel({ projekt, kartenRef, gruppen, onOeffnen, onUmbenennen, onDuplizieren, onExportieren, onLoeschen, onGruppeAendern }) {
  return (
    <div ref={kartenRef} onClick={onOeffnen} style={{
      position: 'relative', background: 'white', border: '1px solid #E4DED0', borderRadius: '14px', padding: '20px',
      cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#2F4B39'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(47,75,57,0.14)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4DED0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <KachelMenu
        gruppen={gruppen}
        gruppeAktuell={projekt.gruppe}
        onGruppeAendern={onGruppeAendern}
        onUmbenennen={onUmbenennen}
        onDuplizieren={onDuplizieren}
        onExportieren={onExportieren}
        onLoeschen={onLoeschen}
      />

      <div style={{
        width: '100%', aspectRatio: '4 / 3', background: '#F2E9D8', borderRadius: '10px', marginBottom: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '28px', opacity: 0.35 }}>🏠</span>
      </div>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '500', color: '#2C2C2A', marginBottom: '4px' }}>
        {projekt.name}
      </p>
      <p style={{ fontSize: '12px', color: '#888780', marginBottom: '2px' }}>
        {projekt.raeume.length} {projekt.raeume.length === 1 ? 'Raum' : 'Räume'}
      </p>
      <p style={{ fontSize: '11px', color: '#B4B2A9' }}>
        Geändert {formatiereRelativeZeit(projekt.geaendertAm)}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const { projekte, projekteLadeStatus, addProjekt, waehleProjekt, renameProjekt, deleteProjekt, duplicateProjekt, exportProjekt, importProjekt, updateProjekt } = useProjekteListe()
  const { user, ladeStatus, signOut } = useAuth()

  // Supabase meldet einen Nutzer über den Bestätigungslink in der Registrierungs-Mail technisch
  // automatisch an (Session steckt im URL-Fragment, #access_token=...&type=signup...) — das ist
  // bewusst NICHT gewünscht, der Nutzer soll sich danach aktiv mit E-Mail/Passwort einloggen.
  // Lazy-Initializer statt useEffect: muss den Hash VOR der automatischen Verarbeitung durch den
  // Supabase-Client lesen (der ihn danach selbst leert, siehe GoTrueClient _getSessionFromURL).
  const [geradeBestaetigt] = useState(() => typeof window !== 'undefined' && window.location.hash.includes('type=signup'))

  // Erst ausloggen, sobald die Auth-Initialisierung (inkl. des automatischen Logins aus obigem
  // Hash) durchgelaufen ist — vorher gäbe es noch gar keine Session zum Entfernen.
  useEffect(() => {
    if (geradeBestaetigt && !ladeStatus) signOut()
  }, [geradeBestaetigt, ladeStatus, signOut])

  // dialog: null | { typ: 'neu' } | { typ: 'umbenennen', projekt } | { typ: 'loeschen', projekt } | { typ: 'importFehler', meldung }
  const [dialog, setDialog] = useState(null)
  const schliessen = () => setDialog(null)
  const importInputRef = useRef(null)

  const [suchbegriff, setSuchbegriff] = useState('')
  const [sortierungId, setSortierungId] = useState(SORTIERUNGEN[0].id)
  const zeigeSteuerung = projekte.length >= MIND_PROJEKTE_FUER_STEUERUNG

  const [filterOffen, setFilterOffen] = useState(false)
  const [zeitraumFilterId, setZeitraumFilterId] = useState(ZEITRAUM_FILTER[0].id)
  const [raumFilterId, setRaumFilterId] = useState(RAUM_FILTER[0].id)
  const filterAktiv = zeitraumFilterId !== 'alle' || raumFilterId !== 'alle'

  // Gruppen: reines Textfeld am Projekt (projekt.gruppe), keine eigene Tabelle/Liste — die
  // Gruppenliste in der Sidebar ergibt sich einfach aus den tatsächlich vergebenen Namen.
  // aktiveGruppeRoh: null = "Alle Projekte", '__ohne__' = Sentinel für "Ohne Gruppe", sonst der Gruppenname.
  const [aktiveGruppeRoh, setAktiveGruppe] = useState(null)
  const gruppen = useMemo(() => {
    const menge = new Set()
    projekte.forEach(p => { if (p.gruppe) menge.add(p.gruppe) })
    return [...menge].sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }))
  }, [projekte])
  const hatUngruppierte = projekte.some(p => !p.gruppe)
  const zeigeSidebar = gruppen.length > 0

  // Fällt auf "Alle Projekte" zurück, sobald die gewählte Gruppe verschwindet (letztes Projekt
  // umgehängt/gelöscht) — als Ableitung statt als Effekt, sonst bliebe die Ansicht für einen
  // Render-Zyklus auf einer Gruppe hängen, die es in der Sidebar gar nicht mehr gibt.
  const aktiveGruppe = useMemo(() => {
    if (aktiveGruppeRoh === '__ohne__') return hatUngruppierte ? aktiveGruppeRoh : null
    if (aktiveGruppeRoh && !gruppen.includes(aktiveGruppeRoh)) return null
    return aktiveGruppeRoh
  }, [aktiveGruppeRoh, gruppen, hatUngruppierte])

  // A-Z-Sprungleiste: merkt sich Karten-DOM-Knoten je Projekt-ID, um beim Klick auf einen
  // Buchstaben dorthin zu scrollen. gewaehlterBuchstabe steuert nur die optische Markierung.
  const kartenRefs = useRef({})
  const [gewaehlterBuchstabe, setGewaehlterBuchstabe] = useState(null)

  // Sicherheitsnetz gegen Datenverlust (Anlass: versehentlich gelöschtes localStorage beim
  // Testen) — liest die gewählte Datei ein und importiert sie als neues Projekt. Fängt jeden
  // Fehler aus parseProjektDatei (kaputtes JSON, fremde/unvollständige Struktur) ab und zeigt ihn
  // an, statt die App abstürzen zu lassen. e.target.value wird zurückgesetzt, damit dieselbe
  // Datei danach erneut ausgewählt werden kann (sonst feuert onChange beim zweiten Mal nicht).
  const importiereDatei = async (e) => {
    const datei = e.target.files[0]
    e.target.value = ''
    if (!datei) return
    try {
      importProjekt(await datei.text())
    } catch (err) {
      setDialog({ typ: 'importFehler', meldung: err.message })
    }
  }

  const sichtbareProjekte = useMemo(() => {
    const suche = suchbegriff.trim().toLowerCase()
    let gefiltert = suche ? projekte.filter(p => p.name.toLowerCase().includes(suche)) : projekte
    if (aktiveGruppe === '__ohne__') gefiltert = gefiltert.filter(p => !p.gruppe)
    else if (aktiveGruppe) gefiltert = gefiltert.filter(p => p.gruppe === aktiveGruppe)
    const zeitraumPasst = ZEITRAUM_FILTER.find(z => z.id === zeitraumFilterId).passt
    const raumPasst = RAUM_FILTER.find(r => r.id === raumFilterId).passt
    gefiltert = gefiltert.filter(p => zeitraumPasst(p) && raumPasst(p))
    const vergleiche = SORTIERUNGEN.find(s => s.id === sortierungId).vergleiche
    return [...gefiltert].sort(vergleiche)
  }, [projekte, suchbegriff, sortierungId, zeitraumFilterId, raumFilterId, aktiveGruppe])

  // Nur Anfangsbuchstaben, zu denen es gerade (nach Suche/Filter) auch eine Karte gibt, sind in
  // der Sprungleiste anklickbar — der Rest wird ausgegraut dargestellt.
  const vorhandeneBuchstaben = useMemo(() => {
    const menge = new Set()
    sichtbareProjekte.forEach(p => {
      const buchstabe = p.name.trim()[0]
      if (buchstabe) menge.add(buchstabe.toUpperCase())
    })
    return menge
  }, [sichtbareProjekte])

  const springeZuBuchstabe = (buchstabe) => {
    setGewaehlterBuchstabe(buchstabe)
    // Springen ergibt nur alphabetisch sortiert einen Sinn — sonst läge das Ziel ggf. weiter
    // unten als erwartet. Der Scroll selbst passiert im Effekt unten, sobald neu sortiert ist.
    if (sortierungId !== 'name') setSortierungId('name')
  }

  useEffect(() => {
    if (!gewaehlterBuchstabe) return
    const treffer = sichtbareProjekte.find(p => p.name.trim()[0]?.toUpperCase() === gewaehlterBuchstabe)
    kartenRefs.current[treffer?.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [gewaehlterBuchstabe, sichtbareProjekte])

  const gruppenTitel = aktiveGruppe === '__ohne__' ? 'Ohne Gruppe' : aktiveGruppe
  const gruppenUntertitel = aktiveGruppe ? `${sichtbareProjekte.length} ${sichtbareProjekte.length === 1 ? 'Projekt' : 'Projekte'} in dieser Gruppe` : 'Deine Projekte'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>
      <input ref={importInputRef} type="file" accept=".json,application/json" onChange={importiereDatei} style={{ display: 'none' }} />

      {zeigeSidebar && (
        <div style={{ width: '200px', flexShrink: 0, background: 'white', borderRight: '1px solid #E4DED0', padding: '40px 14px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', color: '#B4B2A9', fontWeight: '600', padding: '0 12px 6px' }}>
            Projekte
          </div>
          <div onClick={() => setAktiveGruppe(null)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '9px 12px',
            borderRadius: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '2px',
            background: aktiveGruppe === null ? '#EDF1EC' : 'transparent',
            color: aktiveGruppe === null ? '#1F3327' : '#444441', fontWeight: aktiveGruppe === null ? '500' : '400',
          }}>
            <span>Alle Projekte</span>
            <span style={{ fontSize: '11px', color: aktiveGruppe === null ? '#2F4B39' : '#B4B2A9' }}>{projekte.length}</span>
          </div>
          <div style={{ fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', color: '#B4B2A9', fontWeight: '600', padding: '18px 12px 6px' }}>
            Gruppen
          </div>
          {gruppen.map(g => (
            <div key={g} onClick={() => setAktiveGruppe(g)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '9px 12px',
              borderRadius: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '2px',
              background: aktiveGruppe === g ? '#EDF1EC' : 'transparent',
              color: aktiveGruppe === g ? '#1F3327' : '#444441', fontWeight: aktiveGruppe === g ? '500' : '400',
            }}>
              <span>{g}</span>
              <span style={{ fontSize: '11px', color: aktiveGruppe === g ? '#2F4B39' : '#B4B2A9' }}>{projekte.filter(p => p.gruppe === g).length}</span>
            </div>
          ))}
          {hatUngruppierte && (
            <div onClick={() => setAktiveGruppe('__ohne__')} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '9px 12px',
              borderRadius: '8px', fontSize: '13px', cursor: 'pointer', marginBottom: '2px',
              background: aktiveGruppe === '__ohne__' ? '#EDF1EC' : 'transparent',
              color: aktiveGruppe === '__ohne__' ? '#1F3327' : '#444441', fontWeight: aktiveGruppe === '__ohne__' ? '500' : '400',
            }}>
              <span>Ohne Gruppe</span>
              <span style={{ fontSize: '11px', color: aktiveGruppe === '__ohne__' ? '#2F4B39' : '#B4B2A9' }}>{projekte.filter(p => !p.gruppe).length}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, padding: '40px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlanixyIcon size={30} />
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '500', color: '#1F3327' }}>{gruppenTitel || 'Planixy'}</h1>
          </div>
          <p style={{ fontSize: '13px', color: '#B4B2A9', marginTop: '2px' }}>{gruppenUntertitel}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ImportButton onClick={() => importInputRef.current.click()} />
          <button onClick={() => setDialog({ typ: 'neu' })} style={{
            padding: '10px 20px', background: '#2F4B39', color: 'white', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif",
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#1F3327'}
            onMouseLeave={e => e.currentTarget.style.background = '#2F4B39'}
          >
            + Neues Projekt
          </button>
          {user && <KontoMenu user={user} />}
        </div>
      </div>

      <GastBanner bestaetigt={geradeBestaetigt} />

      {zeigeSteuerung && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={suchbegriff}
            onChange={e => setSuchbegriff(e.target.value)}
            placeholder="Projekt suchen…"
            style={{
              flex: '1 1 220px', padding: '9px 14px', fontSize: '13px', border: '1px solid #E4DED0', borderRadius: '10px',
              outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', background: 'white',
            }}
          />
          <select
            value={sortierungId}
            onChange={e => setSortierungId(e.target.value)}
            style={{
              padding: '9px 14px', fontSize: '13px', border: '1px solid #E4DED0', borderRadius: '10px',
              outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#444441', background: 'white', cursor: 'pointer',
            }}
          >
            {SORTIERUNGEN.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button onClick={() => setFilterOffen(o => !o)} style={{
            display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 14px', fontSize: '13px', fontWeight: '500',
            borderRadius: '10px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", position: 'relative',
            background: filterOffen ? '#2F4B39' : 'white', color: filterOffen ? 'white' : '#444441',
            border: `1px solid ${filterOffen ? '#2F4B39' : '#E4DED0'}`,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={filterOffen ? 'white' : '#444441'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="4 4 20 4 14 13 14 20 10 20 10 13 4 4" />
            </svg>
            Filter
            {filterAktiv && (
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%', background: '#C9A66B', position: 'absolute', top: '7px', right: '7px',
                boxShadow: `0 0 0 2px ${filterOffen ? '#2F4B39' : 'white'}`,
              }} />
            )}
          </button>
        </div>
      )}

      {zeigeSteuerung && filterOffen && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '28px', padding: '16px 18px', marginBottom: '24px',
          background: 'white', border: '1px solid #E4DED0', borderRadius: '12px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', color: '#B4B2A9', fontWeight: '600' }}>
              Zeitraum
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ZEITRAUM_FILTER.map(z => (
                <div key={z.id} onClick={() => setZeitraumFilterId(z.id)} style={{
                  padding: '6px 13px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  border: `1px solid ${z.id === zeitraumFilterId ? '#2F4B39' : '#E4DED0'}`,
                  background: z.id === zeitraumFilterId ? '#2F4B39' : 'white',
                  color: z.id === zeitraumFilterId ? 'white' : '#444441',
                  fontWeight: z.id === zeitraumFilterId ? '500' : '400',
                }}>
                  {z.label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: '#EDE9DD' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', color: '#B4B2A9', fontWeight: '600' }}>
              Räume
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {RAUM_FILTER.map(r => (
                <div key={r.id} onClick={() => setRaumFilterId(r.id)} style={{
                  padding: '6px 13px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  border: `1px solid ${r.id === raumFilterId ? '#2F4B39' : '#E4DED0'}`,
                  background: r.id === raumFilterId ? '#2F4B39' : 'white',
                  color: r.id === raumFilterId ? 'white' : '#444441',
                  fontWeight: r.id === raumFilterId ? '500' : '400',
                }}>
                  {r.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {projekteLadeStatus && projekte.length === 0 ? (
        // Kurzes Ladefenster (Auth-Status bzw. Supabase-Fetch) — sonst würde hier kurz "Noch kein
        // Projekt angelegt" aufblitzen, bevor die echten Projekte eines eingeloggten Nutzers da sind.
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#B4B2A9' }}>Lädt…</p>
        </div>
      ) : projekte.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 20px', textAlign: 'center',
        }}>
          <span style={{ fontSize: '40px', marginBottom: '16px' }}>🏡</span>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '500', color: '#2C2C2A', marginBottom: '8px' }}>
            Noch kein Projekt angelegt
          </p>
          <p style={{ fontSize: '13px', color: '#888780', marginBottom: '24px', maxWidth: '360px' }}>
            Leg dein erstes Projekt an, um mit der Raumplanung zu beginnen — oder stelle eine zuvor exportierte Sicherung wieder her.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setDialog({ typ: 'neu' })} style={{
              padding: '10px 20px', background: '#2F4B39', color: 'white', border: 'none', borderRadius: '10px',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif",
            }}>
              + Neues Projekt
            </button>
            <ImportButton onClick={() => importInputRef.current.click()} />
          </div>
        </div>
      ) : sichtbareProjekte.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 20px', textAlign: 'center',
        }}>
          <span style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</span>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '500', color: '#2C2C2A', marginBottom: '8px' }}>
            Kein Projekt gefunden
          </p>
          <p style={{ fontSize: '13px', color: '#888780', maxWidth: '360px' }}>
            {suchbegriff ? `Für „${suchbegriff}" gibt es keine Treffer.`
              : filterAktiv ? 'Für diese Filter gibt es keine Treffer.'
              : aktiveGruppe ? 'Diese Gruppe enthält aktuell keine Projekte.'
              : 'Für diese Filter gibt es keine Treffer.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', alignContent: 'start' }}>
            {sichtbareProjekte.map(projekt => (
              <ProjektKachel
                key={projekt.id}
                projekt={projekt}
                kartenRef={el => { kartenRefs.current[projekt.id] = el }}
                gruppen={gruppen}
                onOeffnen={() => waehleProjekt(projekt.id)}
                onUmbenennen={() => setDialog({ typ: 'umbenennen', projekt })}
                onDuplizieren={() => duplicateProjekt(projekt.id)}
                onExportieren={() => exportProjekt(projekt.id)}
                onLoeschen={() => setDialog({ typ: 'loeschen', projekt })}
                onGruppeAendern={(neueGruppe) => updateProjekt(projekt.id, { gruppe: neueGruppe })}
              />
            ))}
          </div>

          {zeigeSteuerung && (
            <div style={{ flexShrink: 0, width: '26px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', paddingTop: '4px' }}>
              {ALLE_BUCHSTABEN.map(buchstabe => {
                const aktiv = vorhandeneBuchstaben.has(buchstabe)
                const gewaehlt = gewaehlterBuchstabe === buchstabe
                return (
                  <div
                    key={buchstabe}
                    onClick={aktiv ? () => springeZuBuchstabe(buchstabe) : undefined}
                    style={{
                      fontSize: '10px', fontWeight: '600', width: '20px', height: '17px', lineHeight: '17px',
                      textAlign: 'center', borderRadius: '5px',
                      color: gewaehlt ? 'white' : aktiv ? '#2F4B39' : '#DCD8CB',
                      background: gewaehlt ? '#2F4B39' : 'transparent',
                      cursor: aktiv ? 'pointer' : 'default',
                    }}
                  >
                    {buchstabe}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {dialog?.typ === 'neu' && (
        <NamensDialog
          titel="Neues Projekt"
          bestaetigenLabel="Erstellen"
          onBestaetigen={(name) => { addProjekt(name); schliessen() }}
          onAbbrechen={schliessen}
        />
      )}

      {dialog?.typ === 'umbenennen' && (
        <NamensDialog
          titel="Projekt umbenennen"
          anfangswert={dialog.projekt.name}
          bestaetigenLabel="Speichern"
          onBestaetigen={(name) => { renameProjekt(dialog.projekt.id, name); schliessen() }}
          onAbbrechen={schliessen}
        />
      )}

      {dialog?.typ === 'loeschen' && (
        <LoeschenDialog
          projektName={dialog.projekt.name}
          onBestaetigen={() => { deleteProjekt(dialog.projekt.id); schliessen() }}
          onAbbrechen={schliessen}
        />
      )}

      {dialog?.typ === 'importFehler' && (
        <FehlerDialog
          titel="Import fehlgeschlagen"
          meldung={dialog.meldung}
          onSchliessen={schliessen}
        />
      )}
      </div>
    </div>
  )
}
