-- Fix: replace synchronous extensions.http_post with async pg_net.http_post
-- in send_conditional_email_webhook trigger function.
-- 
-- Root cause: extensions.http_post() blocks the entire UPDATE transaction
-- until Google Apps Script responds. When GAS is slow/throttled (~510ms timeout),
-- Supabase aborts the write → frontend rolls back → task status reverts.
--
-- Fix: net.http_post() (pg_net) is fire-and-forget. Transaction completes
-- instantly; the webhook call happens in the background.

CREATE OR REPLACE FUNCTION send_conditional_email_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  should_send_email boolean := false;
  webhook_payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME IN ('tasks', 'task_assignees', 'task_attachments') THEN
      should_send_email := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'tasks' THEN
      IF (OLD.status IS DISTINCT FROM NEW.status) OR
         (OLD.priority IS DISTINCT FROM NEW.priority) OR
         (OLD.due_date IS DISTINCT FROM NEW.due_date) OR
         (OLD.title IS DISTINCT FROM NEW.title) THEN
        should_send_email := true;
      END IF;
    END IF;
  END IF;

  IF should_send_email THEN
    webhook_payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      'timestamp', NOW()
    );

    -- ASYNC: does NOT block the transaction (pg_net fire-and-forget)
    PERFORM net.http_post(
      url     := 'https://script.google.com/macros/s/AKfycbyZ6mTCdl5hA4y2FfgX5BKV0sYqFIAKu4TaPi-OuaAHUYKndMJxeD1Dm0KOQj3I-VBC/exec',
      body    := webhook_payload,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
