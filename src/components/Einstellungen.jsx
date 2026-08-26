import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Rohe GoTrue-Fehlermeldungen (Englisch) auf verständliche deutsche Hinweise abbilden — analog zu
// FEHLER_TEXTE in AuthModal.jsx, aber um die hier relevanten Fälle (E-Mail-/Passwort-Änderung)
// erweitert. Unbekannte Meldungen fallen auf error.message zurück statt auf einen generischen Text
// (deckt z.B. auch die deutschen Meldungen der delete-account Edge Function ab, die unverändert
// durchgereicht werden).
const FEHLER_TEXTE = {
  'A user with this email address has already been registered': 'Für diese E-Mail-Adresse existiert bereits ein Konto.',
  'User already registered': 'Für diese E-Mail-Adresse existiert bereits ein Konto.',
  'Unable to validate email address: invalid format': 'Das ist keine gültige E-Mail-Adresse.',
  'Password should be at least 6 characters': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
  'New password should be different from the old password.': 'Das neue Passwort muss sich vom aktuellen unterscheiden.',
}

const uebersetzeFehler = (message) => FEHLER_TEXTE[message] || message

// supabase.functions.invoke liefert bei einem Nicht-2xx-Status einen FunctionsHttpError, dessen
// .message generisch ist ("Edge Function returned a non-2xx status code") — die eigentliche
// deutsche Meldung steckt im JSON-Body der Response (error.context).
const leseFunktionsFehler = async (error) => {
  try {
    const body = await error.context?.json()
    if (body?.error) return body.error
  } catch {
    // Body nicht lesbar/kein JSON — auf error.message zurückfallen
  }
  return uebersetzeFehler(error.message)
}

const eingabeStil = {
  width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #E4DED0', borderRadius: '10px',
  outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', boxSizing: 'border-box', marginBottom: '10px',
}

function DialogGeruest({ onAbbrechen, children }) {
  return (
    <div onClick={onAbbrechen} style={{
      position: 'fixed', inset: 0, background: 'rgba(44,44,42,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: '16px', padding: '24px', width: '340px', maxWidth: 'calc(100vw - 32px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', boxSizing: 'border-box',
      }}>
        {children}
      </div>
    </div>
  )
}

function Zeile({ label, wert, kinder, children }) {
  return (
    <div style={{ padding: '18px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '13px', color: '#888780', marginBottom: '2px' }}>{label}</p>
          <p style={{ fontSize: '14px', color: '#2C2C2A' }}>{wert}</p>
        </div>
        {kinder}
      </div>
      {children}
    </div>
  )
}

function AendernKnopf({ onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: '9px', border: '1px solid #E4DED0', background: 'white',
      color: '#2F4B39', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
    }}>
      Ändern
    </button>
  )
}

function FormAktionen({ onAbbrechen, speichernLabel = 'Speichern', ladeStatus, deaktiviert }) {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
      <button type="button" onClick={onAbbrechen} style={{
        padding: '8px 16px', borderRadius: '10px', border: '1px solid #E4DED0', background: 'white',
        color: '#888780', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
      }}>
        Abbrechen
      </button>
      <button type="submit" disabled={ladeStatus || deaktiviert} style={{
        padding: '8px 16px', borderRadius: '10px', border: 'none',
        background: (ladeStatus || deaktiviert) ? '#D3D1C7' : '#2F4B39', color: 'white', fontSize: '13px', fontWeight: '500',
        cursor: (ladeStatus || deaktiviert) ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
      }}>
        {ladeStatus ? '…' : speichernLabel}
      </button>
    </div>
  )
}

function EmailZeile({ user }) {
  const { updateEmail } = useAuth()
  const [offen, setOffen] = useState(false)
  const [neueEmail, setNeueEmail] = useState('')
  const [fehler, setFehler] = useState('')
  const [hinweis, setHinweis] = useState('')
  const [ladeStatus, setLadeStatus] = useState(false)

  const oeffnen = () => { setOffen(true); setNeueEmail(user.email || ''); setFehler(''); setHinweis('') }
  const abbrechen = () => { setOffen(false); setFehler(''); setHinweis('') }

  const speichern = async (e) => {
    e.preventDefault()
    setFehler('')
    setLadeStatus(true)
    const { error } = await updateEmail(neueEmail)
    setLadeStatus(false)
    if (error) { setFehler(uebersetzeFehler(error.message)); return }
    setHinweis('Bestätigungs-E-Mail verschickt.')
    setTimeout(() => { setOffen(false); setHinweis('') }, 2200)
  }

  return (
    <Zeile label="E-Mail-Adresse" wert={user.email} kinder={!offen && <AendernKnopf onClick={oeffnen} />}>
      {offen && (
        <form onSubmit={speichern} style={{ marginTop: '10px' }}>
          <input
            type="email" required autoFocus value={neueEmail} onChange={e => setNeueEmail(e.target.value)}
            placeholder="Neue E-Mail-Adresse" style={eingabeStil}
          />
          <p style={{ fontSize: '12px', color: '#888780', lineHeight: 1.5, marginBottom: '10px' }}>
            Du erhältst eine Bestätigungs-E-Mail an die neue Adresse. Die Änderung gilt erst nach Bestätigung.
          </p>
          {fehler && <p style={{ fontSize: '12px', color: '#E24B4A', marginBottom: '10px', lineHeight: 1.4 }}>{fehler}</p>}
          {hinweis && <p style={{ fontSize: '12px', color: '#2F4B39', marginBottom: '10px', lineHeight: 1.4 }}>{hinweis}</p>}
          <FormAktionen onAbbrechen={abbrechen} ladeStatus={ladeStatus} deaktiviert={!neueEmail.trim()} />
        </form>
      )}
    </Zeile>
  )
}

function PasswortZeile() {
  const { updatePassword } = useAuth()
  const [offen, setOffen] = useState(false)
  const [neuesPasswort, setNeuesPasswort] = useState('')
  const [bestaetigung, setBestaetigung] = useState('')
  const [fehler, setFehler] = useState('')
  const [hinweis, setHinweis] = useState('')
  const [ladeStatus, setLadeStatus] = useState(false)

  const oeffnen = () => { setOffen(true); setNeuesPasswort(''); setBestaetigung(''); setFehler(''); setHinweis('') }
  const abbrechen = () => { setOffen(false); setFehler(''); setHinweis('') }

  const speichern = async (e) => {
    e.preventDefault()
    setFehler('')
    if (neuesPasswort !== bestaetigung) { setFehler('Die Passwörter stimmen nicht überein.'); return }
    setLadeStatus(true)
    const { error } = await updatePassword(neuesPasswort)
    setLadeStatus(false)
    if (error) { setFehler(uebersetzeFehler(error.message)); return }
    setHinweis('Passwort geändert.')
    setTimeout(() => { setOffen(false); setHinweis('') }, 1800)
  }

  return (
    <Zeile label="Passwort" wert="••••••••" kinder={!offen && <AendernKnopf onClick={oeffnen} />}>
      {offen && (
        <form onSubmit={speichern} style={{ marginTop: '10px' }}>
          <input
            type="password" required autoFocus minLength={6} value={neuesPasswort} onChange={e => setNeuesPasswort(e.target.value)}
            placeholder="Neues Passwort" style={eingabeStil}
          />
          <input
            type="password" required minLength={6} value={bestaetigung} onChange={e => setBestaetigung(e.target.value)}
            placeholder="Neues Passwort bestätigen" style={eingabeStil}
          />
          {fehler && <p style={{ fontSize: '12px', color: '#E24B4A', marginBottom: '10px', lineHeight: 1.4 }}>{fehler}</p>}
          {hinweis && <p style={{ fontSize: '12px', color: '#2F4B39', marginBottom: '10px', lineHeight: 1.4 }}>{hinweis}</p>}
          <FormAktionen onAbbrechen={abbrechen} ladeStatus={ladeStatus} deaktiviert={!neuesPasswort || !bestaetigung} />
        </form>
      )}
    </Zeile>
  )
}

function LoeschenDialog({ user, onAbbrechen }) {
  const { deleteAccount, signOut } = useAuth()
  const navigate = useNavigate()
  const hatPasswort = user.identities?.some(i => i.provider === 'email') ?? false
  const [passwort, setPasswort] = useState('')
  const [bestaetigungstext, setBestaetigungstext] = useState('')
  const [fehler, setFehler] = useState('')
  const [ladeStatus, setLadeStatus] = useState(false)

  const gueltig = hatPasswort ? passwort.length > 0 : bestaetigungstext === 'LÖSCHEN'

  const bestaetigen = async () => {
    if (!gueltig) return
    setFehler('')
    setLadeStatus(true)
    const { error } = await deleteAccount(hatPasswort ? { password: passwort } : {})
    if (error) {
      setLadeStatus(false)
      setFehler(await leseFunktionsFehler(error))
      return
    }
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <DialogGeruest onAbbrechen={ladeStatus ? undefined : onAbbrechen}>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', marginBottom: '12px' }}>
        Konto endgültig löschen?
      </p>
      <p style={{ fontSize: '13px', color: '#444441', lineHeight: 1.5, marginBottom: '16px' }}>
        Löscht dein Konto und alle Projekte endgültig. Das kann nicht rückgängig gemacht werden.
      </p>

      {hatPasswort ? (
        <input
          type="password" autoFocus value={passwort} onChange={e => setPasswort(e.target.value)}
          placeholder="Passwort zur Bestätigung" style={{ ...eingabeStil, border: '1px solid #E8E6E0', marginBottom: '14px' }}
        />
      ) : (
        <input
          type="text" autoFocus value={bestaetigungstext} onChange={e => setBestaetigungstext(e.target.value)}
          placeholder="Tippe LÖSCHEN zur Bestätigung" style={{ ...eingabeStil, border: '1px solid #E8E6E0', marginBottom: '14px' }}
        />
      )}

      {fehler && <p style={{ fontSize: '12px', color: '#E24B4A', marginBottom: '14px', lineHeight: 1.4 }}>{fehler}</p>}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onAbbrechen} disabled={ladeStatus} style={{
          padding: '8px 16px', borderRadius: '10px', border: '1px solid #E8E6E0', background: 'white',
          color: '#888780', fontSize: '13px', cursor: ladeStatus ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          Abbrechen
        </button>
        <button onClick={bestaetigen} disabled={!gueltig || ladeStatus} style={{
          padding: '8px 16px', borderRadius: '10px', border: 'none',
          background: (!gueltig || ladeStatus) ? '#D3D1C7' : '#E24B4A', color: 'white', fontSize: '13px', fontWeight: '500',
          cursor: (!gueltig || ladeStatus) ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          {ladeStatus ? '…' : 'Konto endgültig löschen'}
        </button>
      </div>
    </DialogGeruest>
  )
}

function PillToggle({ optionen, aktiv }) {
  return (
    <div style={{ display: 'flex', border: '1px solid #E4DED0', borderRadius: '8px', overflow: 'hidden' }}>
      {optionen.map(o => (
        <div key={o} style={{
          padding: '6px 14px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
          background: o === aktiv ? '#2F4B39' : 'white', color: o === aktiv ? 'white' : '#888780',
        }}>
          {o}
        </div>
      ))}
    </div>
  )
}

function AppKarte() {
  return (
    <div style={{
      background: 'white', border: '1px solid #E4DED0', borderRadius: '16px', padding: '26px 28px', marginTop: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#1F3327' }}>App</h2>
        <span style={{
          fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: '#F2E9D8', color: '#8A6D3B',
        }}>
          Demnächst verfügbar
        </span>
      </div>

      <div style={{ opacity: 0.55, pointerEvents: 'none' }}>
        <Zeile label="Maßeinheiten" wert="Meter" kinder={<PillToggle optionen={['Meter', 'Fuß']} aktiv="Meter" />} />
        <div style={{ height: '1px', background: '#F2EFE7' }} />
        <Zeile label="Sprache" wert="Deutsch" kinder={
          <div style={{
            padding: '6px 14px', fontSize: '12px', border: '1px solid #E4DED0', borderRadius: '8px',
            fontFamily: "'DM Sans', sans-serif", color: '#444441', background: 'white',
          }}>
            Deutsch
          </div>
        } />
        <div style={{ height: '1px', background: '#F2EFE7' }} />
        <Zeile label="Theme" wert="Hell" kinder={<PillToggle optionen={['Hell', 'Dunkel']} aktiv="Hell" />} />
      </div>
    </div>
  )
}

export default function Einstellungen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loeschenOffen, setLoeschenOffen] = useState(false)

  if (!user) return <Navigate to="/" replace />

  return (
    <div style={{ minHeight: '100vh', background: '#FBF6EC', padding: '40px 24px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>
        <button onClick={() => navigate('/')} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', margin: '-8px -8px 24px', border: 'none',
          background: 'transparent', cursor: 'pointer', color: '#444441', fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#2F4B39'}
          onMouseLeave={e => e.currentTarget.style.color = '#444441'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Zurück zum Dashboard
        </button>

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '500', color: '#1F3327', marginBottom: '20px' }}>
          Einstellungen
        </h1>

        <div style={{ background: 'white', border: '1px solid #E4DED0', borderRadius: '16px', padding: '26px 28px' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#1F3327', marginBottom: '4px' }}>
            Konto
          </h2>

          <EmailZeile user={user} />
          <div style={{ height: '1px', background: '#F2EFE7' }} />
          <PasswortZeile />
          <div style={{ height: '1px', background: '#F2EFE7' }} />
          <Zeile
            label="Konto löschen"
            wert="Löscht dein Konto und alle Projekte endgültig"
            kinder={
              <button onClick={() => setLoeschenOffen(true)} style={{
                padding: '7px 16px', borderRadius: '9px', border: '1px solid #E24B4A', background: 'white',
                color: '#E24B4A', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
              }}>
                Konto löschen
              </button>
            }
          />
        </div>

        <AppKarte />
      </div>

      {loeschenOffen && <LoeschenDialog user={user} onAbbrechen={() => setLoeschenOffen(false)} />}
    </div>
  )
}
