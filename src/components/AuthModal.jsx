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
  'Token has expired or is invalid': 'Der Code ist ungültig oder abgelaufen. Bitte fordere einen neuen an.',
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
  const { signIn, signUp, signInWithGoogle, resetPasswordForEmail, verifyPasswortResetCode, updatePassword } = useAuth()
  // 'login' | 'registrieren' | 'passwort-vergessen' | 'passwort-vergessen-code' | 'passwort-vergessen-neu'
  const [modus, setModus] = useState('login')
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [passwortBestaetigung, setPasswortBestaetigung] = useState('')
  const [code, setCode] = useState('')
  const [akzeptiert, setAkzeptiert] = useState(false)
  const [fehler, setFehler] = useState('')
  const [abgeschlossen, setAbgeschlossen] = useState(null) // null | 'registriert' | 'zurueckgesetzt'
  const [ladeStatus, setLadeStatus] = useState(false)
  const [googleLaeuft, setGoogleLaeuft] = useState(false)

  const wechsleModus = (neuerModus) => {
    setModus(neuerModus)
    setFehler('')
    setPasswort('')
    setPasswortBestaetigung('')
    setCode('')
    setAkzeptiert(false)
  }

  // Bei Erfolg navigiert der Browser sofort weg zu Google — kein weiterer State nötig, das Modal
  // ist dann ohnehin nicht mehr da. Nur ein Fehler (z.B. Provider nicht konfiguriert) bleibt hier.
  const mitGoogleAnmelden = async () => {
    setFehler('')
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

    if (modus === 'passwort-vergessen') {
      setLadeStatus(true)
      const { error } = await resetPasswordForEmail(email)
      setLadeStatus(false)
      if (error) { setFehler(uebersetzeFehler(error.message)); return }
      setModus('passwort-vergessen-code')
      return
    }

    if (modus === 'passwort-vergessen-code') {
      setLadeStatus(true)
      const { error } = await verifyPasswortResetCode(email, code)
      setLadeStatus(false)
      if (error) { setFehler(uebersetzeFehler(error.message)); return }
      setModus('passwort-vergessen-neu')
      return
    }

    if (modus === 'passwort-vergessen-neu') {
      if (passwort !== passwortBestaetigung) { setFehler('Die Passwörter stimmen nicht überein.'); return }
      setLadeStatus(true)
      const { error } = await updatePassword(passwort)
      setLadeStatus(false)
      if (error) { setFehler(uebersetzeFehler(error.message)); return }
      setAbgeschlossen('zurueckgesetzt')
      return
    }

    if (modus === 'registrieren') {
      if (passwort !== passwortBestaetigung) { setFehler('Die Passwörter stimmen nicht überein.'); return }
      if (!akzeptiert) { setFehler('Bitte akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung.'); return }
    }

    setLadeStatus(true)
    const { data, error } = modus === 'login'
      ? await signIn(email, passwort)
      : await signUp(email, passwort)
    setLadeStatus(false)

    if (error) {
      setFehler(uebersetzeFehler(error.message))
      return
    }

    if (modus === 'registrieren') {
      // Bei "Confirm email" aktiviert gibt Supabase aus Sicherheitsgründen (keine Preisgabe, ob
      // eine E-Mail existiert) KEINEN Fehler zurück, wenn die Adresse schon ein bestätigtes Konto
      // hat — stattdessen ein user-Objekt mit leerem identities-Array statt einer neu angelegten
      // Identity. Das ist das einzige verlässliche Erkennungsmerkmal für "Mail existiert schon".
      const kontoExistiertBereits = data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0
      if (kontoExistiertBereits) {
        setFehler('Für diese E-Mail-Adresse existiert bereits ein Konto. Bitte melde dich stattdessen an.')
        return
      }
      if (!data.session) {
        setAbgeschlossen('registriert')
        return
      }
    }

    onSchliessen()
  }

  if (abgeschlossen) {
    const istRegistrierung = abgeschlossen === 'registriert'
    return (
      <div onClick={onSchliessen} style={{
        position: 'fixed', inset: 0, background: 'rgba(44,44,42,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'white', borderRadius: '16px', padding: '28px', width: '340px', maxWidth: 'calc(100vw - 32px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', boxSizing: 'border-box',
        }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '500', color: '#2C2C2A', marginBottom: '12px' }}>
            {istRegistrierung ? 'Fast geschafft!' : 'Passwort geändert'}
          </p>
          <p style={{ fontSize: '13px', color: '#444441', lineHeight: 1.6, marginBottom: '20px' }}>
            {istRegistrierung
              ? 'Vielen Dank für deine Registrierung! Wir haben dir eine Bestätigungs-E-Mail geschickt — bitte klicke den Link darin an, um dein Konto zu aktivieren.'
              : 'Dein Passwort wurde geändert. Du bist jetzt angemeldet.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onSchliessen} style={{
              padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#2F4B39', color: 'white',
              fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              Verstanden
            </button>
          </div>
        </div>
      </div>
    )
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
          {modus === 'login' ? 'Anmelden'
            : modus === 'registrieren' ? 'Konto erstellen'
            : modus === 'passwort-vergessen' ? 'Passwort zurücksetzen'
            : modus === 'passwort-vergessen-code' ? 'Code eingeben'
            : 'Neues Passwort'}
        </p>

        {(modus === 'login' || modus === 'registrieren') && (
          <>
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
          </>
        )}

        <form onSubmit={absenden}>
          {modus === 'passwort-vergessen-code' && (
            <p style={{ fontSize: '12px', color: '#888780', marginBottom: '14px', lineHeight: 1.5 }}>
              Wir haben einen Code an {email} geschickt.
            </p>
          )}

          {(modus === 'login' || modus === 'registrieren' || modus === 'passwort-vergessen') && (
            <input
              type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
              placeholder="E-Mail-Adresse" style={eingabeStil}
            />
          )}

          {modus === 'passwort-vergessen-code' && (
            <input
              type="text" required autoFocus inputMode="numeric" value={code} onChange={e => setCode(e.target.value)}
              placeholder="Code aus der E-Mail" style={eingabeStil}
            />
          )}

          {(modus === 'login' || modus === 'registrieren' || modus === 'passwort-vergessen-neu') && (
            <input
              type="password" required autoFocus={modus === 'passwort-vergessen-neu'} minLength={6}
              value={passwort} onChange={e => setPasswort(e.target.value)}
              placeholder={modus === 'passwort-vergessen-neu' ? 'Neues Passwort' : 'Passwort'} style={eingabeStil}
            />
          )}

          {(modus === 'registrieren' || modus === 'passwort-vergessen-neu') && (
            <input
              type="password" required minLength={6} value={passwortBestaetigung} onChange={e => setPasswortBestaetigung(e.target.value)}
              placeholder="Passwort bestätigen" style={eingabeStil}
            />
          )}

          {modus === 'login' && (
            <p style={{ fontSize: '12px', textAlign: 'right', margin: '-2px 0 14px' }}>
              <span onClick={() => wechsleModus('passwort-vergessen')} style={{ color: '#888780', cursor: 'pointer' }}>
                Passwort vergessen?
              </span>
            </p>
          )}

          {modus === 'registrieren' && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox" checked={akzeptiert} onChange={e => setAkzeptiert(e.target.checked)}
                style={{ marginTop: '2px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '12px', color: '#444441', lineHeight: 1.5 }}>
                Ich akzeptiere die{' '}
                <a href="https://planixy.app/nutzungsbedingungen" target="_blank" rel="noopener noreferrer" style={{ color: '#2F4B39' }}>
                  Nutzungsbedingungen
                </a>{' '}
                und die{' '}
                <a href="https://planixy.app/datenschutz" target="_blank" rel="noopener noreferrer" style={{ color: '#2F4B39' }}>
                  Datenschutzerklärung
                </a>.
              </span>
            </label>
          )}

          {fehler && <p style={{ fontSize: '12px', color: '#E24B4A', marginBottom: '14px', lineHeight: 1.4 }}>{fehler}</p>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onSchliessen} style={{
              padding: '8px 16px', borderRadius: '10px', border: '1px solid #E8E6E0', background: 'white',
              color: '#888780', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={ladeStatus || (modus === 'registrieren' && !akzeptiert)}
              style={{
                padding: '8px 16px', borderRadius: '10px', border: 'none',
                background: (ladeStatus || (modus === 'registrieren' && !akzeptiert)) ? '#D3D1C7' : '#2F4B39',
                color: 'white', fontSize: '13px', fontWeight: '500',
                cursor: (ladeStatus || (modus === 'registrieren' && !akzeptiert)) ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {ladeStatus ? '…'
                : modus === 'login' ? 'Anmelden'
                : modus === 'registrieren' ? 'Registrieren'
                : modus === 'passwort-vergessen' ? 'Code senden'
                : modus === 'passwort-vergessen-code' ? 'Code bestätigen'
                : 'Passwort speichern'}
            </button>
          </div>
        </form>

        {modus === 'passwort-vergessen' && (
          <p style={{ fontSize: '12px', color: '#888780', marginTop: '16px', textAlign: 'center' }}>
            <span onClick={() => wechsleModus('login')} style={{ color: '#2F4B39', cursor: 'pointer', fontWeight: '500' }}>
              Zurück zur Anmeldung
            </span>
          </p>
        )}

        {modus === 'passwort-vergessen-code' && (
          <p style={{ fontSize: '12px', color: '#888780', marginTop: '16px', textAlign: 'center' }}>
            <span onClick={() => wechsleModus('passwort-vergessen')} style={{ color: '#2F4B39', cursor: 'pointer', fontWeight: '500' }}>
              Code erneut anfordern
            </span>
          </p>
        )}

        {(modus === 'login' || modus === 'registrieren') && (
          <p style={{ fontSize: '12px', color: '#888780', marginTop: '16px', textAlign: 'center' }}>
            {modus === 'login' ? 'Noch kein Konto?' : 'Schon ein Konto?'}{' '}
            <span onClick={() => wechsleModus(modus === 'login' ? 'registrieren' : 'login')} style={{ color: '#2F4B39', cursor: 'pointer', fontWeight: '500' }}>
              {modus === 'login' ? 'Registrieren' : 'Anmelden'}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
