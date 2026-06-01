-- Schedule the send-daily-task-digest edge function
-- 10:00 UTC corresponds to 12:00 PM local time (CEST/EET)

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

  v_base_url := format('https://%s.supabase.co/functions/v1', v_project_ref);

  -- Unschedule if exists to avoid duplicates
  BEGIN
    PERFORM cron.unschedule('send-daily-task-digest-cron');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Schedule the digest to run at 10:00 UTC (12:00 PM local)
  PERFORM cron.schedule(
    'send-daily-task-digest-cron',
    '0 10 * * *',
    format(
      $cmd$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb)$cmd$,
      v_base_url || '/send-daily-task-digest',
      v_headers::text
    )
  );
END $$;
