import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
        const FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'Chefs@homemademeals.net'
        const FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') || 'HomeMade Meals'

        if (!SENDGRID_API_KEY) {
            throw new Error('SENDGRID_API_KEY not configured')
        }

        // Get HTML content and recipient from request
        const { html_content, to_email, subject } = await req.json()

        if (!html_content) {
            return new Response(
                JSON.stringify({ error: 'html_content is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const recipient = to_email || 'bangalexf@gmail.com'
        const emailSubject = subject || `🔥 Daily Viral Trend Radar - ${new Date().toISOString().split('T')[0]}`

        // Send via SendGrid
        const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{
                    to: [{ email: recipient }],
                    subject: emailSubject
                }],
                from: {
                    email: FROM_EMAIL,
                    name: FROM_NAME
                },
                content: [{
                    type: 'text/html',
                    value: html_content
                }]
            })
        })

        if (!sendGridResponse.ok) {
            const errorText = await sendGridResponse.text()
            console.error('SendGrid error:', errorText)
            throw new Error(`SendGrid failed: ${sendGridResponse.status} - ${errorText}`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Email sent to ${recipient}`,
                subject: emailSubject
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
