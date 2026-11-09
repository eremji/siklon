-- Rôles de connexion à moindre privilège pour l'historique (US-04) :
--   siklon_lecture : le site (lecture seule) ;
--   siklon_import  : le script d'import HURDAT2.
-- Les mots de passe ne sont jamais dans le dépôt : ils sont définis hors migration.
-- Les politiques RLS ne visent que ces rôles : anon et authenticated (API Supabase) n'ont toujours rien.

do $$
begin
  if not exists (select from pg_roles where rolname = 'siklon_lecture') then
    create role siklon_lecture login;
  end if;
  if not exists (select from pg_roles where rolname = 'siklon_import') then
    create role siklon_import login;
  end if;
end
$$;

grant usage on schema public to siklon_lecture, siklon_import;

grant select on public.hurdat2_imports, public.hurdat2_tempetes, public.hurdat2_points, public.passages_iles
  to siklon_lecture;
grant select, insert, delete on public.hurdat2_imports, public.hurdat2_tempetes, public.hurdat2_points, public.passages_iles
  to siklon_import;

create policy lecture on public.hurdat2_imports for select to siklon_lecture using (true);
create policy lecture on public.hurdat2_tempetes for select to siklon_lecture using (true);
create policy lecture on public.hurdat2_points for select to siklon_lecture using (true);
create policy lecture on public.passages_iles for select to siklon_lecture using (true);

create policy import on public.hurdat2_imports for all to siklon_import using (true) with check (true);
create policy import on public.hurdat2_tempetes for all to siklon_import using (true) with check (true);
create policy import on public.hurdat2_points for all to siklon_import using (true) with check (true);
create policy import on public.passages_iles for all to siklon_import using (true) with check (true);
