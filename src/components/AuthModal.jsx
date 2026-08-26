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
}

const uebersetzeFehler = (message) => FEHLER_TEXTE[message] || message

const eingabeStil = {
  width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #E8E6E0', borderRadius: '10px',
  outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#2C2C2A', boxSizing: 'border-box', marginBottom: '10px',
}

export default function AuthModal({ onSchliessen }) {
  const { signIn, signUp } = useAuth()
  const [modus, setModus] = useState('login') // 'login' | 'registrieren'
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState('')
  const [hinweis, setHinweis] = useState('')
  const [ladeStatus, setLadeStatus] = useState(false)

  const wechsleModus = () => {
    setModus(m => m === 'login' ? 'registrieren' : 'login')
    setFehler('')
    setHinweis('')
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
