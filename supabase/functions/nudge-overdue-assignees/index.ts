import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────
// Send email via SendGrid API
// ─────────────────────────────────────────────
async function sendEmail(from: string, to: string, subject: string, body: string): Promise<void> {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject: subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`SendGrid API error for ${to}: ${res.status} - ${errText}`)
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
          await sendEmail(senderEmail, assigneeEmail, subject, body)
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
