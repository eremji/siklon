-- Données à jour (US-11) : dernière lecture réussie de chaque source officielle.
-- La vérification de chaque minute (siklon_comptes) l'écrit quand la source répond ; le site
-- (siklon_lecture) la relit quand la source ne répond plus, pour afficher la dernière donnée connue
-- avec son heure et un avertissement. Le contenu est la réponse brute de la source, relue par le
-- même lecteur que la réponse en direct.
create table public.dernieres_lectures (
  -- Source lue : « nhc-systemes » (CurrentStorms.json)…
  source text primary key,
  contenu jsonb not null,
  -- Heure à laquelle Siklon a lu la source.
  lu_le timestamptz not null
);

-- Comme pour les autres tables : RLS activé, aucune politique pour anon et authenticated.
alter table public.dernieres_lectures enable row level security;

grant select, insert, update on public.dernieres_lectures to siklon_comptes;
grant select on public.dernieres_lectures to siklon_lecture;
create policy comptes on public.dernieres_lectures for all to siklon_comptes using (true) with check (true);
create policy lecture on public.dernieres_lectures for select to siklon_lecture using (true);
