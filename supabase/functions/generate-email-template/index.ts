// Supabase Edge Function: generate-email-template
// Generates beautiful HTML email templates using Gemini AI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

serve(async (req) => {
    try {
        const { prompt, brandColors, workspaceId } = await req.json()

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Prompt is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Create system prompt with brand colors
        const systemPrompt = `You are an expert email designer specializing in creating beautiful, responsive HTML emails.

BRAND COLORS:
- Primary: ${brandColors.primary}
- Secondary: ${brandColors.secondary}
- Accent: ${brandColors.accent}
- Text: ${brandColors.text}
- Background: ${brandColors.background}

REQUIREMENTS:
1. Create a professional, mobile-responsive HTML email
2. Use inline CSS (required for email clients)
3. Include the brand colors in the design
4. Make it visually appealing with proper spacing
5. Ensure compatibility with Gmail, Outlook, Apple Mail
6. Include a clear call-to-action button
7. Use web-safe fonts
8. Keep the design clean and modern

IMPORTANT:
- Return ONLY the HTML code, no explanations
- Use tables for layout (email client compatibility)
- All CSS must be inline
- Images should use placeholder URLs (https://via.placeholder.com/)
- Make text easily readable

USER REQUEST: ${prompt}

Generate the complete HTML email template now:`

        // Call Gemini API
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: systemPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            })
        })

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`)
        }

        const data = await response.json()
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!generatedText) {
            throw new Error('No content generated')
        }

        // Extract HTML from markdown code blocks if present
        let html = generatedText
        const htmlMatch = generatedText.match(/```html\n([\s\S]*?)\n```/)
        if (htmlMatch) {
            html = htmlMatch[1]
        }

        return new Response(
            JSON.stringify({
                html,
                success: true
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Error generating email template:', error)
        return new Response(
            JSON.stringify({
                error: error.message || 'Failed to generate template',
                success: false
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
})
