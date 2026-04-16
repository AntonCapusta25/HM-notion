import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

const ESCALATION_RECIPIENTS = ['mahmoudelwakil22@gmail.com', 'bangalexf@gmail.com']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // 2. Prepare Sender
    const senderEmail = Deno.env.get('DEFAULT_SENDER_EMAIL') || 'info@homemademeals.net'

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
            const emailRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: recipient }] }],
                    from: { email: senderEmail },
                    subject: subject,
                    content: [{ type: 'text/plain', value: content }],
                }),
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
