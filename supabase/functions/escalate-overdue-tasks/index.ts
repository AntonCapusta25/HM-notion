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

async function sendEmail(from: string, to: string, subject: string, htmlBody: string): Promise<boolean> {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: 'HomeMade Escalations' },
      subject: subject,
      content: [{ type: 'text/html', value: htmlBody }],
    }),
  })
  return res.ok
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing')
    }
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY not configured')
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

    // 2. Build the Digest HTML
    const senderEmail =
      Deno.env.get('SENDGRID_FROM_EMAIL') ||
      Deno.env.get('DEFAULT_SENDER_EMAIL') ||
      'info@homemademeals.net'

    const tasksHtml = overdueTasks.map(task => {
      const assignees = task.task_assignees || []
      const assigneeNames = assignees.map((ta: any) => ta.users?.name || ta.users?.email || 'Unknown').join(', ')
      const daysOverdue = Math.floor((new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))
      
      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px; font-weight: bold;">${task.title}</td>
          <td style="padding: 12px;">${assigneeNames}</td>
          <td style="padding: 12px;">${task.due_date}</td>
          <td style="padding: 12px;"><span style="color: #d32f2f; font-weight: bold;">${daysOverdue} days</span></td>
          <td style="padding: 12px;"><span style="text-transform: capitalize; background: #eee; padding: 2px 6px; border-radius: 4px;">${task.priority}</span></td>
        </tr>
      `
    }).join('')

    const subject = `🚨 CRITICAL: ${overdueTasks.length} Overdue Task Escalations`
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background-color: #d32f2f; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">🚨 ALARM: Task Escalation Digest</h2>
      </div>
      <div style="padding: 30px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #333; margin-top: 0;">Hi Management,</p>
        <p style="font-size: 16px; color: #333; line-height: 1.5;">
          The following tasks have remained unfinished <strong>3+ days after their deadline</strong> and are now escalated for your attention.
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px; text-align: left;">
          <thead>
            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="padding: 12px;">Task</th>
              <th style="padding: 12px;">Assignees</th>
              <th style="padding: 12px;">Deadline</th>
              <th style="padding: 12px;">Overdue By</th>
              <th style="padding: 12px;">Priority</th>
            </tr>
          </thead>
          <tbody>
            ${tasksHtml}
          </tbody>
        </table>
        
        <div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
          <a href="https://hmbase.netlify.app/my-tasks" style="background-color: #d32f2f; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Take Action in Platform</a>
        </div>
      </div>
      <div style="background-color: #f9f9f9; padding: 15px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee;">
        &copy; ${new Date().getFullYear()} HomeMade Meals. All rights reserved.
      </div>
    </div>
    `

    // 3. Send the Digest Email
    const results = []
    let anySuccess = false
    for (const recipient of ESCALATION_RECIPIENTS) {
      const ok = await sendEmail(senderEmail, recipient, subject, htmlBody)
      if (ok) {
        anySuccess = true
        results.push({ recipient, status: 'sent' })
      } else {
        results.push({ recipient, status: 'failed' })
      }
    }

    // 4. Mark all processed tasks as escalated if at least one email went out
    if (anySuccess) {
      const taskIds = overdueTasks.map(t => t.id)
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ escalated_at: new Date().toISOString() })
        .in('id', taskIds)
      
      if (updateError) throw new Error(`Failed to update tasks: ${updateError.message}`)
    }

    return new Response(JSON.stringify({ success: true, results, taskCount: overdueTasks.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Escalation logic error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
