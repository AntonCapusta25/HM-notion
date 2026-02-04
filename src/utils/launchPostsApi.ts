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
 * Upload a generated base64 image to Supabase Storage
 */
export async function uploadGeneratedImage(base64Data: string, mimeType: string = 'image/png'): Promise<string | null> {
    try {
        // Convert base64 to Blob
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        const fileName = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}.${mimeType.split('/')[1]}`;
        const filePath = `${fileName}`;

        // Upload to 'generated-launch-posts' bucket (ensure this bucket exists!)
        const { data, error } = await supabase.storage
            .from('generated-launch-posts')
            .upload(filePath, blob, {
                contentType: mimeType,
                upsert: false
            });

        if (error) {
            console.error('Upload failed:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('generated-launch-posts')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (err) {
        console.error('Error uploading image:', err);
        return null; // Fallback to base64 if upload fails?
    }
}

/**
 * Convert JSON prompt to human-readable text for display
 */
export function promptToText(prompt: LaunchPostPrompt): string {
    const sections: string[] = [];
    sections.push(`📷 Camera: ${prompt.camera.model} with ${prompt.camera.lens}`);
    sections.push(`🎯 Subject: ${prompt.subject.primary}`);
    sections.push(`💡 Lighting: ${prompt.lighting.source} - ${prompt.lighting.quality}`);
    sections.push(`🎨 Style: ${prompt.style.artDirection}`);
    sections.push(`🌈 Colors: ${prompt.colorPlate.primaryColors.join(', ')}`);
    return sections.join('\n');
}
