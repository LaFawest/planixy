// Löscht das Konto des aufrufenden Nutzers endgültig (samt aller Projekte).
// Braucht den Service-Role-Key (auth.admin.deleteUser) — ein Client kann sich nicht selbst
// löschen, deshalb läuft das hier statt in ProjekteListeContext/AuthContext.
//
// Deployment: supabase functions deploy delete-account
// (oder manuell über das Supabase-Dashboard: Edge Functions → New Function → diesen Code einfügen)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const fehlerAntwort = (meldung: string, status: number) =>
  new Response(JSON.stringify({ error: meldung }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return fehlerAntwort('Nicht angemeldet.', 401)
    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Mit dem ANON-Key initialisiert, damit getUser() den Token wie ein normaler Client prüft
    // (kein erweiterter Zugriff) — dient hier nur der Authentifizierung des Aufrufers.
    const anonClient = createClient(supabaseUrl, anonKey)
    const { data: { user }, error: nutzerFehler } = await anonClient.auth.getUser(token)
    if (nutzerFehler || !user) return fehlerAntwort('Nicht angemeldet.', 401)

    // Nur Nutzer mit E-Mail/Passwort-Identity müssen ihr Passwort bestätigen — bei reinem
    // Google-Login reicht die gültige Session, die Texteingabe im Frontend ist dort nur ein
    // Versehens-Schutz (UX), kein serverseitiger Sicherheitscheck.
    const hatPasswort = user.identities?.some((i) => i.provider === 'email') ?? false
    if (hatPasswort) {
      const { password } = await req.json().catch(() => ({ password: undefined }))
      if (!password) return fehlerAntwort('Bitte gib dein Passwort ein.', 400)

      const { error: loginFehler } = await anonClient.auth.signInWithPassword({
        email: user.email!,
        password,
      })
      if (loginFehler) return fehlerAntwort('Passwort ist falsch.', 401)
    }

    // Ab hier mit dem Service-Role-Key: RLS umgehen, um explizit alle Projekte des Nutzers zu
    // löschen (nicht auf eine eventuelle ON DELETE CASCADE-Regel verlassen), dann das Konto selbst.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { error: projekteFehler } = await adminClient.from('projekte').delete().eq('user_id', user.id)
    if (projekteFehler) return fehlerAntwort(`Projekte konnten nicht gelöscht werden: ${projekteFehler.message}`, 500)

    const { error: kontoFehler } = await adminClient.auth.admin.deleteUser(user.id)
    if (kontoFehler) return fehlerAntwort(`Konto konnte nicht gelöscht werden: ${kontoFehler.message}`, 500)

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return fehlerAntwort(`Unerwarteter Fehler: ${e instanceof Error ? e.message : String(e)}`, 500)
  }
})
