-- Fix RLS policies: replace workspace_members references with workspaces.created_by
-- workspace_members table is empty; the app uses workspaces.created_by for ownership

-- unified_email_log policies
DROP POLICY IF EXISTS "Users can view email log in their workspace" ON public.unified_email_log;
DROP POLICY IF EXISTS "Users can insert email log in their workspace" ON public.unified_email_log;
DROP POLICY IF EXISTS "Users can update email log in their workspace" ON public.unified_email_log;

CREATE POLICY "Users can view email log in their workspace"
  ON public.unified_email_log FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE created_by = auth.uid()));

CREATE POLICY "Users can insert email log in their workspace"
  ON public.unified_email_log FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE created_by = auth.uid()));

CREATE POLICY "Users can update email log in their workspace"
  ON public.unified_email_log FOR UPDATE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE created_by = auth.uid()));

-- gmail_connections policies
DROP POLICY IF EXISTS "Users can view gmail connections in their workspace" ON public.gmail_connections;
DROP POLICY IF EXISTS "Users can manage gmail connections in their workspace" ON public.gmail_connections;

CREATE POLICY "Users can view gmail connections in their workspace"
  ON public.gmail_connections FOR SELECT
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE created_by = auth.uid()));

CREATE POLICY "Users can manage gmail connections in their workspace"
  ON public.gmail_connections FOR ALL
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE created_by = auth.uid()));
