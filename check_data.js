
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
})

// Fix RLS policies to use workspaces.created_by instead of workspace_members
const sql = `
-- Drop old policies that reference workspace_members (which is empty)
DROP POLICY IF EXISTS "Users can view email log in their workspace" ON public.unified_email_log;
DROP POLICY IF EXISTS "Users can insert email log in their workspace" ON public.unified_email_log;
DROP POLICY IF EXISTS "Users can update email log in their workspace" ON public.unified_email_log;
DROP POLICY IF EXISTS "Users can view gmail connections in their workspace" ON public.gmail_connections;
DROP POLICY IF EXISTS "Users can manage gmail connections in their workspace" ON public.gmail_connections;

-- Create new policies using workspaces.created_by
CREATE POLICY "Users can view email log in their workspace"
  ON public.unified_email_log FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  ));

CREATE POLICY "Users can insert email log in their workspace"
  ON public.unified_email_log FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  ));

CREATE POLICY "Users can update email log in their workspace"
  ON public.unified_email_log FOR UPDATE
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  ));

CREATE POLICY "Users can view gmail connections in their workspace"
  ON public.gmail_connections FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  ));

CREATE POLICY "Users can manage gmail connections in their workspace"
  ON public.gmail_connections FOR ALL
  USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  ));
`

async function fixPolicies() {
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: 'rpc not available' }))

    if (error) {
        // Try direct query approach
        console.log('RPC not available, trying direct approach...')
        // We'll use the REST API with service role to run raw SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ sql })
        })
        const result = await response.text()
        console.log('Result:', result)
    } else {
        console.log('Policies updated successfully!')
    }
}

fixPolicies()
