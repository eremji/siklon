-- Abonnements web push (US-07) : un appareil (navigateur) qui reçoit les alertes d'un utilisateur.
-- L'endpoint est l'adresse fournie par le service push du navigateur ; p256dh et auth sont les clés
-- publiques qui chiffrent le contenu des notifications. Un endpoint désigne un seul appareil, donc
-- un seul compte : le dernier qui l'enregistre. Supprimer un utilisateur supprime ses abonnements.
create table public.abonnements_push (
  endpoint text primary key,
  utilisateur_id uuid not null references public.utilisateurs (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  cree_le timestamptz not null default current_timestamp
);

create index abonnements_push_utilisateur on public.abonnements_push (utilisateur_id);

-- Comme pour les autres tables : RLS activé, aucune politique pour anon et authenticated.
alter table public.abonnements_push enable row level security;

grant select, insert, update, delete on public.abonnements_push to siklon_comptes;
create policy comptes on public.abonnements_push for all to siklon_comptes using (true) with check (true);
