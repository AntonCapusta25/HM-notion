import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface EmailRequest {
    action: 'send_single' | 'send_campaign'
    // For single email
    to?: string
    subject?: string
    content?: string
    html?: string
    from_email?: string
    from_name?: string
    // For campaign
    campaign_id?: string
    // Common
    workspace_id: string
    user_id: string
}

interface SendGridEmailData {
    personalizations: Array<{
        to: Array<{ email: string; name?: string }>
        subject?: string
        dynamic_template_data?: Record<string, any>
    }>
    from: {
        email: string
        name?: string
    }
    reply_to?: {
        email: string
        name?: string
    }
    content?: Array<{
        type: string
        value: string
    }>
    template_id?: string
    tracking_settings?: {
        click_tracking: { enable: boolean }
        open_tracking: { enable: boolean }
    }
}

async function sendEmailViaSendGrid(emailData: SendGridEmailData): Promise<any> {
    const response = await fetch(SENDGRID_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`SendGrid API error: ${response.status} - ${error}`)
    }

    return response
}

async function sendSingleEmail(
    supabase: any,
    to: string,
    subject: string,
    content: string,
    html: string | undefined,
    from_email: string,
    from_name: string,
    workspace_id: string,
    user_id: string
) {
    const emailData: SendGridEmailData = {
        personalizations: [
            {
                to: [{ email: to }],
                subject: subject,
            },
        ],
        from: {
            email: from_email,
            name: from_name,
        },
        content: [
            {
                type: html ? 'text/html' : 'text/plain',
                value: html || content,
            },
        ],
        tracking_settings: {
            click_tracking: { enable: true },
            open_tracking: { enable: true },
        },
    }

    const response = await sendEmailViaSendGrid(emailData)

    return {
        success: true,
        message: 'Email sent successfully',
        sendgrid_response: response.status,
    }
}

async function sendCampaignEmails(
    supabase: any,
    campaign_id: string,
    workspace_id: string,
    user_id: string
) {
    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
        .from('outreach_campaigns')
        .select('*, lead_segments(id), outreach_settings:workspace_id(sender_email, sender_name)')
        .eq('id', campaign_id)
        .single()

    if (campaignError) {
        throw new Error(`Failed to fetch campaign: ${campaignError.message}`)
    }

    // Fetch leads from the segment
    const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('segment_id', campaign.segment_id)
        .eq('workspace_id', workspace_id)

    if (leadsError) {
        throw new Error(`Failed to fetch leads: ${leadsError.message}`)
    }

    // Fetch outreach settings for sender info
    const { data: settings, error: settingsError } = await supabase
        .from('outreach_settings')
        .select('*')
        .eq('workspace_id', workspace_id)
        .single()

    if (settingsError || !settings) {
        throw new Error('Outreach settings not configured')
    }

    const from_email = settings.sender_email || Deno.env.get('SENDGRID_FROM_EMAIL')
    const from_name = settings.sender_name || Deno.env.get('SENDGRID_FROM_NAME')

    if (!from_email) {
        throw new Error('Sender email not configured')
    }

    const results = {
        total: leads.length,
        sent: 0,
        failed: 0,
        errors: [] as any[],
    }

    // Get campaign settings
    const campaignSettings = campaign.settings || {}
    const delayBetweenEmails = (campaignSettings.delay_between_emails || 5) * 1000
    const maxEmailsPerDay = campaignSettings.max_emails_per_day || 50

    // Limit emails if needed
    const leadsToProcess = leads.slice(0, maxEmailsPerDay)

    for (const lead of leadsToProcess) {
        try {
            // Personalize email content
            const personalizedContent = campaign.email_template
                .replace(/{{name}}/g, lead.name || 'there')
                .replace(/{{company}}/g, lead.company || 'your company')
                .replace(/{{position}}/g, lead.position || 'your position')
                .replace(/{{industry}}/g, lead.industry || 'your industry')
                .replace(/{{sender_name}}/g, from_name || 'Team')

            const personalizedSubject = campaign.subject_line
                .replace(/{{name}}/g, lead.name || 'there')
                .replace(/{{company}}/g, lead.company || 'your company')

            // Create email record in database
            const { data: emailRecord, error: emailRecordError } = await supabase
                .from('outreach_emails')
                .insert({
                    campaign_id: campaign_id,
                    lead_id: lead.id,
                    status: 'pending',
                    subject_line: personalizedSubject,
                    email_content: personalizedContent,
                    personalized_content: {
                        name: lead.name,
                        company: lead.company,
                        position: lead.position,
                        industry: lead.industry,
                    },
                    workspace_id: workspace_id,
                    created_by: user_id,
                })
                .select()
                .single()

            if (emailRecordError) {
                throw new Error(`Failed to create email record: ${emailRecordError.message}`)
            }

            // Send email via SendGrid
            const emailData: SendGridEmailData = {
                personalizations: [
                    {
                        to: [{ email: lead.email, name: lead.name }],
                        subject: personalizedSubject,
                    },
                ],
                from: {
                    email: from_email,
                    name: from_name,
                },
                content: [
                    {
                        type: 'text/plain',
                        value: personalizedContent,
                    },
                ],
                tracking_settings: {
                    click_tracking: { enable: campaignSettings.track_clicks !== false },
                    open_tracking: { enable: campaignSettings.track_opens !== false },
                },
            }

            await sendEmailViaSendGrid(emailData)

            // Update email record as sent
            await supabase
                .from('outreach_emails')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                })
                .eq('id', emailRecord.id)

            // Update lead last contacted
            await supabase
                .from('leads')
                .update({
                    last_contacted_at: new Date().toISOString(),
                    status: 'contacted',
                })
                .eq('id', lead.id)

            results.sent++

            // Delay between emails to avoid rate limiting
            if (delayBetweenEmails > 0) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenEmails))
            }
        } catch (error: any) {
            results.failed++
            results.errors.push({
                lead_id: lead.id,
                lead_email: lead.email,
                error: error.message,
            })

            // Update email record as failed
            await supabase
                .from('outreach_emails')
                .update({
                    status: 'failed',
                    error_message: error.message,
                })
                .eq('campaign_id', campaign_id)
                .eq('lead_id', lead.id)
        }
    }

    return results
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        })
    }

    try {
        // Verify environment variables
        if (!SENDGRID_API_KEY) {
            throw new Error('SENDGRID_API_KEY not configured')
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Supabase configuration missing')
        }

        // Parse request
        const body: EmailRequest = await req.json()
        const { action, workspace_id, user_id } = body

        if (!workspace_id || !user_id) {
            throw new Error('workspace_id and user_id are required')
        }

        // Create Supabase client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        let result

        if (action === 'send_single') {
            const { to, subject, content, html, from_email, from_name } = body

            if (!to || !subject || !content) {
                throw new Error('to, subject, and content are required for single email')
            }

            const finalFromEmail = from_email || Deno.env.get('SENDGRID_FROM_EMAIL')
            const finalFromName = from_name || Deno.env.get('SENDGRID_FROM_NAME') || 'Team'

            if (!finalFromEmail) {
                throw new Error('from_email is required')
            }

            result = await sendSingleEmail(
                supabase,
                to,
                subject,
                content,
                html,
                finalFromEmail,
                finalFromName,
                workspace_id,
                user_id
            )
        } else if (action === 'send_campaign') {
            const { campaign_id } = body

            if (!campaign_id) {
                throw new Error('campaign_id is required for campaign emails')
            }

            result = await sendCampaignEmails(supabase, campaign_id, workspace_id, user_id)
        } else {
            throw new Error('Invalid action. Must be "send_single" or "send_campaign"')
        }

        return new Response(JSON.stringify(result), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            status: 200,
        })
    } catch (error: any) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                status: 400,
            }
        )
    }
})
