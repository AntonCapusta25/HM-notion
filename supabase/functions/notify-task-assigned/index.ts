import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(from: string, to: string, subject: string, htmlBody: string) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: 'HomeMade Tasks' },
      subject: subject,
      content: [{ type: 'text/html', value: htmlBody }],
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
    if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not configured')

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

    const senderEmail =
      Deno.env.get('SENDGRID_FROM_EMAIL') ||
      Deno.env.get('DEFAULT_SENDER_EMAIL') ||
      'info@homemademeals.net'
    const results = []

    for (const user of assignees) {
      if (!user.email) { console.warn(`No email for user ${user.id}`); continue }

      const subject = `📋 You've been assigned a task: ${taskTitle}`
      
      const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #EE6A3E; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 24px;">New Task Assigned</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #333; margin-top: 0;">Hi ${user.name || 'there'},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.5;">You have been assigned a new task${assignedByName ? ` by <strong>${assignedByName}</strong>` : ''}.</p>
          
          <div style="background-color: #fdf5f2; border-left: 4px solid #EE6A3E; padding: 15px; margin: 25px 0; border-radius: 0 4px 4px 0;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">${taskTitle}</h3>
            <p style="margin: 5px 0; color: #555; font-size: 14px;"><strong>Priority:</strong> ${taskPriority || 'Not set'}</p>
            <p style="margin: 5px 0; color: #555; font-size: 14px;"><strong>Due Date:</strong> ${dueDate || 'Not set'}</p>
          </div>
          
          <div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
            <a href="https://hmbase.netlify.app/my-tasks" style="background-color: #EE6A3E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">View Task in Platform</a>
          </div>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee;">
          &copy; ${new Date().getFullYear()} HomeMade Meals. All rights reserved.
        </div>
      </div>
      `;

      try {
        await sendEmail(senderEmail, user.email, subject, htmlBody)
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
