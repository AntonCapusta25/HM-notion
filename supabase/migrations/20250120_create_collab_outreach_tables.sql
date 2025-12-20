-- Migration: Create Collab Outreach Tables
-- Description: Add separate tables for internal team (collab) outreach to chefs

-- Create collab_segments table
CREATE TABLE IF NOT EXISTS public.collab_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  description text,
  color varchar DEFAULT '#3B82F6',
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collab_leads table
CREATE TABLE IF NOT EXISTS public.collab_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  email varchar NOT NULL,
  restaurant_name varchar,
  city varchar,
  phone varchar,
  cuisine_type varchar,
  status varchar DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'converted', 'not_interested')),
  notes text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  segment_id uuid REFERENCES public.collab_segments(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_contacted_at timestamptz
);

-- Create collab_campaigns table
CREATE TABLE IF NOT EXISTS public.collab_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  description text,
  segment_id uuid REFERENCES public.collab_segments(id) ON DELETE SET NULL,
  status varchar DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed')),
  subject_line varchar NOT NULL,
  email_template text NOT NULL,
  scheduled_at timestamptz,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{"track_opens": true, "track_clicks": true, "max_emails_per_day": 50, "delay_between_emails": 5}'::jsonb
);

-- Create collab_emails table
CREATE TABLE IF NOT EXISTS public.collab_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.collab_campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.collab_leads(id) ON DELETE CASCADE,
  status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'failed')),
  subject_line varchar,
  email_content text,
  personalized_content jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  tracking_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collab_activities table for tracking interactions
CREATE TABLE IF NOT EXISTS public.collab_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.collab_leads(id) ON DELETE CASCADE,
  activity_type varchar NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Add outreach_type to outreach_settings
ALTER TABLE public.outreach_settings
ADD COLUMN IF NOT EXISTS outreach_type varchar DEFAULT 'client' CHECK (outreach_type IN ('collab', 'client'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collab_leads_workspace ON public.collab_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_collab_leads_segment ON public.collab_leads(segment_id);
CREATE INDEX IF NOT EXISTS idx_collab_leads_email ON public.collab_leads(email);
CREATE INDEX IF NOT EXISTS idx_collab_leads_status ON public.collab_leads(status);

CREATE INDEX IF NOT EXISTS idx_collab_campaigns_workspace ON public.collab_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_collab_campaigns_segment ON public.collab_campaigns(segment_id);
CREATE INDEX IF NOT EXISTS idx_collab_campaigns_status ON public.collab_campaigns(status);

CREATE INDEX IF NOT EXISTS idx_collab_emails_campaign ON public.collab_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_collab_emails_lead ON public.collab_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_collab_emails_status ON public.collab_emails(status);

CREATE INDEX IF NOT EXISTS idx_collab_activities_lead ON public.collab_activities(lead_id);

-- Add RLS policies (Row Level Security)
ALTER TABLE public.collab_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_activities ENABLE ROW LEVEL SECURITY;

-- Policies for collab_segments
CREATE POLICY "Users can view segments in their workspace"
  ON public.collab_segments FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create segments in their workspace"
  ON public.collab_segments FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update segments in their workspace"
  ON public.collab_segments FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete segments in their workspace"
  ON public.collab_segments FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Policies for collab_leads
CREATE POLICY "Users can view leads in their workspace"
  ON public.collab_leads FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create leads in their workspace"
  ON public.collab_leads FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update leads in their workspace"
  ON public.collab_leads FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete leads in their workspace"
  ON public.collab_leads FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Policies for collab_campaigns
CREATE POLICY "Users can view campaigns in their workspace"
  ON public.collab_campaigns FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create campaigns in their workspace"
  ON public.collab_campaigns FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update campaigns in their workspace"
  ON public.collab_campaigns FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete campaigns in their workspace"
  ON public.collab_campaigns FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Policies for collab_emails
CREATE POLICY "Users can view emails in their workspace"
  ON public.collab_emails FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create emails in their workspace"
  ON public.collab_emails FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update emails in their workspace"
  ON public.collab_emails FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Policies for collab_activities
CREATE POLICY "Users can view activities in their workspace"
  ON public.collab_activities FOR SELECT
  USING (lead_id IN (
    SELECT id FROM public.collab_leads WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can create activities in their workspace"
  ON public.collab_activities FOR INSERT
  WITH CHECK (lead_id IN (
    SELECT id FROM public.collab_leads WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

-- Comments for documentation
COMMENT ON TABLE public.collab_segments IS 'Segments for grouping chef leads (internal team outreach)';
COMMENT ON TABLE public.collab_leads IS 'Chef leads for internal team outreach';
COMMENT ON TABLE public.collab_campaigns IS 'Email campaigns targeting chefs (internal team)';
COMMENT ON TABLE public.collab_emails IS 'Email tracking for collab campaigns';
COMMENT ON TABLE public.collab_activities IS 'Activity log for chef lead interactions';
