import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { code, workspace_id, account_label, redirect_uri } = await req.json()

        if (!code || !workspace_id || !redirect_uri) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!

        // Exchange authorization code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri,
                grant_type: 'authorization_code',
            }),
        })

        const tokens = await tokenRes.json()
        if (!tokens.refresh_token) {
            throw new Error('No refresh token received. Ensure prompt=consent was set in OAuth request.')
        }

        // Get the Gmail address for this account
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        const userInfo = await userInfoRes.json()
        const gmailAddress = userInfo.email

        if (!gmailAddress) throw new Error('Could not retrieve Gmail address')

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Check workspace connection limit (max 2)
        const { count } = await supabase
            .from('gmail_connections')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace_id)
            .eq('is_active', true)

        if ((count || 0) >= 2) {
            return new Response(JSON.stringify({ error: 'Maximum 2 Gmail accounts per workspace' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Upsert the connection
        const { data, error } = await supabase
            .from('gmail_connections')
            .upsert({
                workspace_id,
                account_label: account_label || 'Primary',
                gmail_address: gmailAddress,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                is_active: true,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id,gmail_address' })
            .select()
            .single()

        if (error) throw error

        return new Response(JSON.stringify({ success: true, gmail_address: gmailAddress, connection: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
