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

    // Expected body: { taskId, taskTitle, taskDescription, taskPriority, dueDate, assignedByName, newAssigneeIds }
    const { taskId, taskTitle, taskDescription, taskPriority, dueDate, assignedByName, newAssigneeIds } = await req.json()

    // Immediate task assignment notifications are now disabled in favor of the daily digest.
    // We return success so the client/caller doesn't throw an error.
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Individual task notifications are disabled in favor of daily digest' 
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Assignment notification error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
