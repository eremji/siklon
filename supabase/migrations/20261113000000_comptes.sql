-- Comptes utilisateurs (US-05), gérés par Better Auth (src/lib/auth/options.ts).
-- Le schéma suit exactement ce qu'attend Better Auth (vérifié par src/lib/db/comptes.test.ts).
-- Données minimales (RGPD) : ni nom, ni photo, ni IP, ni navigateur ne sont conservés ;
-- les colonnes correspondantes existent parce que Better Auth les exige, et restent vides.
-- Supprimer un utilisateur supprime en cascade ses sessions et ses comptes liés.

create table public.utilisateurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null unique,
  email_verifie boolean not null,
  image text,
  langue text not null check (langue in ('fr', 'en')),
  cree_le timestamptz not null default current_timestamp,
  modifie_le timestamptz not null default current_timestamp
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references public.utilisateurs (id) on delete cascade,
  jeton text not null unique,
  expire_le timestamptz not null,
  adresse_ip text,
  agent_utilisateur text,
  cree_le timestamptz not null default current_timestamp,
  modifie_le timestamptz not null
);

-- Un compte lié par moyen de connexion : « credential » (email + mot de passe haché par scrypt)
-- ou un fournisseur OAuth (Google).
create table public.comptes_lies (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references public.utilisateurs (id) on delete cascade,
  fournisseur text not null,
  compte_fournisseur text not null,
  jeton_acces text,
  jeton_rafraichissement text,
  jeton_identite text,
  jeton_acces_expire_le timestamptz,
  jeton_rafraichissement_expire_le timestamptz,
  portee text,
  mot_de_passe_hache text,
  cree_le timestamptz not null default current_timestamp,
  modifie_le timestamptz not null
);

-- Jetons à usage unique (confirmation d'adresse, réinitialisation du mot de passe).
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  identifiant text not null,
  valeur text not null,
  expire_le timestamptz not null,
  cree_le timestamptz not null default current_timestamp,
  modifie_le timestamptz not null default current_timestamp
);

-- Compteurs de tentatives par adresse IP et par route, purgés par Better Auth une fois expirés.
create table public.limites_tentatives (
  id uuid primary key default gen_random_uuid(),
  cle text not null unique,
  nombre integer not null,
  derniere_requete bigint not null
);

create index sessions_utilisateur_id_idx on public.sessions (utilisateur_id);
create index comptes_lies_utilisateur_id_idx on public.comptes_lies (utilisateur_id);
create index verifications_identifiant_idx on public.verifications (identifiant);

-- Comme pour l'historique : RLS activé, aucune politique pour anon et authenticated (API Supabase).
alter table public.utilisateurs enable row level security;
alter table public.sessions enable row level security;
alter table public.comptes_lies enable row level security;
alter table public.verifications enable row level security;
alter table public.limites_tentatives enable row level security;

-- Rôle de connexion du site pour les comptes : accès à ces tables seulement.
-- Son mot de passe n'est jamais dans le dépôt : il est défini hors migration.
do $$
begin
  if not exists (select from pg_roles where rolname = 'siklon_comptes') then
    create role siklon_comptes login;
  end if;
end
$$;

grant usage on schema public to siklon_comptes;
grant select, insert, update, delete
  on public.utilisateurs, public.sessions, public.comptes_lies, public.verifications, public.limites_tentatives
  to siklon_comptes;

create policy comptes on public.utilisateurs for all to siklon_comptes using (true) with check (true);
create policy comptes on public.sessions for all to siklon_comptes using (true) with check (true);
create policy comptes on public.comptes_lies for all to siklon_comptes using (true) with check (true);
create policy comptes on public.verifications for all to siklon_comptes using (true) with check (true);
create policy comptes on public.limites_tentatives for all to siklon_comptes using (true) with check (true);
