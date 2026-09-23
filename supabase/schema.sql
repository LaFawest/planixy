-- Planixy: Grundschema für Projekt-Speicherung in Supabase
-- Im SQL-Editor des Supabase-Projekts ausführen.

create table if not exists projekte (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table projekte enable row level security;

create policy "Nutzer lesen eigene Projekte"
  on projekte for select
  using (auth.uid() = user_id);

create policy "Nutzer legen eigene Projekte an"
  on projekte for insert
  with check (auth.uid() = user_id);

create policy "Nutzer aktualisieren eigene Projekte"
  on projekte for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Nutzer loeschen eigene Projekte"
  on projekte for delete
  using (auth.uid() = user_id);

-- RLS-Policies allein reichen nicht: ohne diese GRANTs verweigert Postgres jeden Zugriff schon auf
-- Tabellenebene, bevor die Policies überhaupt greifen (anders als beim Anlegen über den Table
-- Editor, der das GRANT automatisch mit setzt).
--
-- Zwei Rollen brauchen Rechte, aus verschiedenen Gruenden:
--   authenticated -- der angemeldete Nutzer selbst, gefiltert durch die Policies oben.
--   service_role  -- die Edge Function delete-account. Sie umgeht RLS bewusst, um beim
--                    Kontoloeschen alle Projekte des Nutzers zu entfernen. RLS zu umgehen
--                    hilft ihr aber nichts, solange die Tabellenrechte fehlen.
-- anon bleibt aussen vor: auf projekte greift nur zu, wer angemeldet ist.
--
-- Diese GRANTs muessen im Schema stehen und nicht der Projekteinstellung "Automatically expose
-- new tables" ueberlassen werden. Die ist in neuen Projekten abschaltbar, und dann faellt genau
-- das service_role-GRANT weg -- mit der Folge, dass das Kontoloeschen mit
-- "permission denied for table projekte" scheitert.
grant select, insert, update, delete on projekte to authenticated;
grant select, insert, update, delete on projekte to service_role;
