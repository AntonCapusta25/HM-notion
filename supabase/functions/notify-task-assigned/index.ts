import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(from: string, to: string, subject: string, body: string) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject: subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`SendGrid error for ${to}: ${res.status} - ${err}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase config missing')

    // Expected body: { taskId, taskTitle, taskPriority, dueDate, assignedByName, newAssigneeIds }
    const { taskId, taskTitle, taskPriority, dueDate, assignedByName, newAssigneeIds } = await req.json()

    if (!taskId || !taskTitle || !newAssigneeIds?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch assignee emails
    const { data: assignees, error } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', newAssigneeIds)

    if (error) throw new Error(`Failed to fetch assignees: ${error.message}`)
    if (!assignees?.length) {
      return new Response(JSON.stringify({ message: 'No valid assignees found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const senderEmail = Deno.env.get('DEFAULT_SENDER_EMAIL') || 'info@homemademeals.net'
    const results = []

    for (const user of assignees) {
      if (!user.email) { console.warn(`No email for user ${user.id}`); continue }

      const subject = `📋 You've been assigned a task: ${taskTitle}`
      const body = `Hi ${user.name || 'there'},

You have been assigned a new task${assignedByName ? ` by ${assignedByName}` : ''}.

Task:     ${taskTitle}
Priority: ${taskPriority || 'Not set'}
Due Date: ${dueDate || 'Not set'}

Please log in to HomeMade to view the full task details and get started.

— HomeMade Team`

      try {
        await sendEmail(senderEmail, user.email, subject, body)
        console.log(`✅ Assignment notification sent to ${user.email}`)
        results.push({ userId: user.id, email: user.email, status: 'sent' })
      } catch (err: any) {
        console.error(`❌ Failed to notify ${user.email}:`, err.message)
        results.push({ userId: user.id, email: user.email, status: 'failed', error: err.message })
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Assignment notification error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
