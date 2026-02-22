import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64url } from 'https://deno.land/std@0.168.0/encoding/base64url.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'

// ─────────────────────────────────────────────
// Service Account JWT Auth
// ─────────────────────────────────────────────
async function getServiceAccountToken(impersonateEmail: string): Promise<string> {
    const sa = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT')!)
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const payload = {
        iss: sa.client_email,
        sub: impersonateEmail,
        scope: 'https://www.googleapis.com/auth/gmail.send',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }
    const encode = (obj: object) => base64url(new TextEncoder().encode(JSON.stringify(obj)))
    const signingInput = `${encode(header)}.${encode(payload)}`

    // PEM Key processing
    const pemBody = sa.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\n/g, '')
    const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8', keyData,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false, ['sign']
    )
    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput)
    )
    const jwt = `${signingInput}.${base64url(new Uint8Array(signature))}`

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    })
    const data = await res.json()
    if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
    return data.access_token
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────
serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { campaign_id, batch_size = 5 } = await req.json()
        if (!campaign_id) throw new Error('campaign_id required')

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1. Fetch pending emails
        const { data: emails, error: emailsError } = await supabase
            .from('outreach_emails')
            .select(`
                *,
                lead:leads!lead_id (email, name),
                campaign:outreach_campaigns!campaign_id (settings, workspace_id)
            `)
            .eq('campaign_id', campaign_id)
            .eq('status', 'pending')
            .limit(batch_size)

        if (emailsError) throw new Error(`Fetch error: ${emailsError.message}`)
        if (!emails || emails.length === 0) {
            return new Response(JSON.stringify({ success: true, sent: 0, message: 'No pending emails' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 2. Prepare Sender
        // Assume all emails in batch use same sender from campaign settings
        const campaign = emails[0].campaign
        const senderEmail = campaign.settings?.sender_email || Deno.env.get('DEFAULT_SENDER_EMAIL')
        if (!senderEmail) throw new Error('No sender_email configured in campaign settings')

        const token = await getServiceAccountToken(senderEmail)

        let sentCount = 0
        const errors = []

        // 3. Loop and Send
        for (const email of emails) {
            try {
                const recipientEmail = email.lead?.email
                if (!recipientEmail) throw new Error('Lead has no email')

                // Construct MIME
                const subject = email.subject || '(No Subject)'
                const body = email.content || '' // Use 'content' column for body

                const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`
                const messageParts = [
                    `From: ${senderEmail}`,
                    `To: ${recipientEmail}`,
                    `Subject: ${utf8Subject}`,
                    `Content-Type: text/html; charset=utf-8`,
                    `MIME-Version: 1.0`,
                    ``,
                    body
                ]
                const rawMessage = base64url(new TextEncoder().encode(messageParts.join('\n')))

                const res = await fetch(`${GMAIL_API}/users/me/messages/send`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ raw: rawMessage }),
                })

                if (!res.ok) {
                    const errText = await res.text()
                    throw new Error(`Gmail API error: ${res.status} ${errText}`)
                }

                const sentData = await res.json()

                // Update status locally
                await supabase
                    .from('outreach_emails')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        external_id: sentData.id // Store Gmail ID
                    })
                    .eq('id', email.id)

                // Also log to unified_email_log
                await supabase.from('unified_email_log').insert({
                    workspace_id: campaign.workspace_id,
                    source: 'gmail',
                    external_id: sentData.id,
                    thread_id: sentData.threadId,
                    subject: subject,
                    recipient_email: recipientEmail,
                    recipient_name: email.lead.name,
                    sender_email: senderEmail,
                    sent_at: new Date().toISOString(),
                    status: 'sent',
                    body_text: body
                })

                sentCount++

            } catch (err: any) {
                console.error(`Error sending email ${email.id}:`, err)
                errors.push({ id: email.id, error: err.message })

                await supabase
                    .from('outreach_emails')
                    .update({
                        status: 'failed',
                        error_message: err.message
                    })
                    .eq('id', email.id)
            }
        }

        return new Response(JSON.stringify({
            success: true,
            sent: sentCount,
            errors
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
