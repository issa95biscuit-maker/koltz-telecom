-- ════════════════════════════════════════════════════════════════════════════
-- KOLTZ · Schéma Supabase de la pré-inscription (Saison 0 / SQUAD)
-- ⚠️ NON APPLIQUÉ. À exécuter UNE FOIS dans Supabase > SQL Editor (voir supabase/SETUP.md).
-- Idempotent : peut être relancé sans casser l'existant.
--
-- Modèle de sécurité :
--   • le site utilise la clé publishable (rôle `anon`) et ne fait QUE des INSERT ;
--   • anon ne peut ni lire, ni modifier, ni supprimer (RLS + privilèges par colonne) ;
--   • anon ne peut écrire que les colonnes listées dans les GRANT ci-dessous :
--     statut, points, created_at… sont fixés par la base (valeurs par défaut) ;
--   • contraintes de format / longueur = pas de champs géants ni de données farfelues ;
--   • email unique (en minuscules) = une seule inscription par adresse, pas de spam en boucle.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Table waitlist (liste d'attente : email seul) ─────────────────────────
create table if not exists public.waitlist (
  id                   bigint generated always as identity primary key,
  email                text        not null,
  source               text        not null default 'site',
  consentement         boolean     not null default false,   -- case « J'accepte… » cochée
  consentement_version text,                                  -- version du texte accepté (ex. '2026-10-pre')
  created_at           timestamptz not null default now(),
  constraint waitlist_email_unique unique (email),
  constraint waitlist_email_format check (email = lower(email) and char_length(email) between 6 and 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint waitlist_source_format check (source ~ '^[a-z0-9_-]{1,32}$'),
  constraint waitlist_version_format check (consentement_version is null or char_length(consentement_version) <= 32)
);

-- ── 2. Table abonnes (pré-inscription détaillée : prénom, forfait, squad) ─────
create table if not exists public.abonnes (
  id                   bigint generated always as identity primary key,
  email                text        not null,
  nom                  text,
  prenom               text        not null,
  forfait              text        not null,
  statut               text        not null default 'pending',
  code_parrain         text,
  points               integer     not null default 0,
  squad_mode           text,                                   -- null = solo
  squad_nom            text,
  squad_code           text,
  code_createur        text,
  consentement         boolean     not null default false,
  consentement_version text,
  created_at           timestamptz not null default now()
);

-- Si la table existait déjà (ancien projet), ajouter ce qui manque :
alter table public.abonnes add column if not exists squad_mode           text;
alter table public.abonnes add column if not exists squad_nom            text;
alter table public.abonnes add column if not exists squad_code           text;
alter table public.abonnes add column if not exists code_createur        text;
alter table public.abonnes add column if not exists consentement         boolean not null default false;
alter table public.abonnes add column if not exists consentement_version text;
alter table public.abonnes add column if not exists created_at           timestamptz not null default now();

-- Contraintes (supprimées puis recréées pour rester idempotent)
alter table public.abonnes drop constraint if exists abonnes_email_unique;
alter table public.abonnes add  constraint abonnes_email_unique unique (email);
alter table public.abonnes drop constraint if exists abonnes_checks;
alter table public.abonnes add  constraint abonnes_checks check (
      email = lower(email) and char_length(email) between 6 and 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and char_length(prenom) between 1 and 40
  and forfait in ('mini','max','ultra','infinity')          -- ids stables (les noms affichés peuvent changer)
  and (squad_mode    is null or squad_mode in ('creer','rejoindre'))
  and (squad_nom     is null or char_length(squad_nom) <= 24)
  and (squad_code    is null or squad_code ~ '^SQD-[A-HJ-NP-Z2-9]{6}$')
  and (squad_code    is not null or squad_mode is null)     -- créer/rejoindre ⇒ un code
  and (code_createur is null or code_createur ~ '^[A-Z0-9-]{3,20}$')
  and (consentement_version is null or char_length(consentement_version) <= 32)
);
create index if not exists abonnes_squad_code_idx on public.abonnes (squad_code);
create index if not exists abonnes_code_createur_idx on public.abonnes (code_createur);

-- ── 3. Privilèges : anon n'écrit que certaines colonnes, ne lit rien ──────────
revoke all on public.waitlist from anon, authenticated;
revoke all on public.abonnes  from anon, authenticated;
grant insert (email, source, consentement, consentement_version) on public.waitlist to anon;
grant insert (email, prenom, forfait, squad_mode, squad_nom, squad_code, code_createur, consentement, consentement_version) on public.abonnes to anon;

-- ── 4. RLS : INSERT seulement ─────────────────────────────────────────────────
alter table public.waitlist enable row level security;
alter table public.abonnes  enable row level security;

drop policy if exists "anon insert waitlist" on public.waitlist;
create policy "anon insert waitlist" on public.waitlist for insert to anon
  with check (true);
drop policy if exists "anon insert abonnes" on public.abonnes;
create policy "anon insert abonnes" on public.abonnes for insert to anon
  with check (statut = 'pending' and points = 0 and code_parrain is null and nom is null);
-- Quand la case de consentement sera en ligne (branche feat/legal-draft), durcir avec :
--   ... with check (consentement = true)        -- sur les deux tables
-- (voir le bloc « 6. Consentement obligatoire » en bas, à décommenter à ce moment-là)

-- ── 5. Compteur public (optionnel) ────────────────────────────────────────────
-- Le site fait un « HEAD count » sur waitlist ; sans droit SELECT il échoue et le compteur reste masqué
-- (comportement voulu : pas de faux chiffre). Pour afficher un vrai compteur sans exposer les emails :
-- create or replace function public.waitlist_count() returns bigint
--   language sql stable security definer set search_path = public
--   as $$ select count(*) from public.waitlist $$;
-- revoke all on function public.waitlist_count() from public;
-- grant execute on function public.waitlist_count() to anon;
-- (puis remplacer loadWaitlistCount() dans assets/js/koltz.js par un appel supa.rpc('waitlist_count'))

-- ── 6. Consentement obligatoire (à activer avec la case à cocher) ─────────────
-- drop policy if exists "anon insert waitlist" on public.waitlist;
-- create policy "anon insert waitlist" on public.waitlist for insert to anon
--   with check (consentement = true and consentement_version is not null);
-- drop policy if exists "anon insert abonnes" on public.abonnes;
-- create policy "anon insert abonnes" on public.abonnes for insert to anon
--   with check (consentement = true and consentement_version is not null
--               and statut = 'pending' and points = 0 and code_parrain is null and nom is null);

-- ── 7. Anti-abus (optionnel) ──────────────────────────────────────────────────
-- L'email unique empêche déjà les inscriptions en double. Supabase applique aussi ses propres limites
-- de requêtes. En cas d'attaque (milliers d'emails bidon), activer ce garde-fou global :
-- create or replace function public.koltz_throttle() returns trigger language plpgsql security definer set search_path = public as $$
-- begin
--   if (select count(*) from public.waitlist where created_at > now() - interval '1 minute') > 60 then
--     raise exception 'Trop d''inscriptions en ce moment, réessaie dans une minute' using errcode = 'P0001';
--   end if;
--   return new;
-- end $$;
-- drop trigger if exists waitlist_throttle on public.waitlist;
-- create trigger waitlist_throttle before insert on public.waitlist for each row execute function public.koltz_throttle();

-- ── 8. Vérification rapide (à lancer après) ───────────────────────────────────
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in ('waitlist','abonnes');
-- select * from pg_policies where tablename in ('waitlist','abonnes');
