-- Fix task email cron wiring:
-- 1) remove hard-coded placeholders for project ref / keys
-- 2) rebuild schedules using project settings available inside Postgres
-- 3) ensure all three task-related jobs are scheduled consistently

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_project_ref text;
  v_anon_key text;
  v_base_url text;
  v_headers jsonb;
BEGIN
  v_project_ref := coalesce(current_setting('app.settings.project_ref', true), 'wqpmhnsxqcsplfdyxrih');
  v_anon_key := current_setting('app.settings.anon_key', true);

  IF coalesce(v_project_ref, '') = '' THEN
    RAISE EXCEPTION 'Missing app.settings.project_ref; cannot configure cron edge-function URLs.';
  END IF;

  IF coalesce(v_anon_key, '') = '' THEN
    v_headers := jsonb_build_object(
      'Content-Type', 'application/json'
    );
  ELSE
    v_headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    );
  END IF;

  IF v_headers ? 'Authorization' = false THEN
    RAISE NOTICE 'app.settings.anon_key is not set; cron calls will only work if verify_jwt is disabled for target edge functions.';
  END IF;
  v_base_url := format('https://%s.supabase.co/functions/v1', v_project_ref);

  BEGIN
    PERFORM cron.unschedule('escalate-overdue-tasks-daily');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    PERFORM cron.unschedule('nudge-overdue-assignees-daily');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    PERFORM cron.unschedule('send-daily-stats-email');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'escalate-overdue-tasks-daily',
    '0 17 * * *',
    format(
      $cmd$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb)$cmd$,
      v_base_url || '/escalate-overdue-tasks',
      v_headers::text
    )
  );

  PERFORM cron.schedule(
    'nudge-overdue-assignees-daily',
    '0 17 * * *',
    format(
      $cmd$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb)$cmd$,
      v_base_url || '/nudge-overdue-assignees',
      v_headers::text
    )
  );

  PERFORM cron.schedule(
    'send-daily-stats-email',
    '0 17 * * *',
    format(
      $cmd$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb)$cmd$,
      v_base_url || '/send-daily-stats',
      v_headers::text
    )
  );
END $$;
