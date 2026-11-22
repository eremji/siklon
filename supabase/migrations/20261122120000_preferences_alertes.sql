-- Préférences d'alerte (US-07, US-13) : aucune alerte par e-mail sans accord explicite de
-- l'utilisateur. Sans ligne, l'accord n'est pas donné. Le web push n'en a pas besoin : abonner un
-- appareil (bouton de la page Compte) vaut accord. Supprimer un utilisateur supprime ses préférences.
create table public.preferences_alertes (
  utilisateur_id uuid primary key references public.utilisateurs (id) on delete cascade,
  email boolean not null default false,
  modifie_le timestamptz not null default current_timestamp
);

-- Comme pour les autres tables : RLS activé, aucune politique pour anon et authenticated.
alter table public.preferences_alertes enable row level security;

grant select, insert, update on public.preferences_alertes to siklon_comptes;
create policy comptes on public.preferences_alertes for all to siklon_comptes using (true) with check (true);
