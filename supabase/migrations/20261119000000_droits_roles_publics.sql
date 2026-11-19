-- Rôles de l'API Supabase (#80) : Siklon ne passe jamais par cette API (PostgREST). Le site et
-- le script d'import se connectent en Postgres direct avec leurs propres rôles (siklon_lecture,
-- siklon_import, siklon_comptes). Supabase donne pourtant par défaut tous les droits à anon et
-- authenticated sur ce qui est créé dans `public` : RLS restait la seule barrière.
-- On retire ces droits sur l'existant et sur tout ce que le rôle des migrations créera ensuite.
-- Sans effet sur un Postgres qui n'a pas ces rôles (CI, PGlite).

do $$
begin
  if exists (select from pg_roles where rolname = 'anon')
     and exists (select from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from anon, authenticated;
    revoke all on all sequences in schema public from anon, authenticated;
    revoke all on all functions in schema public from anon, authenticated;

    alter default privileges in schema public revoke all on tables from anon, authenticated;
    alter default privileges in schema public revoke all on sequences from anon, authenticated;
    alter default privileges in schema public revoke all on functions from anon, authenticated;
  end if;
end
$$;
