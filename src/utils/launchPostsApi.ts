import { supabase } from '@/lib/supabase';
import { LaunchPostPrompt } from '@/types/launchPosts';

export interface GenerateImageResponse {
    success: boolean;
    imageUrl?: string;
    imageData?: string;
    error?: string;
}

/**
 * Generate an image using the Supabase Edge Function
 * This calls the secure server-side function that uses the Gemini API
 */
export async function generateImage(prompt: LaunchPostPrompt): Promise<GenerateImageResponse> {
    try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
            body: { prompt }
        });

        if (error) {
            console.error('Edge function error:', error);
            return {
                success: false,
                error: error.message || 'Failed to generate image'
            };
        }

        return {
            success: true,
            ...data
        };
    } catch (error) {
        console.error('Error calling generate-image function:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Convert JSON prompt to human-readable text for display
 */
export function promptToText(prompt: LaunchPostPrompt): string {
    const sections: string[] = [];

    // Camera
    sections.push(`📷 Camera: ${prompt.camera.model} with ${prompt.camera.lens}`);

    // Subject
    sections.push(`🎯 Subject: ${prompt.subject.primary}`);

    // Lighting
    sections.push(`💡 Lighting: ${prompt.lighting.source} - ${prompt.lighting.quality}`);

    // Style
    sections.push(`🎨 Style: ${prompt.style.artDirection}`);

    // Colors
    sections.push(`🌈 Colors: ${prompt.colorPlate.primaryColors.join(', ')}`);

    return sections.join('\n');
}
