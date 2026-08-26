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

  const value = useMemo(() => ({
    user: session?.user ?? null,
    ladeStatus,
    signUp, signIn, signInWithGoogle, signOut,
  }), [session, ladeStatus, signUp, signIn, signInWithGoogle, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört fachlich zum Context, nicht in eigene Datei ausgelagert
export function useAuth() {
  return useContext(AuthContext)
}
