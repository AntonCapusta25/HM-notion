import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get the Gemini API key from Supabase secrets
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY not configured in Supabase secrets')
        }

        // Parse the request body
        const { prompt } = await req.json()

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Prompt is required' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Convert JSON prompt to text prompt
        const textPrompt = convertPromptToText(prompt)

        console.log('Generating image with prompt:', textPrompt)

        // Use Gemini 2.5 Flash Image for image generation
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiApiKey,
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: textPrompt.split('|')[0].trim() // Use only positive prompt
                        }]
                    }]
                })
            }
        )

        if (!response.ok) {
            const errorData = await response.text()
            console.error('Gemini API error:', errorData)
            throw new Error(`Gemini API error: ${response.status} - ${errorData}`)
        }

        const data = await response.json()

        // Extract the image from the response
        if (data.candidates && data.candidates[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    // Return the base64 image data
                    return new Response(
                        JSON.stringify({
                            success: true,
                            imageData: part.inlineData.data,
                            mimeType: part.inlineData.mimeType || 'image/png',
                            prompt: textPrompt
                        }),
                        {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                        }
                    )
                }
            }
        }

        // If no image was found in the response
        throw new Error('No image generated in response')

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})

// Helper function to convert JSON prompt to text
function convertPromptToText(prompt: any): string {
    const sections = []

    // Camera settings
    if (prompt.camera) {
        sections.push(`Camera: ${prompt.camera.model}, ${prompt.camera.lens}, ${prompt.camera.aperture}, ${prompt.camera.shutter}, ISO ${prompt.camera.iso}. Framing: ${prompt.camera.framing}. Angle: ${prompt.camera.angle}. Movement: ${prompt.camera.movement}.`)
    }

    // Subject
    if (prompt.subject) {
        sections.push(`Subject: ${prompt.subject.primary}. ${prompt.subject.secondary}. Pose: ${prompt.subject.pose}. Expression: ${prompt.subject.expression}. Build: ${prompt.subject.build}.`)
    }

    // Character details
    if (prompt.character) {
        sections.push(`Character: Hair: ${prompt.character.hair}. Wardrobe: ${prompt.character.wardrobeNotes}. Props: ${prompt.character.props.join(', ')}.`)
    }

    // Material physics
    if (prompt.materialPhysics) {
        sections.push(`Materials: ${prompt.materialPhysics.fabricBehavior}. Surface: ${prompt.materialPhysics.surfaceQuality}. Light interaction: ${prompt.materialPhysics.lightInteraction}.`)
    }

    // Composition
    if (prompt.composition) {
        sections.push(`Composition: ${prompt.composition.theory}. Depth: ${prompt.composition.depth}. Focus: ${prompt.composition.focus}.`)
    }

    // Setting
    if (prompt.setting) {
        sections.push(`Setting: ${prompt.setting.environment}. Time: ${prompt.setting.timeOfDay}. Atmosphere: ${prompt.setting.atmosphere}. Shadows: ${prompt.setting.shadowPlay}.`)
    }

    // Lighting
    if (prompt.lighting) {
        sections.push(`Lighting: Source: ${prompt.lighting.source}. Direction: ${prompt.lighting.direction}. Quality: ${prompt.lighting.quality}. Temperature: ${prompt.lighting.colorTemperature}.`)
    }

    // Style
    if (prompt.style) {
        sections.push(`Style: ${prompt.style.artDirection}. Mood: ${prompt.style.mood}. References: ${prompt.style.references.join(', ')}.`)
    }

    // Rendering
    if (prompt.rendering) {
        sections.push(`Rendering: ${prompt.rendering.engine}. Fidelity: ${prompt.rendering.fidelitySpec}. Post-processing: ${prompt.rendering.postProcessing}.`)
    }

    // Colors
    if (prompt.colorPlate) {
        sections.push(`Colors: Primary: ${prompt.colorPlate.primaryColors.join(', ')}. Accents: ${prompt.colorPlate.accentColors.join(', ')}.`)
    }

    let fullPrompt = sections.join(' ')

    // Add negative prompt
    if (prompt.negative_prompt) {
        fullPrompt += ` | Negative prompt: ${prompt.negative_prompt}`
    }

    return fullPrompt
}
