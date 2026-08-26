import { useMemo, useRef, useState } from 'react'
import { useProjekteListe } from '../context/ProjekteListeContext'

// Suchfeld und Sortierung würden bei ein, zwei Projekten nur unnötig im Weg stehen — sie
// erscheinen erst ab dieser Anzahl, wenn Scannen der Kacheln allein umständlicher wird.
const MIND_PROJEKTE_FUER_STEUERUNG = 4

const SORTIERUNGEN = [
  { id: 'geaendert', label: 'Zuletzt geändert', vergleiche: (a, b) => new Date(b.geaendertAm) - new Date(a.geaendertAm) },
  { id: 'name', label: 'Name', vergleiche: (a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }) },
  { id: 'erstellt', label: 'Erstellungsdatum', vergleiche: (a, b) => new Date(b.erstelltAm) - new Date(a.erstelltAm) },
]

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
          background: name.trim() ? '#185FA5' : '#D3D1C7', color: 'white', fontSize: '13px', fontWeight: '500',
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
          padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#185FA5', color: 'white',
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
      padding: '10px 20px', background: 'white', color: '#444441', border: '1px solid #E8E6E0', borderRadius: '10px',
      cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif",
    }}>
      Importieren
    </button>
  )
}

function KachelMenu({ onUmbenennen, onDuplizieren, onExportieren, onLoeschen }) {
  const [offen, setOffen] = useState(false)

  const eintrag = (label, onClick, gefaehrlich) => (
    <div onClick={e => { e.stopPropagation(); setOffen(false); onClick() }} style={{
      padding: '9px 14px', fontSize: '13px', cursor: 'pointer', color: gefaehrlich ? '#E24B4A' : '#444441',
      fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => e.currentTarget.style.background = gefaehrlich ? '#FCEBEB' : '#F7F6F2'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {label}
    </div>
  )

  return (
    <div style={{ position: 'absolute', top: '10px', right: '10px' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOffen(o => !o)} style={{
        width: '26px', height: '26px', borderRadius: '8px', border: 'none', background: offen ? 'white' : 'transparent',
        color: '#888780', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: offen ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', lineHeight: 1,
      }}>
        ⋮
      </button>
      {offen && (
        <>
          <div onClick={() => setOffen(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
          <div style={{
            position: 'absolute', top: '30px', right: 0, background: 'white', border: '1px solid #E8E6E0',
            borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 6, overflow: 'hidden',
          }}>
            {eintrag('Umbenennen', onUmbenennen)}
            {eintrag('Duplizieren', onDuplizieren)}
            {eintrag('Exportieren', onExportieren)}
            {eintrag('Löschen', onLoeschen, true)}
          </div>
        </>
      )}
    </div>
  )
}

function ProjektKachel({ projekt, onOeffnen, onUmbenennen, onDuplizieren, onExportieren, onLoeschen }) {
  return (
    <div onClick={onOeffnen} style={{
      position: 'relative', background: 'white', border: '1px solid #E8E6E0', borderRadius: '14px', padding: '20px',
      cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(24,95,165,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E6E0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <KachelMenu onUmbenennen={onUmbenennen} onDuplizieren={onDuplizieren} onExportieren={onExportieren} onLoeschen={onLoeschen} />

      <div style={{
        width: '100%', aspectRatio: '4 / 3', background: '#F7F6F2', borderRadius: '10px', marginBottom: '14px',
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
  const { projekte, projekteLadeStatus, addProjekt, waehleProjekt, renameProjekt, deleteProjekt, duplicateProjekt, exportProjekt, importProjekt } = useProjekteListe()
  // dialog: null | { typ: 'neu' } | { typ: 'umbenennen', projekt } | { typ: 'loeschen', projekt } | { typ: 'importFehler', meldung }
  const [dialog, setDialog] = useState(null)
  const schliessen = () => setDialog(null)
  const importInputRef = useRef(null)

  const [suchbegriff, setSuchbegriff] = useState('')
  const [sortierungId, setSortierungId] = useState(SORTIERUNGEN[0].id)
  const zeigeSteuerung = projekte.length >= MIND_PROJEKTE_FUER_STEUERUNG

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
    const gefiltert = suche ? projekte.filter(p => p.name.toLowerCase().includes(suche)) : projekte
    const vergleiche = SORTIERUNGEN.find(s => s.id === sortierungId).vergleiche
    return [...gefiltert].sort(vergleiche)
  }, [projekte, suchbegriff, sortierungId])

  return (
    <div style={{ minHeight: '100vh', padding: '40px 48px', fontFamily: "'DM Sans', sans-serif" }}>
      <input ref={importInputRef} type="file" accept=".json,application/json" onChange={importiereDatei} style={{ display: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '500', color: '#2C2C2A' }}>Planixy</h1>
          <p style={{ fontSize: '13px', color: '#B4B2A9', marginTop: '2px' }}>Deine Projekte</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ImportButton onClick={() => importInputRef.current.click()} />
          <button onClick={() => setDialog({ typ: 'neu' })} style={{
            padding: '10px 20px', background: '#185FA5', color: 'white', border: 'none', borderRadius: '10px',
            cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif",
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#0C447C'}
            onMouseLeave={e => e.currentTarget.style.background = '#185FA5'}
          >
            + Neues Projekt
          </button>
        </div>
      </div>

      {zeigeSteuerung && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={suchbegriff}
            onChange={e => setSuchbegriff(e.target.value)}
            placeholder="Projekt suchen…"
            style={{
              flex: '1 1 220px', padding: '9px 14px', fontSize: '13px', border: '1px solid #E8E6E0', borderRadius: '10px',
              outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', background: 'white',
            }}
          />
          <select
            value={sortierungId}
            onChange={e => setSortierungId(e.target.value)}
            style={{
              padding: '9px 14px', fontSize: '13px', border: '1px solid #E8E6E0', borderRadius: '10px',
              outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#444441', background: 'white', cursor: 'pointer',
            }}
          >
            {SORTIERUNGEN.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
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
              padding: '10px 20px', background: '#185FA5', color: 'white', border: 'none', borderRadius: '10px',
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
            Für „{suchbegriff}" gibt es keine Treffer.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {sichtbareProjekte.map(projekt => (
            <ProjektKachel
              key={projekt.id}
              projekt={projekt}
              onOeffnen={() => waehleProjekt(projekt.id)}
              onUmbenennen={() => setDialog({ typ: 'umbenennen', projekt })}
              onDuplizieren={() => duplicateProjekt(projekt.id)}
              onExportieren={() => exportProjekt(projekt.id)}
              onLoeschen={() => setDialog({ typ: 'loeschen', projekt })}
            />
          ))}
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
  )
}
