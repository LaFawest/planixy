import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'
import { PlanixyIcon } from './PlanixyLogo'

const SPEICHER_SCHLUESSEL = 'planixy_gastbanner_ausgeblendet'

// Banner für nicht angemeldete Besucher, direkt auf dem Dashboard (dort gab es bisher gar keine
// Möglichkeit sich anzumelden — nur im Editor-Topbar, den man erst nach dem Öffnen eines Projekts
// sieht). Verschwindet automatisch sobald jemand eingeloggt ist. Manuelles Wegklicken wird in
// localStorage gemerkt (an den Browser gebunden, wie die übrigen Gast-Daten auch) — der Banner
// bleibt danach dauerhaft weg, bis localStorage geleert wird.
export default function GastBanner({ bestaetigt = false }) {
  const { user } = useAuth()
  const [ausgeblendet, setAusgeblendet] = useState(() => {
    try {
      return localStorage.getItem(SPEICHER_SCHLUESSEL) === 'true'
    } catch {
      return false
    }
  })
  const [authModalOffen, setAuthModalOffen] = useState(false)

  const schliessen = () => {
    setAusgeblendet(true)
    try {
      localStorage.setItem(SPEICHER_SCHLUESSEL, 'true')
    } catch {
      // localStorage nicht verfügbar (z.B. Privatmodus) — Banner bleibt dann nur für diese
      // Sitzung ausgeblendet, kein Blocker
    }
  }

  // Während das AuthModal offen ist (z.B. mitten im Passwort-Reset-Flow), darf der Banner
  // sich NICHT wegen `user` ausblenden: verifyPasswortResetCode (supabase.auth.verifyOtp)
  // erzeugt bereits eine Session, sobald der Code bestätigt ist — also bevor der Nutzer den
  // nächsten Schritt ("Neues Passwort vergeben") überhaupt sieht. Ohne diese Ausnahme würde
  // die Komponente sich hier selbst unmounten und das noch offene AuthModal mitreißen.
  // Das Modal schließt sich stattdessen ganz normal über onSchliessen (setAuthModalOffen(false)).
  if ((user && !authModalOffen) || ausgeblendet) return null

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '28px', padding: '22px 26px',
        borderRadius: '16px', background: 'linear-gradient(160deg, #F8F2E5, #EDE1C8)',
        position: 'relative', boxShadow: '0 1px 2px rgba(43,42,34,.05), 0 8px 20px rgba(43,42,34,.05)',
      }}>
        <button onClick={schliessen} aria-label="Schließen" style={{
          position: 'absolute', top: '12px', right: '14px', background: 'none', border: 'none',
          color: '#B4A98C', fontSize: '16px', cursor: 'pointer', lineHeight: 1, padding: '4px',
        }}>
          ×
        </button>
        <PlanixyIcon size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 500, color: '#1F3327', marginBottom: '4px' }}>
            {bestaetigt ? 'E-Mail bestätigt' : 'Noch nicht angemeldet'}
          </div>
          <div style={{ fontSize: '13px', color: '#5b5a4d', lineHeight: 1.5, maxWidth: '620px' }}>
            {bestaetigt
              ? 'Deine E-Mail-Adresse wurde bestätigt. Melde dich jetzt an, um loszulegen.'
              : 'Deine Projekte werden aktuell nur in diesem Browser gespeichert. Registriere dich, damit sie dauerhaft erhalten bleiben und auf jedem Gerät verfügbar sind.'}
          </div>
        </div>
        <button onClick={() => setAuthModalOffen(true)} style={{
          padding: '10px 20px', background: '#2F4B39', color: 'white', border: 'none', borderRadius: '10px',
          cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#1F3327'}
          onMouseLeave={e => e.currentTarget.style.background = '#2F4B39'}
        >
          Anmelden / Registrieren
        </button>
      </div>
      {authModalOffen && <AuthModal onSchliessen={() => setAuthModalOffen(false)} />}
    </>
  )
}
