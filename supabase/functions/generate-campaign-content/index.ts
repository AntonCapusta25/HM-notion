import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.24.1'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { campaign_id, max_leads = 5 } = await req.json()

        if (!campaign_id) throw new Error('campaign_id is required')

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const openai = new OpenAI({
            apiKey: Deno.env.get('OPENAI_API_KEY'),
        })

        // 1. Fetch Campaign Details
        const { data: campaign, error: campError } = await supabase
            .from('outreach_campaigns')
            .select('*')
            .eq('id', campaign_id)
            .single()

        if (campError || !campaign) throw new Error(`Campaign not found: ${campError?.message}`)

        // 2. Fetch Leads (via segment_id)
        if (!campaign.segment_id) throw new Error('Campaign has no segment_id')

        // Get existing emails to avoid duplicates
        const { data: existingEmails } = await supabase
            .from('outreach_emails')
            .select('lead_id')
            .eq('campaign_id', campaign_id)

        const existingLeadIds = new Set(existingEmails?.map(e => e.lead_id) || [])

        // Fetch leads in segment
        const { data: leads, error: leadsError } = await supabase
            .from('leads')
            .select('*')
            .eq('segment_id', campaign.segment_id)
            .limit(100) // Safety limit for now (or pagination?)

        if (leadsError) throw new Error(`Leads fetch error: ${leadsError.message}`)

        // Filter out already generated
        const leadsToProcess = leads.filter(l => !existingLeadIds.has(l.id)).slice(0, max_leads)

        let generatedCount = 0
        const errors = []

        // 3. Generate Content for each lead
        for (const lead of leadsToProcess) {
            try {
                // Construct System & User Prompt
                const systemPrompt = `You are an expert sales copywriter.
                Your goal is to write a personalized cold email based on the user's instructions.
                Return ONLY a JSON object with keys: "subject" and "body".
                The body should be HTML formatted (simple <p>, <br>, <strong>).
                Do not include markdown code blocks.`

                // Replace variables in user prompt
                let userPrompt = campaign.settings?.prompt || "Write a friendly intro email."

                // Simple variable replacement
                userPrompt = userPrompt.replace(/\{\{name\}\}/gi, lead.name || 'there')
                userPrompt = userPrompt.replace(/\{\{company\}\}/gi, lead.company || 'your company')
                userPrompt = userPrompt.replace(/\{\{industry\}\}/gi, lead.industry || 'your industry')

                // Add lead context
                userPrompt += `\n\nLead Context:\nName: ${lead.name}\nCompany: ${lead.company}\nIndustry: ${lead.industry}\nNotes: ${lead.notes || ''}`

                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    model: "gpt-4-1106-preview", // or gpt-3.5-turbo-1106
                    response_format: { type: "json_object" },
                })

                const content = JSON.parse(completion.choices[0].message.content || '{}')
                if (!content.subject || !content.body) throw new Error('Invalid AI response format')

                // 4. Save draft to outreach_emails
                await supabase.from('outreach_emails').insert({
                    campaign_id,
                    lead_id: lead.id,
                    subject: content.subject,
                    content: content.body, // Assuming 'content' column stores body
                    status: 'pending',
                    workspace_id: campaign.workspace_id,
                    created_by: campaign.created_by // Or system user?
                })

                generatedCount++

            } catch (err: any) {
                console.error(`Error generating for lead ${lead.id}:`, err)
                errors.push({ lead_id: lead.id, error: err.message })
            }
        }

        return new Response(JSON.stringify({
            success: true,
            generated: generatedCount,
            errors
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
