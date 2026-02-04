import { supabase } from '@/lib/supabase';
import { LaunchPostPrompt, LaunchPostTemplate } from '@/types/launchPosts';

export interface GenerateImageResponse {
    success: boolean;
    imageUrl?: string;
    imageData?: string;
    error?: string;
    prompt?: string;
    mimeType?: string;
}

// Template API
export async function fetchTemplates(): Promise<LaunchPostTemplate[]> {
    const { data, error } = await supabase
        .from('launch_post_templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching templates:', error);
        throw error;
    }

    return (data || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        prompt: t.prompt,
        isDefault: t.is_default,
        createdAt: new Date(t.created_at),
        userId: t.user_id
    }));
}

export async function createTemplate(template: Omit<LaunchPostTemplate, 'id' | 'createdAt'>): Promise<LaunchPostTemplate> {
    const { data, error } = await supabase
        .from('launch_post_templates')
        .insert({
            name: template.name,
            description: template.description,
            prompt: template.prompt,
            is_default: template.isDefault || false
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating template:', error);
        throw error;
    }

    return {
        id: data.id,
        name: data.name,
        description: data.description,
        prompt: data.prompt,
        isDefault: data.is_default,
        createdAt: new Date(data.created_at),
        userId: data.user_id
    };
}

export async function deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
        .from('launch_post_templates')
        .delete()
        .eq('id', id);

    if (error) {
        throw error;
    }
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
