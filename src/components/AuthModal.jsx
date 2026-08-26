import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// Rohe GoTrue-Fehlermeldungen (Englisch) auf verständliche deutsche Hinweise abbilden —
// unbekannte Meldungen fallen unten auf error.message zurück statt auf einen generischen Text,
// damit auch seltene Fälle (z.B. Rate-Limit) nicht spurlos verschwinden.
const FEHLER_TEXTE = {
  'Invalid login credentials': 'E-Mail oder Passwort ist falsch.',
  'User already registered': 'Für diese E-Mail-Adresse existiert bereits ein Konto.',
  'Email not confirmed': 'Bitte bestätige zuerst deine E-Mail-Adresse, dann kannst du dich anmelden.',
  'Password should be at least 6 characters': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
  'Unable to validate email address: invalid format': 'Das ist keine gültige E-Mail-Adresse.',
  'Unsupported provider: provider is not enabled': 'Anmeldung mit Google ist aktuell nicht verfügbar.',
}

const uebersetzeFehler = (message) => FEHLER_TEXTE[message] || message

const eingabeStil = {
  width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #E8E6E0', borderRadius: '10px',
  outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', boxSizing: 'border-box', marginBottom: '10px',
}

// Offizielles vierfarbiges Google-"G" (Standard-Icon für "Mit Google anmelden"-Buttons)
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
  </svg>
)

export default function AuthModal({ onSchliessen }) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [modus, setModus] = useState('login') // 'login' | 'registrieren'
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState('')
  const [hinweis, setHinweis] = useState('')
  const [ladeStatus, setLadeStatus] = useState(false)
  const [googleLaeuft, setGoogleLaeuft] = useState(false)

  const wechsleModus = () => {
    setModus(m => m === 'login' ? 'registrieren' : 'login')
    setFehler('')
    setHinweis('')
  }

  // Bei Erfolg navigiert der Browser sofort weg zu Google — kein weiterer State nötig, das Modal
  // ist dann ohnehin nicht mehr da. Nur ein Fehler (z.B. Provider nicht konfiguriert) bleibt hier.
  const mitGoogleAnmelden = async () => {
    setFehler('')
    setHinweis('')
    setGoogleLaeuft(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setFehler(uebersetzeFehler(error.message))
      setGoogleLaeuft(false)
    }
  }

  const absenden = async (e) => {
    e.preventDefault()
    setFehler('')
    setHinweis('')
    setLadeStatus(true)
    const { data, error } = modus === 'login'
      ? await signIn(email, passwort)
      : await signUp(email, passwort)
    setLadeStatus(false)

    if (error) {
      setFehler(uebersetzeFehler(error.message))
      return
    }
    // Bei aktivem "Confirm email" liefert signUp einen Nutzer, aber keine Session — der Account
    // kann sich erst nach Bestätigung einloggen, also Modal offen lassen und Hinweis zeigen statt
    // fälschlich einen erfolgreichen Login zu signalisieren.
    if (modus === 'registrieren' && !data.session) {
      setHinweis('Konto angelegt. Bitte bestätige deine E-Mail-Adresse, um dich einzuloggen.')
      return
    }
    onSchliessen()
  }

  return (
    <div onClick={onSchliessen} style={{
      position: 'fixed', inset: 0, background: 'rgba(44,44,42,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: '16px', padding: '28px', width: '340px', maxWidth: 'calc(100vw - 32px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', boxSizing: 'border-box',
      }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', marginBottom: '20px' }}>
          {modus === 'login' ? 'Anmelden' : 'Konto erstellen'}
        </p>

        <button type="button" onClick={mitGoogleAnmelden} disabled={googleLaeuft} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          padding: '10px 16px', borderRadius: '10px', border: '1px solid #E8E6E0', background: 'white',
          color: '#2C2C2A', fontSize: '13px', fontWeight: '500', fontFamily: "'DM Sans', sans-serif",
          cursor: googleLaeuft ? 'default' : 'pointer', boxSizing: 'border-box',
        }}>
          <GoogleIcon />
          {googleLaeuft ? 'Weiterleiten…' : 'Mit Google anmelden'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#E8E6E0' }} />
          <span style={{ fontSize: '12px', color: '#B4B2A9' }}>oder</span>
          <div style={{ flex: 1, height: '1px', background: '#E8E6E0' }} />
        </div>

        <form onSubmit={absenden}>
          <input
            type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
            placeholder="E-Mail-Adresse" style={eingabeStil}
          />
          <input
            type="password" required minLength={6} value={passwort} onChange={e => setPasswort(e.target.value)}
            placeholder="Passwort" style={{ ...eingabeStil, marginBottom: '14px' }}
          />

          {fehler && <p style={{ fontSize: '12px', color: '#E24B4A', marginBottom: '14px', lineHeight: 1.4 }}>{fehler}</p>}
          {hinweis && <p style={{ fontSize: '12px', color: '#185FA5', marginBottom: '14px', lineHeight: 1.4 }}>{hinweis}</p>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onSchliessen} style={{
              padding: '8px 16px', borderRadius: '10px', border: '1px solid #E8E6E0', background: 'white',
              color: '#888780', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              Abbrechen
            </button>
            <button type="submit" disabled={ladeStatus} style={{
              padding: '8px 16px', borderRadius: '10px', border: 'none',
              background: ladeStatus ? '#D3D1C7' : '#185FA5', color: 'white', fontSize: '13px', fontWeight: '500',
              cursor: ladeStatus ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              {ladeStatus ? '…' : modus === 'login' ? 'Anmelden' : 'Registrieren'}
            </button>
          </div>
        </form>

        <p style={{ fontSize: '12px', color: '#888780', marginTop: '16px', textAlign: 'center' }}>
          {modus === 'login' ? 'Noch kein Konto?' : 'Schon ein Konto?'}{' '}
          <span onClick={wechsleModus} style={{ color: '#185FA5', cursor: 'pointer', fontWeight: '500' }}>
            {modus === 'login' ? 'Registrieren' : 'Anmelden'}
          </span>
        </p>
      </div>
    </div>
  )
}
