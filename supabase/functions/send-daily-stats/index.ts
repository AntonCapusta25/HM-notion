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

    // 4. Build the full email body
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const totalOverdue = employeeList.reduce((sum, e) => sum + e.overdue, 0)
    const totalEscalated = employeeList.reduce((sum, e) => sum + e.escalated, 0)

    let emailBody = `DAILY TASK STATISTICS — ${dateStr}
${'='.repeat(60)}

OVERVIEW
--------
Total employees with tasks: ${employeeList.length}
Total overdue tasks across team: ${totalOverdue}
Total escalated tasks: ${totalEscalated}

${'='.repeat(60)}
EMPLOYEE BREAKDOWN
${'='.repeat(60)}
`

    for (const emp of employeeList.sort((a, b) => b.overdue - a.overdue)) {
      const overdueFlag = emp.overdue > 0 ? ` ⚠️ ${emp.overdue} OVERDUE` : ''
      const escalatedFlag = emp.escalated > 0 ? ` 🚨 ${emp.escalated} ESCALATED` : ''
      emailBody += `
${emp.name}${overdueFlag}${escalatedFlag}
${'-'.repeat(40)}
Email:       ${emp.email}
Total Tasks: ${emp.total}  |  ✅ Done: ${emp.done}  |  🔵 In Progress: ${emp.inProgress}  |  ⚪ To Do: ${emp.todo}
Due in 7d:   ${emp.dueSoon}
Overdue:     ${emp.overdue}

Tasks:
${emp.taskLines.join('\n')}

`
    }

    emailBody += `${'='.repeat(60)}
Generated at ${now.toISOString()} by HomeMade Task System`

    // 5. Send to each management recipient
    const senderEmail =
      Deno.env.get('SENDGRID_FROM_EMAIL') ||
      Deno.env.get('DEFAULT_SENDER_EMAIL') ||
      'info@homemademeals.net'
    const subject = `📊 Daily Team Task Stats — ${todayIso}`

    const sendResults = []
    for (const recipient of MANAGEMENT_RECIPIENTS) {
      try {
        await sendEmail(senderEmail, recipient, subject, emailBody)
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
