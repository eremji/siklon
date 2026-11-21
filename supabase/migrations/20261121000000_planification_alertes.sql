-- Déclenchement planifié des alertes (US-07) : chaque minute, pg_cron fait envoyer par pg_net une
-- requête POST à la route /api/alertes/verifier de Siklon, qui lit les sources et prévient les abonnés.
--
-- L'adresse de la route et le secret partagé ne sont jamais dans le dépôt : ils vivent dans le Vault
-- de Supabase, saisis une fois dans l'éditeur SQL du projet :
--   select vault.create_secret('<adresse du site>/api/alertes/verifier', 'siklon_alertes_url');
--   select vault.create_secret('<valeur de ALERTES_CRON_SECRET>', 'siklon_alertes_secret');
-- Tant qu'ils manquent, la tâche ne fait rien.
--
-- Seul Supabase a pg_cron et pg_net : ailleurs (PGlite, base de CI, siklon_e2e), la migration ne fait
-- rien. Elle peut être rejouée : cron.schedule remplace une tâche du même nom.
do $migration$
begin
  if not exists (select from pg_available_extensions where name = 'pg_cron')
     or not exists (select from pg_available_extensions where name = 'pg_net')
     or not exists (select from pg_namespace where nspname = 'vault') then
    raise notice 'pg_cron, pg_net ou le Vault absent : planification des alertes ignorée.';
    return;
  end if;

  create extension if not exists pg_cron;
  create extension if not exists pg_net;

  perform cron.schedule(
    'siklon-verifier-alertes',
    '* * * * *',
    $tache$
      select net.http_post(
        url := s.url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.secret),
        body := '{}'::jsonb,
        -- La route peut durer jusqu'à 60 s (maxDuration) ; pg_net n'attend pas, la tâche finit tout de suite.
        timeout_milliseconds := 55000
      )
      from (
        select
          (select decrypted_secret from vault.decrypted_secrets where name = 'siklon_alertes_url') as url,
          (select decrypted_secret from vault.decrypted_secrets where name = 'siklon_alertes_secret') as secret
      ) s
      where s.url is not null and s.secret is not null
    $tache$
  );

  -- pg_cron garde une ligne par exécution (1 440 par jour) : on n'en garde que 7 jours.
  perform cron.schedule(
    'siklon-purger-historique-cron',
    '17 3 * * *',
    $tache$ delete from cron.job_run_details where end_time < now() - interval '7 days' $tache$
  );
end
$migration$;
