-- Notifications (US-07).

-- Dernier niveau d'alerte connu de chaque île : vigilance Météo-France (vert, jaune…) ou
-- watch/warning NHC le plus grave (HWR, TWR, HWA, TWA, ou « aucune »). Sert à détecter les
-- changements de niveau. L'île est désignée par son identifiant d'URL (src/lib/iles.ts).
create table public.niveaux_alerte_iles (
  ile text primary key,
  niveau text not null,
  -- Heure de mise à jour de la source qui a donné ce niveau.
  mis_a_jour timestamptz not null,
  modifie_le timestamptz not null default current_timestamp
);

-- Journal des notifications : une ligne par alerte, utilisateur et canal. La clé primaire
-- empêche d'envoyer deux fois la même alerte par le même canal. Supprimer un utilisateur
-- supprime son journal en cascade.
create table public.notifications_envoyees (
  utilisateur_id uuid not null references public.utilisateurs (id) on delete cascade,
  cle text not null,
  canal text not null check (canal in ('push', 'email')),
  cree_le timestamptz not null default current_timestamp,
  primary key (utilisateur_id, cle, canal)
);

-- Comme pour les autres tables : RLS activé, aucune politique pour anon et authenticated.
alter table public.niveaux_alerte_iles enable row level security;
alter table public.notifications_envoyees enable row level security;

grant select, insert, update on public.niveaux_alerte_iles to siklon_comptes;
grant select, insert on public.notifications_envoyees to siklon_comptes;
create policy comptes on public.niveaux_alerte_iles for all to siklon_comptes using (true) with check (true);
create policy comptes on public.notifications_envoyees for all to siklon_comptes using (true) with check (true);
