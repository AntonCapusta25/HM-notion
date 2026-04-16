import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')

// Management recipients for the daily digest
const MANAGEMENT_RECIPIENTS = ['mahmoudelwakil22@gmail.com', 'bangalexf@gmail.com']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────
// Send email via SendGrid API
// ─────────────────────────────────────────────
async function sendEmail(from: string, to: string, subject: string, htmlBody: string): Promise<void> {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: 'HomeMade Reports' },
      subject: subject,
      content: [{ type: 'text/html', value: htmlBody }],
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
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY not configured')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const now = new Date()
    const todayIso = now.toISOString().split('T')[0]

    // 1. Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .order('name')

    if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`)
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: 'No users found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Fetch all tasks with assignees
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, escalated_at, task_assignees(user_id)')

    if (tasksError) throw new Error(`Failed to fetch tasks: ${tasksError.message}`)

    const allTasks = tasks || []
    const sevenDaysFromNow = new Date(now)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    // 3. Build per-employee stats
    interface EmployeeStats {
      name: string
      email: string
      total: number
      done: number
      inProgress: number
      todo: number
      overdue: number
      dueSoon: number  // Due within next 7 days
      escalated: number
      taskLines: string[]
    }

    const statsByUser: Record<string, EmployeeStats> = {}

    for (const user of users) {
      // Find tasks assigned to this user
      const userTasks = allTasks.filter(task =>
        task.task_assignees?.some((ta: any) => ta.user_id === user.id)
      )

      if (userTasks.length === 0) continue // Skip users with no tasks

      const overdueTasks = userTasks.filter(t =>
        t.due_date && new Date(t.due_date) < now && t.status !== 'done'
      )
      const dueSoonTasks = userTasks.filter(t => {
        if (!t.due_date || t.status === 'done') return false
        const d = new Date(t.due_date)
        return d >= now && d <= sevenDaysFromNow
      })

      // Build task detail lines for the email
      const taskLines: string[] = []

      const sortedTasks = [...userTasks].sort((a, b) => {
        // Sort: overdue first, then by priority, then by due date
        const aOverdue = a.due_date && new Date(a.due_date) < now && a.status !== 'done'
        const bOverdue = b.due_date && new Date(b.due_date) < now && b.status !== 'done'
        if (aOverdue && !bOverdue) return -1
        if (!aOverdue && bOverdue) return 1
        return 0
      })

      for (const task of sortedTasks) {
        const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== 'done'
        const statusIcon = task.status === 'done' ? '✅' : isOverdue ? '🔴' : task.status === 'in_progress' ? '🔵' : '⚪'
        const escalatedNote = task.escalated_at ? ' [ESCALATED]' : ''
        const duePart = task.due_date ? ` | Due: ${task.due_date}` : ''
        taskLines.push(`  ${statusIcon} ${task.title}${duePart} | ${task.priority} priority${escalatedNote}`)
      }

      statsByUser[user.id] = {
        name: user.name,
        email: user.email,
        total: userTasks.length,
        done: userTasks.filter(t => t.status === 'done').length,
        inProgress: userTasks.filter(t => t.status === 'in_progress').length,
        todo: userTasks.filter(t => t.status === 'todo').length,
        overdue: overdueTasks.length,
        dueSoon: dueSoonTasks.length,
        escalated: userTasks.filter(t => t.escalated_at).length,
        taskLines,
      }
    }

    const employeeList = Object.values(statsByUser)

    if (employeeList.length === 0) {
      return new Response(JSON.stringify({ message: 'No employees with tasks found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Build the full HTML email body
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const totalOverdue = employeeList.reduce((sum, e) => sum + e.overdue, 0)
    const totalEscalated = employeeList.reduce((sum, e) => sum + e.escalated, 0)

    let emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
      <div style="background-color: #EE6A3E; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Daily Task Statistics</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">${dateStr}</p>
      </div>
      
      <div style="padding: 25px; background-color: #f8f9fa; border: 1px solid #e0e0e0; border-top: none;">
        <div style="display: flex; justify-content: space-around; background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 25px;">
          <div style="text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Team Members</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #1976d2;">${employeeList.length}</p>
          </div>
          <div style="text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Total Overdue</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #d32f2f;">${totalOverdue}</p>
          </div>
          <div style="text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Escalated</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #f57c00;">${totalEscalated}</p>
          </div>
        </div>

        <h2 style="color: #333; font-size: 18px; border-bottom: 2px solid #EE6A3E; padding-bottom: 5px; margin-top: 0;">Employee Breakdown</h2>
    `;

    for (const emp of employeeList.sort((a, b) => b.overdue - a.overdue)) {
      const isCritical = emp.overdue > 0 || emp.escalated > 0;
      
      emailHtml += `
        <div style="background-color: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 5px solid ${isCritical ? '#d32f2f' : '#4caf50'}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
            <h3 style="margin: 0; font-size: 16px; color: #333;">${emp.name}</h3>
            <div>
              ${emp.overdue > 0 ? `<span style="background-color: #ffebee; color: #d32f2f; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-left: 5px;">⚠️ ${emp.overdue} Overdue</span>` : ''}
              ${emp.escalated > 0 ? `<span style="background-color: #fff3e0; color: #e65100; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-left: 5px;">🚨 ${emp.escalated} Escalated</span>` : ''}
            </div>
          </div>
          
          <div style="font-size: 13px; color: #555; margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 10px;">
            <span style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px;"><strong>Total:</strong> ${emp.total}</span>
            <span style="background-color: #e8f5e9; padding: 4px 8px; border-radius: 4px;">✅ <strong>Done:</strong> ${emp.done}</span>
            <span style="background-color: #e3f2fd; padding: 4px 8px; border-radius: 4px;">🔵 <strong>In Prog:</strong> ${emp.inProgress}</span>
            <span style="background-color: #f5f5f5; padding: 4px 8px; border-radius: 4px;">⚪ <strong>To Do:</strong> ${emp.todo}</span>
            <span style="background-color: #fff8e1; padding: 4px 8px; border-radius: 4px;">📅 <strong>Due in 7d:</strong> ${emp.dueSoon}</span>
          </div>

          <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Task List:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #444; line-height: 1.6;">
            ${emp.taskLines.length > 0 
              ? emp.taskLines.map(line => `<li style="margin-bottom: 4px;">${line.replace(/\[ESCALATED\]/g, '<strong style="color:#d32f2f;">[ESCALATED]</strong>')}</li>`).join('') 
              : '<li><em>No active tasks.</em></li>'}
          </ul>
        </div>
      `;
    }

    emailHtml += `
        <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
          <a href="https://homemademeals.net/" style="background-color: #EE6A3E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open HomeMade Platform</a>
        </div>
      </div>
      <div style="background-color: #eeeeee; padding: 15px; text-align: center; color: #888; font-size: 12px; border-radius: 0 0 8px 8px;">
        Generated automatically by HomeMade Task System &bull; ${new Date().toISOString()}
      </div>
    </div>
    `;

    // 5. Send to each management recipient
    const senderEmail =
      Deno.env.get('SENDGRID_FROM_EMAIL') ||
      Deno.env.get('DEFAULT_SENDER_EMAIL') ||
      'info@homemademeals.net'
    const subject = `📊 Daily Team Task Stats — ${todayIso}`

    const sendResults = []
    for (const recipient of MANAGEMENT_RECIPIENTS) {
      try {
        await sendEmail(senderEmail, recipient, subject, emailHtml)
        console.log(`✅ Daily stats sent to ${recipient}`)
        sendResults.push({ recipient, status: 'sent' })
      } catch (err: any) {
        console.error(`❌ Failed to send to ${recipient}:`, err.message)
        sendResults.push({ recipient, status: 'failed', error: err.message })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      employees: employeeList.length,
      date: todayIso,
      sendResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Daily stats error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
