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
