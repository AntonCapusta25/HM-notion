import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        // SendGrid sends an array of events
        const events: any[] = await req.json()

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        let processed = 0

        for (const event of events) {
            const { event: eventType, email, timestamp, sg_message_id } = event

            if (!email || !eventType) continue

            const eventTime = new Date(timestamp * 1000).toISOString()

            // Build update payload based on event type
            const updates: Record<string, any> = { updated_at: new Date().toISOString() }

            switch (eventType) {
                case 'open':
                    updates.opened_at = eventTime
                    updates.status = 'opened'
                    break
                case 'click':
                    updates.clicked_at = eventTime
                    updates.status = 'clicked'
                    break
                case 'bounce':
                case 'blocked':
                    updates.bounced_at = eventTime
                    updates.status = 'bounced'
                    break
                default:
                    continue // Skip untracked event types
            }

            // Try to match by SendGrid message ID first, then by recipient email (most recent)
            let matchQuery = supabase
                .from('unified_email_log')
                .update(updates)

            if (sg_message_id) {
                // Try exact match by external_id (if we logged the SendGrid message ID)
                const { error: exactError } = await supabase
                    .from('unified_email_log')
                    .update(updates)
                    .eq('external_id', sg_message_id)

                if (!exactError) { processed++; continue }
            }

            // Fallback: match by recipient email, most recent email
            const { data: recentEmail } = await supabase
                .from('unified_email_log')
                .select('id')
                .eq('recipient_email', email)
                .order('sent_at', { ascending: false })
                .limit(1)
                .single()

            if (recentEmail) {
                await matchQuery.eq('id', recentEmail.id)
                processed++
            }
        }

        return new Response(JSON.stringify({ success: true, processed }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('SendGrid webhook error:', error)
        // Always return 200 to SendGrid to prevent retries
        return new Response(JSON.stringify({ error: error.message }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
