-- Éléments que chaque utilisateur ajoute à sa checklist de préparation (US-08). Une seule liste
-- « Mes éléments », affichée à tous les niveaux d'alerte. Le site limite à 50 éléments par compte ;
-- la base refuse un texte vide ou de plus de 200 caractères. Table simple, pour l'export (US-13).
-- Supprimer un utilisateur supprime en cascade ses éléments.

create table public.checklist_elements_perso (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references public.utilisateurs (id) on delete cascade,
  texte text not null check (char_length(texte) between 1 and 200),
  coche boolean not null default false,
  cree_le timestamptz not null default current_timestamp,
  modifie_le timestamptz not null default current_timestamp
);

create index checklist_elements_perso_utilisateur on public.checklist_elements_perso (utilisateur_id);

-- Comme pour les autres tables : RLS activé, aucune politique pour anon et authenticated.
alter table public.checklist_elements_perso enable row level security;

grant select, insert, update, delete on public.checklist_elements_perso to siklon_comptes;
create policy comptes on public.checklist_elements_perso for all to siklon_comptes using (true) with check (true);
