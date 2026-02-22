-- Migration: Gmail Connections & Unified Email Log
-- Description: Multi-tenant email intelligence platform tables

-- =============================================
-- gmail_connections: stores OAuth tokens per workspace per account
-- =============================================
CREATE TABLE IF NOT EXISTS public.gmail_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  account_label varchar NOT NULL DEFAULT 'Primary',  -- e.g. 'Chef Outreach', 'Customer Outreach'
  gmail_address varchar NOT NULL,
  access_token text,                                  -- short-lived, refreshed automatically
  refresh_token text NOT NULL,                        -- long-lived, stored encrypted
  token_expiry timestamptz,
  last_synced_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, gmail_address)
);

-- =============================================
-- unified_email_log: one row per sent email, from any source
-- =============================================
CREATE TABLE IF NOT EXISTS public.unified_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  -- Source tracking
  source varchar NOT NULL DEFAULT 'manual' CHECK (source IN ('gmail', 'sendgrid', 'gas', 'manual')),
  gmail_connection_id uuid REFERENCES public.gmail_connections(id) ON DELETE SET NULL,
  external_id varchar,                                -- Gmail message ID / SendGrid event ID
  thread_id varchar,                                  -- Gmail thread ID (for reply detection)
  -- Email content
  subject varchar NOT NULL,
  recipient_email varchar NOT NULL,
  recipient_name varchar,
  sender_email varchar NOT NULL,
  -- Segmentation
  segment varchar,                                    -- 'chefs' | 'customers' | custom
  group_name varchar,                                 -- e.g. 'Amsterdam Chefs Wave 1'
  -- Timestamps
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  -- Status
  status varchar DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'clicked', 'replied', 'bounced', 'failed')),
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, external_id)
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_gmail_connections_workspace ON public.gmail_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_unified_email_log_workspace ON public.unified_email_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_unified_email_log_subject ON public.unified_email_log(subject);
CREATE INDEX IF NOT EXISTS idx_unified_email_log_recipient ON public.unified_email_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_unified_email_log_segment ON public.unified_email_log(segment);
CREATE INDEX IF NOT EXISTS idx_unified_email_log_sent_at ON public.unified_email_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_email_log_thread ON public.unified_email_log(thread_id);
CREATE INDEX IF NOT EXISTS idx_unified_email_log_source ON public.unified_email_log(source);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_email_log ENABLE ROW LEVEL SECURITY;

-- gmail_connections policies
CREATE POLICY "Users can view gmail connections in their workspace"
  ON public.gmail_connections FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage gmail connections in their workspace"
  ON public.gmail_connections FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- unified_email_log policies
CREATE POLICY "Users can view email log in their workspace"
  ON public.unified_email_log FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert email log in their workspace"
  ON public.unified_email_log FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update email log in their workspace"
  ON public.unified_email_log FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Service role bypass for edge functions
CREATE POLICY "Service role can manage all email logs"
  ON public.unified_email_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all gmail connections"
  ON public.gmail_connections FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE public.gmail_connections IS 'OAuth tokens for connected Gmail accounts per workspace (max 2 per workspace)';
COMMENT ON TABLE public.unified_email_log IS 'Unified email tracking log aggregating Gmail, SendGrid, GAS, and manual emails';
