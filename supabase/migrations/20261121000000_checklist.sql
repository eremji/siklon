-- État de la checklist de préparation de chaque utilisateur (US-08). L'élément est désigné par son
-- identifiant stable (src/lib/checklist/contenu.ts), vérifié par le site avant l'écriture.
-- L'état vaut pour le foyer, quelle que soit l'île consultée. `masque` sert au masquage des
-- éléments (livraison 3). Table simple, pour l'export des données (US-13).
-- Supprimer un utilisateur supprime en cascade l'état de sa checklist.

create table public.checklist_elements (
  utilisateur_id uuid not null references public.utilisateurs (id) on delete cascade,
  element text not null,
  coche boolean not null default false,
  masque boolean not null default false,
  modifie_le timestamptz not null default current_timestamp,
  primary key (utilisateur_id, element)
);

-- Comme pour les autres tables : RLS activé, aucune politique pour anon et authenticated.
alter table public.checklist_elements enable row level security;

grant select, insert, update, delete on public.checklist_elements to siklon_comptes;
create policy comptes on public.checklist_elements for all to siklon_comptes using (true) with check (true);
