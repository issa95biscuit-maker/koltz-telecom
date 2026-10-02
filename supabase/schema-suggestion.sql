-- KOLTZ · Suggestion de schéma pour la pré-inscription SQUAD
-- ⚠️ NON APPLIQUÉ. À relire puis exécuter dans le SQL editor d'un projet Supabase (re)créé.
-- Le site envoie uniquement des INSERT (aucune lecture de lignes) avec la clé publishable (rôle anon).

create table if not exists public.waitlist (
  id          bigint generated always as identity primary key,
  email       text not null unique,
  source      text not null default 'site',
  created_at  timestamptz not null default now()
);

create table if not exists public.abonnes (
  id             bigint generated always as identity primary key,
  email          text not null,
  nom            text,
  prenom         text not null,
  forfait        text not null check (forfait in ('mini','max','ultra','infinity')), -- ids stables, indépendants des noms affichés
  statut         text not null default 'pending',
  code_parrain   text,
  points         integer not null default 0,
  -- Nouveaux champs SQUAD (tous optionnels)
  squad_mode     text check (squad_mode in ('creer','rejoindre')),   -- null = solo
  squad_nom      text check (char_length(squad_nom) <= 24),
  squad_code     text check (squad_code ~ '^SQD-[A-HJ-NP-Z2-9]{6}$'),
  code_createur  text check (code_createur ~ '^[A-Z0-9-]{3,20}$'),
  created_at     timestamptz not null default now()
);

-- Si la table abonnes existe déjà :
alter table public.abonnes add column if not exists squad_mode    text;
alter table public.abonnes add column if not exists squad_nom     text;
alter table public.abonnes add column if not exists squad_code    text;
alter table public.abonnes add column if not exists code_createur text;
create index if not exists abonnes_squad_code_idx on public.abonnes (squad_code);

-- RLS : anon peut seulement insérer, jamais lire / modifier / supprimer.
alter table public.waitlist enable row level security;
alter table public.abonnes  enable row level security;

drop policy if exists "anon insert waitlist" on public.waitlist;
create policy "anon insert waitlist" on public.waitlist
  for insert to anon with check (char_length(email) between 5 and 120);

drop policy if exists "anon insert abonnes" on public.abonnes;
create policy "anon insert abonnes" on public.abonnes
  for insert to anon with check (statut = 'pending' and points = 0 and code_parrain is null);

-- Compteur public de pré-inscrits (le site fait un HEAD count sur waitlist) :
-- RLS bloque le SELECT pour anon, donc le compteur reste masqué (comportement voulu tant qu'il n'y a pas de vrai chiffre).
-- Pour l'afficher sans exposer les emails, préférer une fonction dédiée, par ex. :
-- create or replace function public.waitlist_count() returns bigint language sql security definer set search_path = public
--   as $$ select count(*) from public.waitlist $$;
-- grant execute on function public.waitlist_count() to anon;
-- (puis adapter loadWaitlistCount() dans assets/js/koltz.js pour appeler supa.rpc('waitlist_count'))

-- Note : l'upsert du site (on_conflict=email, ignore-duplicates) nécessite la contrainte unique sur waitlist.email (ci-dessus).
