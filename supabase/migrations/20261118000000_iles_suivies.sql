-- Îles suivies par chaque utilisateur (US-05). L'île est désignée par son identifiant d'URL
-- (`slug` de src/lib/iles.ts), vérifié par le site avant l'écriture.
-- Supprimer un utilisateur supprime en cascade ses îles suivies.

create table public.iles_suivies (
  utilisateur_id uuid not null references public.utilisateurs (id) on delete cascade,
  ile text not null,
  cree_le timestamptz not null default current_timestamp,
  primary key (utilisateur_id, ile)
);

-- Comme pour les autres tables : RLS activé, aucune politique pour anon et authenticated.
alter table public.iles_suivies enable row level security;

grant select, insert, delete on public.iles_suivies to siklon_comptes;
create policy comptes on public.iles_suivies for all to siklon_comptes using (true) with check (true);
