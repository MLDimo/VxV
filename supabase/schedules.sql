-- The website's tasks that must run more often than Vercel's daily ones (its free plan), scheduled by the production
-- database: pg_cron calls the website with pg_net every 5 minutes, with the token both read in the scheduler table.
-- Idempotent: run by the production deploy (.github/workflows/deploy-database.yml) after the migrations.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- The soft reserves' reminder, an hour before each raid night (app/api/cron/rappels-sr).
select cron.schedule(
  'vxv-rappels-sr',
  '*/5 * * * *',
  $$
    select net.http_get(
      url := 'https://vxv-web.vercel.app/api/cron/rappels-sr',
      headers := jsonb_build_object('Authorization', 'Bearer ' || (select token from public.scheduler))
    )
  $$
);
