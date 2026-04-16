import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64url } from 'https://deno.land/std@0.168.0/encoding/base64url.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────
// Service Account JWT Auth
// ─────────────────────────────────────────────
async function getServiceAccountToken(impersonateEmail: string): Promise<string> {
  const googleServiceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
  if (!googleServiceAccount) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT secret')

  const sa = JSON.parse(googleServiceAccount)
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
// Send email via Gmail API
// ─────────────────────────────────────────────
async function sendEmail(token: string, from: string, to: string, subject: string, body: string): Promise<void> {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
    ``,
    body,
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
    throw new Error(`Gmail API error for ${to}: ${res.status} - ${errText}`)
  }
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

    // Find tasks at or past their deadline (today or overdue), not done, not yet nudged today
    const now = new Date()
    const todayIso = now.toISOString().split('T')[0] // YYYY-MM-DD
    const oneDayAgoDate = new Date(now)
    oneDayAgoDate.setDate(oneDayAgoDate.getDate() - 1)

    // Nudge window: due_date <= today AND overdue by at most 2 days
    // (3+ days overdue = escalation territory, no nudge needed there)
    const nudgeUntil = new Date(now)
    nudgeUntil.setDate(nudgeUntil.getDate() - 2)
    const nudgeUntilIso = nudgeUntil.toISOString()

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*, task_assignees(user_id, users(name, email))')
      .lte('due_date', todayIso)          // due today or earlier
      .gte('due_date', nudgeUntilIso.split('T')[0]) // but not older than 2 days (escalation handles those)
      .neq('status', 'done')
      .is('escalated_at', null)           // not already escalated

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`)
    }

    // Filter out tasks nudged in the last 24 hours to avoid spamming
    const tasksToNudge = (tasks || []).filter(task => {
      if (!task.nudge_sent_at) return true
      const nudgedAt = new Date(task.nudge_sent_at)
      const hoursSince = (now.getTime() - nudgedAt.getTime()) / (1000 * 60 * 60)
      return hoursSince >= 24
    })

    if (tasksToNudge.length === 0) {
      return new Response(JSON.stringify({ message: 'No tasks to nudge right now' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const senderEmail = Deno.env.get('DEFAULT_SENDER_EMAIL') || 'info@homemademeals.net'
    const token = await getServiceAccountToken(senderEmail)
    const results = []

    for (const task of tasksToNudge) {
      const assignees = task.task_assignees || []

      for (const assignment of assignees) {
        const assigneeName = assignment.users?.name || 'Team member'
        const assigneeEmail = assignment.users?.email

        if (!assigneeEmail) {
          console.warn(`No email for assignee on task ${task.id}`)
          continue
        }

        const daysOverdue = Math.floor((now.getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))
        const isOverdue = daysOverdue > 0

        const subject = isOverdue
          ? `⏰ Overdue Task Reminder: ${task.title}`
          : `⏰ Task Due Today: ${task.title}`

        const body = `Hi ${assigneeName},

${isOverdue
  ? `Your task "${task.title}" was due on ${task.due_date} (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} ago) and is still outstanding.`
  : `Your task "${task.title}" is due TODAY (${task.due_date}) and is still outstanding.`
}

Priority: ${task.priority}
Status: ${task.status}

Please complete this task as soon as possible.
If it remains unfinished for 3 days past the deadline, it will be escalated to management.

— HomeMade Team`

        try {
          await sendEmail(token, senderEmail, assigneeEmail, subject, body)
          console.log(`✅ Nudge sent to ${assigneeEmail} for task: ${task.title}`)
          results.push({ task_id: task.id, assignee: assigneeEmail, status: 'sent' })
        } catch (err: any) {
          console.error(`❌ Failed to nudge ${assigneeEmail}:`, err.message)
          results.push({ task_id: task.id, assignee: assigneeEmail, status: 'failed', error: err.message })
        }
      }

      // Update nudge_sent_at regardless of individual assignee send success
      await supabase
        .from('tasks')
        .update({ nudge_sent_at: now.toISOString() })
        .eq('id', task.id)
    }

    return new Response(JSON.stringify({ success: true, nudged: tasksToNudge.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Nudge error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
