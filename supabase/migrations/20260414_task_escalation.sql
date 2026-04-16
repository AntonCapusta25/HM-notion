-- ============================================================
-- Notification columns
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escalated_at  TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS nudge_sent_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- pg_cron + pg_net extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- Helper: get project ref from the Supabase built-in variable
-- ============================================================
-- NOTE: Replace <YOUR_PROJECT_REF> with your actual Supabase project ref
-- and <YOUR_SERVICE_ROLE_KEY> with your service_role key.
-- You can find both in Supabase Dashboard → Settings → API

-- ============================================================
-- 1. ESCALATION: daily at 00:00 UTC
-- ============================================================
DO $$ BEGIN PERFORM cron.unschedule('escalate-overdue-tasks-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'escalate-overdue-tasks-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/escalate-overdue-tasks',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);

-- ============================================================
-- 2. NUDGE EMAILS: daily at 15:30 UTC (5:30 PM Amsterdam / EET)
-- ============================================================
DO $$ BEGIN PERFORM cron.unschedule('nudge-overdue-assignees-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'nudge-overdue-assignees-daily',
  '30 15 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/nudge-overdue-assignees',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);

-- ============================================================
-- 3. DAILY STATS: daily at 15:30 UTC (same time, or adjust as needed)
-- ============================================================
DO $$ BEGIN PERFORM cron.unschedule('send-daily-stats-email'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'send-daily-stats-email',
  '30 15 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/send-daily-stats',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{}'::jsonb
  )
  $$
);
