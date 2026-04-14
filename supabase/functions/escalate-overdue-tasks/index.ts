import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64url } from 'https://deno.land/std@0.168.0/encoding/base64url.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'

const ESCALATION_RECIPIENTS = ['mahmoudelwakil22@gmail.com', 'bangalexf@gmail.com']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────
// Service Account JWT Auth (domain-wide delegation)
// ─────────────────────────────────────────────
async function getServiceAccountToken(impersonateEmail: string): Promise<string> {
    const googleServiceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!googleServiceAccount) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT secret')
    
    const sa = JSON.parse(googleServiceAccount)
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const payload = {
        iss: sa.client_email,
        sub: impersonateEmail,           // impersonate this Workspace user
        scope: 'https://www.googleapis.com/auth/gmail.send',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Find tasks overdue by 3+ days that haven't been escalated yet
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoIso = threeDaysAgo.toISOString()

    const { data: overdueTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*, task_assignees(user_id, users(name, email))')
      .lt('due_date', threeDaysAgoIso)
      .neq('status', 'done')
      .is('escalated_at', null)

    if (tasksError) {
      throw new Error(`Failed to fetch overdue tasks: ${tasksError.message}`)
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No overdue tasks found for escalation' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Prepare Gmail Sender (impersonating info@homemademeals.net)
    const senderEmail = Deno.env.get('DEFAULT_SENDER_EMAIL') || 'info@homemademeals.net'
    const token = await getServiceAccountToken(senderEmail)

    const results = []

    for (const task of overdueTasks) {
      try {
        const assignees = task.task_assignees || []
        const assigneeNames = assignees.map((ta: any) => ta.users?.name || ta.users?.email || 'Unknown').join(', ')
        
        const subject = `ALARM: Overdue Task - ${task.title}`
        const content = `ALARM: The following task has not been finished 3 days after the deadline.

Task: ${task.title}
Deadline: ${task.due_date}
Assignees: ${assigneeNames}
Status: ${task.status}
Priority: ${task.priority}

Please check why this task remains unfinished.`

        // 3. Send email to each recipient
        for (const recipient of ESCALATION_RECIPIENTS) {
            const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`
            const messageParts = [
                `From: ${senderEmail}`,
                `To: ${recipient}`,
                `Subject: ${utf8Subject}`,
                `Content-Type: text/plain; charset=utf-8`,
                `MIME-Version: 1.0`,
                ``,
                content
            ]
            const rawMessage = base64url(new TextEncoder().encode(messageParts.join('\n')))

            const emailRes = await fetch(`${GMAIL_API}/users/me/messages/send`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw: rawMessage }),
            })

            if (!emailRes.ok) {
              const errorText = await emailRes.text()
              console.error(`Failed to send email to ${recipient}:`, errorText)
              // We continue to next recipient even if one fails
            }
        }

        // 4. Mark task as escalated
        await supabase
          .from('tasks')
          .update({ escalated_at: new Date().toISOString() })
          .eq('id', task.id)

        results.push({ task_id: task.id, status: 'escalated' })
      } catch (err: any) {
        console.error(`Error escalating task ${task.id}:`, err.message)
        results.push({ task_id: task.id, status: 'failed', error: err.message })
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Escalation error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
