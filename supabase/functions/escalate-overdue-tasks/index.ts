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

    // 2. Prepare Sender
    const senderEmail =
      Deno.env.get('SENDGRID_FROM_EMAIL') ||
      Deno.env.get('DEFAULT_SENDER_EMAIL') ||
      'info@homemademeals.net'

    const results = []

    for (const task of overdueTasks) {
      try {
        const assignees = task.task_assignees || []
        const assigneeNames = assignees.map((ta: any) => ta.users?.name || ta.users?.email || 'Unknown').join(', ')
        
        const subject = `ALARM: Overdue Task - ${task.title}`
        const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="background-color: #d32f2f; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0; font-size: 24px;">🚨 ALARM: Task Escalation</h2>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #333; margin-top: 0; font-weight: bold;">Management Alert:</p>
            <p style="font-size: 16px; color: #333; line-height: 1.5;">
              The following task has not been finished <strong>3 days after its deadline</strong>.
            </p>
            
            <div style="background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 25px 0; border-radius: 0 4px 4px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${task.title}</h3>
              <p style="margin: 5px 0; color: #555; font-size: 14px;"><strong>Assignees:</strong> ${assigneeNames}</p>
              <p style="margin: 5px 0; color: #555; font-size: 14px;"><strong>Deadline:</strong> ${task.due_date}</p>
              <p style="margin: 5px 0; color: #555; font-size: 14px;"><strong>Priority:</strong> <span style="text-transform: capitalize;">${task.priority}</span></p>
              <p style="margin: 5px 0; color: #555; font-size: 14px;"><strong>Status:</strong> <span style="text-transform: capitalize;">${task.status.replace('_', ' ')}</span></p>
            </div>
            
            <p style="font-size: 14px; color: #555; line-height: 1.5; background-color: #f5f5f5; padding: 12px; border-radius: 4px;">
              Please check with the assignees to understand why this task remains unfinished.
            </p>
            
            <div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
              <a href="https://hmbase.netlify.app/my-tasks" style="background-color: #1976D2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">View Task in Platform</a>
            </div>
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee;">
            &copy; ${new Date().getFullYear()} HomeMade Meals. All rights reserved.
          </div>
        </div>
        `;

        // 3. Send email to each recipient
        let successfulSends = 0
        for (const recipient of ESCALATION_RECIPIENTS) {
            const emailRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: recipient }] }],
                    from: { email: senderEmail, name: 'HomeMade Escalations' },
                    subject: subject,
                    content: [{ type: 'text/html', value: htmlBody }],
                }),
            })

            if (!emailRes.ok) {
              const errorText = await emailRes.text()
              console.error(`Failed to send email to ${recipient}:`, errorText)
              // We continue to next recipient even if one fails
            } else {
              successfulSends++
            }
        }

        // 4. Mark task as escalated only after at least one successful email send.
        // If all sends fail, keep it eligible for retry on next scheduled run.
        if (successfulSends > 0) {
          await supabase
            .from('tasks')
            .update({ escalated_at: new Date().toISOString() })
            .eq('id', task.id)
        } else {
          throw new Error('Escalation emails failed for all recipients')
        }

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
