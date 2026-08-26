import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useProjekteListe } from '../context/ProjekteListeContext'
import { loadProjekte, clearProjekte } from '../context/projekteStorage'
import { erstelleProjektSupabase } from '../context/projekteSupabaseStorage'
import { serialisiereProjekt, parseProjektDatei, eindeutigerProjektname } from '../context/projektExport'

const ABLEHNUNG_KEY = 'planixy-migration-abgelehnt'

// Default-Projekt ("Mein Zuhause" ohne jede Änderung) hat erstelltAm === geaendertAm, weil jede
// echte Änderung (auch nur ein Wizard-Schritt-Wechsel) über updateProjekt geaendertAm neu setzt —
// reine Existenz eines Gast-Projekts reicht also nicht, es muss auch angefasst worden sein.
const hatSinnvolleDaten = (projekte) =>
  projekte.length > 1 || projekte.some(p => p.geaendertAm !== p.erstelltAm)

// Fingerabdruck der aktuellen Gast-Daten für die "nicht erneut fragen"-Ablehnung — ändert sich
// jedes Mal, wenn sich an den Gast-Projekten irgendetwas ändert (neu, bearbeitet, gelöscht), damit
// eine spätere neue Gast-Aktivität die Ablehnung automatisch wieder aufhebt.
const signatur = (projekte) => projekte.map(p => `${p.id}:${p.geaendertAm}`).sort().join('|')

export default function MigrationsDialog() {
  const { projekte: kontoProjekte, aktualisiereProjekte } = useProjekteListe()
  const [userId, setUserId] = useState(null)
  const [gastProjekte, setGastProjekte] = useState([])
  const [erledigt, setErledigt] = useState(new Set())
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Nur bei echtem Login/Registrierung fragen, nicht bei einer beim Laden der Seite
      // wiederhergestellten Session (die feuert 'INITIAL_SESSION', nicht 'SIGNED_IN').
      if (event !== 'SIGNED_IN' || !session?.user) return
      const gefunden = loadProjekte()
      if (!hatSinnvolleDaten(gefunden)) return
      if (localStorage.getItem(ABLEHNUNG_KEY) === signatur(gefunden)) return
      setUserId(session.user.id)
      setGastProjekte(gefunden)
      setErledigt(new Set())
      setFehler('')
    })
    return () => subscription.unsubscribe()
  }, [])

  const offen = gastProjekte.length > 0

  const ablehnen = () => {
    localStorage.setItem(ABLEHNUNG_KEY, signatur(gastProjekte))
    setGastProjekte([])
  }

  // Läuft sequenziell (nicht Promise.all), damit bei einem Fehler mittendrin klar ist, welche
  // Projekte schon sicher im Konto liegen (erledigt) — ein Retry überspringt die und importiert
  // nur den Rest, statt sie doppelt anzulegen. localStorage wird erst geleert, wenn wirklich alle
  // Projekte durch sind.
  const uebernehmen = async () => {
    setLaeuft(true)
    setFehler('')
    try {
      const namenBelegt = kontoProjekte.map(p => p.name)
      const rest = gastProjekte.filter(p => !erledigt.has(p.id))
      for (const gastProjekt of rest) {
        const { json } = serialisiereProjekt(gastProjekt)
        const importiert = parseProjektDatei(json)
        const name = eindeutigerProjektname(importiert.name, namenBelegt)
        await erstelleProjektSupabase(userId, { ...importiert, name })
        namenBelegt.push(name)
        setErledigt(prev => new Set(prev).add(gastProjekt.id))
      }
      clearProjekte()
      localStorage.removeItem(ABLEHNUNG_KEY)
      await aktualisiereProjekte()
      setGastProjekte([])
    } catch (err) {
      setFehler(`Import fehlgeschlagen: ${err.message} — bereits übernommene Projekte bleiben erhalten, du kannst es erneut versuchen.`)
    } finally {
      setLaeuft(false)
    }
  }

  if (!offen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(44,44,42,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '28px', width: '380px', maxWidth: 'calc(100vw - 32px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', boxSizing: 'border-box',
      }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', marginBottom: '10px' }}>
          Lokale Projekte gefunden
        </p>
        <p style={{ fontSize: '13px', color: '#444441', lineHeight: 1.5, marginBottom: '16px' }}>
          Auf diesem Gerät liegen Projekte, die noch nicht in deinem Konto sind. Sollen sie übernommen werden?
        </p>

        <div style={{ border: '1px solid #E8E6E0', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
          {gastProjekte.map(p => (
            <div key={p.id} style={{
              padding: '10px 14px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', gap: '10px',
              borderBottom: '1px solid #E8E6E0', color: erledigt.has(p.id) ? '#B4B2A9' : '#2C2C2A',
            }}>
              <span>{p.name}{erledigt.has(p.id) ? ' ✓' : ''}</span>
              <span style={{ color: '#888780', flexShrink: 0 }}>{p.raeume.length} {p.raeume.length === 1 ? 'Raum' : 'Räume'}</span>
            </div>
          ))}
        </div>

        {fehler && <p style={{ fontSize: '12px', color: '#E24B4A', marginBottom: '16px', lineHeight: 1.4 }}>{fehler}</p>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={ablehnen} disabled={laeuft} style={{
            padding: '8px 16px', borderRadius: '10px', border: '1px solid #E8E6E0', background: 'white',
            color: '#888780', fontSize: '13px', cursor: laeuft ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>
            Nicht übernehmen
          </button>
          <button onClick={uebernehmen} disabled={laeuft} style={{
            padding: '8px 16px', borderRadius: '10px', border: 'none',
            background: laeuft ? '#D3D1C7' : '#185FA5', color: 'white', fontSize: '13px', fontWeight: '500',
            cursor: laeuft ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>
            {laeuft ? 'Übernehme…' : 'Ins Konto übernehmen'}
          </button>
        </div>
      </div>
    </div>
  )
}
