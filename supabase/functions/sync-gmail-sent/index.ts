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
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }

    const encode = (obj: object) =>
        base64url(new TextEncoder().encode(JSON.stringify(obj)))

    const signingInput = `${encode(header)}.${encode(payload)}`

    // Import the RSA private key
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

    // Exchange JWT for access token
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
// Gmail helpers
// ─────────────────────────────────────────────

async function fetchSentMessages(token: string, maxResults = 100) {
    const params = new URLSearchParams({ labelIds: 'SENT', maxResults: String(maxResults) })
    const res = await fetch(`${GMAIL_API}/users/me/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Gmail list error ${res.status}: ${await res.text()}`)
    return res.json()
}

async function getMessage(token: string, id: string) {
    const params = new URLSearchParams()
    params.set('format', 'full') // Changed to full to get body
    // params.append('metadataHeaders', ...) // Not needed for full

    // Note: 'full' returns payload with body/parts
    const res = await fetch(
        `${GMAIL_API}/users/me/messages/${id}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return null
    return res.json()
}

async function getThread(token: string, threadId: string) {
    const res = await fetch(
        `${GMAIL_API}/users/me/threads/${threadId}?format=minimal`,
        { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return null
    return res.json()
}

function header(headers: any[], name: string): string {
    return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
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
            // Which Gmail addresses to sync — defaults to env var list
            gmail_accounts,
            max_results = 100,
        } = body

        if (!workspace_id) {
            return new Response(JSON.stringify({ error: 'workspace_id required' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Accounts to sync: passed in body OR from env var (comma-separated)
        const accounts: string[] = gmail_accounts?.length
            ? gmail_accounts
            : (Deno.env.get('GMAIL_ACCOUNTS') || '').split(',').map((s: string) => s.trim()).filter(Boolean)

        if (!accounts.length) {
            return new Response(JSON.stringify({ error: 'No Gmail accounts configured. Set GMAIL_ACCOUNTS secret.' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        let totalSynced = 0
        const errors: string[] = []

        for (const emailAddress of accounts) {
            try {
                const token = await getServiceAccountToken(emailAddress)
                const listData = await fetchSentMessages(token, max_results)
                const messages = listData.messages || []

                for (const msg of messages) {
                    try {
                        const message = await getMessage(token, msg.id)
                        if (!message) continue

                        const headers = message.payload?.headers || []
                        const subject = header(headers, 'Subject')
                        const to = header(headers, 'To')
                        const from = header(headers, 'From')
                        const dateStr = header(headers, 'Date')

                        if (!subject || !to) continue

                        // Parse recipient
                        let recipientName = ''
                        let recipientEmail = to.trim()

                        // Robust recipient parsing — handles:
                        //   "Name <email>", <email>, bare email, multi-recipient (takes first)
                        const parseFirstEmail = (raw: string): { name: string; email: string } => {
                            // Take first recipient if comma-separated
                            const first = raw.split(/,(?=[^>]*(?:<|$))/)[0].trim()
                            // "Display Name <email@domain>" or "<email@domain>"
                            const angleMatch = first.match(/<([^>]+@[^>]+)>/)
                            if (angleMatch) {
                                const name = first.replace(/<[^>]+>/, '').replace(/^"|"$/g, '').trim()
                                return { name, email: angleMatch[1].trim() }
                            }
                            // bare email
                            if (first.includes('@')) return { name: '', email: first.trim() }
                            return { name: '', email: first }
                        }
                        const parsed = parseFirstEmail(to)
                        recipientName = parsed.name
                        recipientEmail = parsed.email

                        // Parse sender
                        const senderMatch = from.match(/<?([^>]+)>?$/)
                        const senderEmail = senderMatch?.[1]?.trim() || from.trim()

                        // Detect replies via thread
                        let repliedAt: string | null = null
                        if (message.threadId) {
                            const thread = await getThread(token, message.threadId)
                            if (thread?.messages?.length > 1) {
                                const replies = thread.messages.filter((m: any) => m.id !== msg.id)
                                if (replies.length > 0) {
                                    repliedAt = new Date(parseInt(replies[0].internalDate)).toISOString()
                                }
                            }
                        }

                        const sentAt = dateStr
                            ? new Date(dateStr).toISOString()
                            : new Date(parseInt(message.internalDate)).toISOString()

                        // Extract body
                        let bodyText = ''
                        if (message.snippet) bodyText = message.snippet // Fallback

                        // Gmail returns body.data as base64url-encoded string
                        // We need to decode it: replace URL-safe chars then use atob()
                        const decodeGmailBody = (data: string): string => {
                            try {
                                const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
                                const binary = atob(base64)
                                return decodeURIComponent(escape(binary))
                            } catch {
                                return ''
                            }
                        }

                        const getBody = (payload: any): string | null => {
                            if (payload.body?.data) {
                                return decodeGmailBody(payload.body.data)
                            }
                            if (payload.parts) {
                                for (const part of payload.parts) {
                                    if (part.mimeType === 'text/plain' && part.body?.data) {
                                        return decodeGmailBody(part.body.data)
                                    }
                                }
                                for (const part of payload.parts) {
                                    if (part.mimeType === 'text/html' && part.body?.data) {
                                        // Strip basic HTML tags for plain text fallback
                                        return decodeGmailBody(part.body.data)
                                            .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                                    }
                                }
                                // Try nested parts (multipart/alternative etc)
                                for (const part of payload.parts) {
                                    if (part.parts) {
                                        const nested = getBody(part)
                                        if (nested) return nested
                                    }
                                }
                            }
                            return null
                        }

                        const extracted = getBody(message.payload)
                        if (extracted) bodyText = extracted

                        await supabase
                            .from('unified_email_log')
                            .upsert({
                                workspace_id,
                                source: 'gmail',
                                external_id: msg.id,
                                thread_id: message.threadId,
                                subject,
                                recipient_email: recipientEmail,
                                recipient_name: recipientName,
                                sender_email: senderEmail,
                                sent_at: sentAt,
                                replied_at: repliedAt,
                                status: repliedAt ? 'replied' : 'sent',
                                body_text: bodyText,
                                updated_at: new Date().toISOString(),
                            }, { onConflict: 'workspace_id,external_id', ignoreDuplicates: false })

                        totalSynced++
                    } catch (_e) {
                        // Skip individual message errors
                    }
                }
            } catch (err: any) {
                errors.push(`${emailAddress}: ${err.message}`)
            }
        }

        return new Response(JSON.stringify({
            success: true,
            synced: totalSynced,
            accounts_processed: accounts.length,
            errors: errors.length ? errors : undefined,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
