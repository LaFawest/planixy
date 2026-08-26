import { supabase } from '../supabaseClient'
import { SCHEMA_VERSION, migriereProjekteDaten } from './projekteStorage'

const TABELLE = 'projekte'

// Baut aus einer DB-Zeile ({id, name, data: {schemaVersion, raeume, gruppe}, created_at, updated_at}) ein
// App-Projekt — läuft dabei durch dieselbe Migrationskette wie localStorage (migriereProjekteDaten),
// damit ein künftiger Schema-Bump beide Quellen automatisch gleich behandelt. undefined bei
// unbekannter/fehlender schemaVersion, statt die App abstürzen zu lassen — der Aufrufer filtert das.
const zeileZuProjekt = (zeile) => {
  const migriert = migriereProjekteDaten({
    schemaVersion: zeile.data?.schemaVersion,
    projekte: [{
      id: zeile.id, name: zeile.name, erstelltAm: zeile.created_at, geaendertAm: zeile.updated_at,
      raeume: zeile.data?.raeume, gruppe: zeile.data?.gruppe ?? null,
    }],
  })
  return migriert?.[0]
}

export async function ladeProjekteSupabase(userId) {
  const { data, error } = await supabase.from(TABELLE).select('*').eq('user_id', userId).order('created_at')
  if (error) throw error
  return data.map(zeileZuProjekt).filter(Boolean)
}

export async function erstelleProjektSupabase(userId, projekt) {
  const { error } = await supabase.from(TABELLE).insert({
    id: projekt.id, user_id: userId, name: projekt.name,
    data: { schemaVersion: SCHEMA_VERSION, raeume: projekt.raeume, gruppe: projekt.gruppe ?? null },
  })
  if (error) throw error
}

// Update statt Upsert: erstelleProjektSupabase legt die Zeile an, hier wird nur noch der Inhalt
// eines bereits existierenden Projekts fortgeschrieben (Debounce in ProjekteListeContext.jsx).
export async function speichereProjektSupabase(userId, projekt) {
  const { error } = await supabase.from(TABELLE)
    .update({
      name: projekt.name, updated_at: new Date().toISOString(),
      data: { schemaVersion: SCHEMA_VERSION, raeume: projekt.raeume, gruppe: projekt.gruppe ?? null },
    })
    .eq('id', projekt.id).eq('user_id', userId)
  if (error) throw error
}

export async function loescheProjektSupabase(userId, projektId) {
  const { error } = await supabase.from(TABELLE).delete().eq('id', projektId).eq('user_id', userId)
  if (error) throw error
}
