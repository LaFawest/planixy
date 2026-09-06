import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ladeStatus, setLadeStatus] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLadeStatus(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, neueSession) => {
      setSession(neueSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback((email, password) => supabase.auth.signUp({ email, password }), [])
  const signIn = useCallback((email, password) => supabase.auth.signInWithPassword({ email, password }), [])
  // redirectTo: aktuelle Seite statt fest der Startroute, damit sich Google-Login genauso verhält
  // wie E-Mail/Passwort-Login (Nutzer bleibt auf der Seite, von der aus er sich angemeldet hat) —
  // eine dort inzwischen fehlende Gast-Projekt-ID leitet ProjectsContext ohnehin schon zum Dashboard um.
  const signInWithGoogle = useCallback(() => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  }), [])
  const signOut = useCallback(() => supabase.auth.signOut(), [])
  const updateEmail = useCallback((email) => supabase.auth.updateUser({ email }), [])
  const updatePassword = useCallback((password) => supabase.auth.updateUser({ password }), [])
  // Schickt die Passwort-Reset-Mail (enthält einen Code, siehe verifyPasswortResetCode, sowie einen
  // klassischen Link). Die App verlässt sich ausschließlich auf den Code — der Link ist nicht
  // zuverlässig nutzbar, da manche Mail-Anbieter/Sicherheitsscanner Einmal-Links automatisch im
  // Hintergrund aufrufen und dadurch vor dem echten Klick verbrauchen (z.B. GMX).
  const resetPasswordForEmail = useCallback((email) => supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/',
  }), [])
  // Verifiziert den 6-stelligen Code aus der Passwort-Reset-Mail. Bei Erfolg entsteht eine gültige
  // Recovery-Session, mit der direkt danach updatePassword aufgerufen werden kann.
  const verifyPasswortResetCode = useCallback((email, code) => supabase.auth.verifyOtp({
    email, token: code, type: 'recovery',
  }), [])
  // Löscht das Konto serverseitig (Edge Function delete-account, braucht den Service-Role-Key —
  // ein Client kann sich nicht selbst per auth.admin löschen). password nur relevant, wenn der
  // Nutzer eine E-Mail/Passwort-Identity hat; die Function prüft das selbst.
  const deleteAccount = useCallback(async ({ password } = {}) => {
    const { data, error } = await supabase.functions.invoke('delete-account', { body: { password } })
    if (error) return { error }
    return { data }
  }, [])

  const value = useMemo(() => ({
    user: session?.user ?? null,
    ladeStatus,
    signUp, signIn, signInWithGoogle, signOut, updateEmail, updatePassword, deleteAccount,
    resetPasswordForEmail, verifyPasswortResetCode,
  }), [session, ladeStatus, signUp, signIn, signInWithGoogle, signOut, updateEmail, updatePassword, deleteAccount,
    resetPasswordForEmail, verifyPasswortResetCode])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useAuth() {
  return useContext(AuthContext)
}
