import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
    try {
        console.log('🚀 Triggering Trend Radar pipeline via webhook...');

        // In production, this would trigger GitHub Actions workflow
        // For now, return success and user can set up GitHub Actions trigger

        return new Response(JSON.stringify({
            success: true,
            message: 'Pipeline trigger received. Email will arrive in 5-10 minutes.'
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });
    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
