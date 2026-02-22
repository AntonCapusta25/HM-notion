import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64url } from 'https://deno.land/std@0.168.0/encoding/base64url.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'

// ─────────────────────────────────────────────
// Service Account JWT Auth (domain-wide delegation)
// ─────────────────────────────────────────────

async function getServiceAccountToken(impersonateEmail: string): Promise<string> {
    const sa = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT')!)

    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const payload = {
        iss: sa.client_email,
        sub: impersonateEmail,           // impersonate this Workspace user
        scope: 'https://www.googleapis.com/auth/gmail.send', // Changed scope to 'send'
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }

    const encode = (obj: object) =>
        base64url(new TextEncoder().encode(JSON.stringify(obj)))

    const signingInput = `${encode(header)}.${encode(payload)}`

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
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(signingInput)
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
    if (!data.access_token) {
        throw new Error(`Service account token error: ${JSON.stringify(data)}`)
    }
    return data.access_token
}

// ─────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const body = await req.json().catch(() => ({}))
        const {
            workspace_id,
            sender_email,
            recipient_email,
            subject, // Should be "Re: ..."
            message_text,
            thread_id,
            original_message_id // For In-Reply-To header
        } = body

        if (!workspace_id || !sender_email || !recipient_email || !message_text) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Authenticate
        const token = await getServiceAccountToken(sender_email)

        // Construct MIME Message
        const boundary = 'foo_bar_baz'
        const rawMessage = [
            `To: ${recipient_email}`,
            `From: ${sender_email}`,
            `Subject: ${subject}`,
            thread_id ? `References: ${thread_id}` : '', // Simplified references
            original_message_id ? `In-Reply-To: ${original_message_id}` : '',
            'Content-Type: text/plain; charset="UTF-8"',
            '',
            message_text
        ].filter(Boolean).join('\r\n')

        const encodedMessage = base64url(new TextEncoder().encode(rawMessage))

        // Send
        const res = await fetch(`${GMAIL_API}/users/me/messages/send`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                raw: encodedMessage,
                threadId: thread_id
            })
        })

        if (!res.ok) {
            const errorText = await res.text()
            throw new Error(`Gmail API error: ${errorText}`)
        }

        const sentData = await res.json()

        // Log to DB
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        await supabase
            .from('unified_email_log')
            .insert({
                workspace_id,
                source: 'gmail',
                external_id: sentData.id,
                thread_id: sentData.threadId,
                subject,
                recipient_email,
                sender_email,
                sent_at: new Date().toISOString(),
                status: 'replied', // Mark as sent reply
                created_at: new Date().toISOString()
            })

        return new Response(JSON.stringify({ success: true, id: sentData.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
