import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

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
      from: { email: from, name: 'HomeMade Tasks' },
      subject: subject,
      content: [{ type: 'text/html', value: htmlBody }],
    }),
  })
  if (!res.ok) {
    const errorText = await res.text()
    console.error(`SendGrid error for ${to}:`, errorText)
  }
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

    // 1. Find all tasks created in the last 24 hours
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    console.log(`Checking for tasks created since ${yesterday.toISOString()}`)

    const { data: recentTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*, task_assignees(user_id, users(name, email))')
      .gte('created_at', yesterday.toISOString())

    if (tasksError) {
      throw new Error(`Failed to fetch recent tasks: ${tasksError.message}`)
    }

    console.log(`Found ${recentTasks?.length || 0} tasks created in the last 24 hours`)

    if (!recentTasks || recentTasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No new tasks found for digest' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Group tasks by assignee
    const userTasks = new Map<string, { email: string; name: string; tasks: any[] }>()

    for (const task of recentTasks) {
      const assignees = task.task_assignees || []
      for (const assignee of assignees) {
        const user = assignee.users
        if (user && user.email) {
          if (!userTasks.has(user.email)) {
            userTasks.set(user.email, { email: user.email, name: user.name, tasks: [] })
          }
          userTasks.get(user.email)!.tasks.push(task)
        }
      }
    }

    const senderEmail =
      Deno.env.get('SENDGRID_FROM_EMAIL') ||
      Deno.env.get('DEFAULT_SENDER_EMAIL') ||
      'info@homemademeals.net'

    const results = []
    let emailsSent = 0

    // 3. Send digest email to each user
    for (const [email, userData] of userTasks.entries()) {
      if (email.toLowerCase() === 'tiayahyaa@gmail.com') {
        console.log(`Skipping notification for ${email} (opted out)`)
        results.push({ email, status: 'skipped_opt_out' })
        continue
      }

      const taskCount = userData.tasks.length
      const subject = `📋 Daily Task Digest: You have ${taskCount} new task${taskCount > 1 ? 's' : ''}`
      
      const tasksHtml = userData.tasks.map(task => {
        return `
          <div style="background-color: #fdf5f2; border-left: 4px solid #EE6A3E; padding: 15px; margin: 15px 0; border-radius: 0 4px 4px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${task.title}</h3>
            ${task.description ? `<p style="margin: 10px 0; color: #444; font-size: 14px; background-color: white; padding: 10px; border-radius: 4px; border: 1px solid #eee;">${task.description}</p>` : ''}
            <p style="margin: 5px 0; color: #555; font-size: 14px;"><strong>Priority:</strong> <span style="text-transform: capitalize;">${task.priority || 'Not set'}</span></p>
            <p style="margin: 5px 0; color: #555; font-size: 14px;"><strong>Due Date:</strong> ${task.due_date || 'Not set'}</p>
          </div>
        `
      }).join('')

      const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #EE6A3E; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 24px;">Daily Task Digest</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #333; margin-top: 0;">Hi ${userData.name || 'there'},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.5;">Here is the summary of new tasks assigned to you over the last 24 hours.</p>
          
          ${tasksHtml}
          
          <div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
            <a href="https://hmbase.netlify.app/my-tasks" style="background-color: #EE6A3E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">View Tasks in Platform</a>
          </div>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee;">
          &copy; ${new Date().getFullYear()} HomeMade Meals. All rights reserved.
        </div>
      </div>
      `

      const ok = await sendEmail(senderEmail, email, subject, htmlBody)
      if (ok) {
        emailsSent++
        results.push({ email, status: 'sent' })
      } else {
        results.push({ email, status: 'failed' })
      }
    }

    return new Response(JSON.stringify({ success: true, results, emailsSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Daily digest logic error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
