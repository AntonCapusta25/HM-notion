-- Add escalated_at column to tasks table to track when an escalation email was sent
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE;

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the escalation function to run daily at 00:00 UTC
-- Note: Replace the URL with your project's Edge Function URL if needed, 
-- but using the internal service role key is usually preferred for cron jobs.
-- This requires the supabase_functions extension or similar.
-- For now, we set up the cron to call the edge function via HTTP.

SELECT cron.schedule(
    'escalate-overdue-tasks-daily',
    '0 0 * * *',
    $$
    SELECT
      net.http_post(
        url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/escalate-overdue-tasks',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'service_role_key')
        ),
        body := '{}'
      )
    $$
);

-- Note: The above SQL assumes a 'settings' table or similar for URL/Key.
-- If not available, we might need a more direct way or manual setup in Supabase UI.
-- However, standard Supabase projects often use secrets that are not directly available in SQL.
-- A better approach for cron in Supabase is often to use the dashboard, 
-- but we can provide the SQL as a template.
