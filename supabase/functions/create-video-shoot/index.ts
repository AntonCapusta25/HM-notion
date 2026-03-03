// supabase/functions/create-video-shoot/index.ts
// Called from the lovable onboarding admin dashboard when a shooting date is confirmed.
// Auth: Bearer token matching HOMEBASE_API_KEY secret.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Shared secret — set in Supabase dashboard > Settings > Edge Functions > Secrets
const HOMEBASE_API_KEY = Deno.env.get('HOMEBASE_API_KEY')

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Known team members — store emails and resolve UUIDs at runtime
const TEAM = {
    editor: {
        email: 'abdellrahman@homemadeplatform.com',   // ← update if different
        name: 'Abdellrahman',
    },
    publisher: {
        email: 'mennat@homemadeplatform.com',          // ← update if different
        name: 'Mennat',
    },
}

interface ShootRequest {
    chef_id: string
    chef_name: string
    chef_hyperzod_id?: string
    shoot_date: string        // ISO date string YYYY-MM-DD
    location?: string
    notes?: string
    triggered_by?: string     // user ID from lovable (kept for logging but not inserted)
}

serve(async (req) => {
    // Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS })
    }

    try {
        const authHeader = req.headers.get('authorization') || ''
        const providedKey = authHeader.replace('Bearer ', '').trim()

        if (!HOMEBASE_API_KEY) {
            console.error('CRITICAL: HOMEBASE_API_KEY is missing from Supabase Secrets. Denying all requests.');
            return json({ success: false, error: 'Server configuration error' }, 500)
        }

        if (providedKey !== HOMEBASE_API_KEY) {
            return json({ success: false, error: 'Unauthorized' }, 401)
        }

        let body: ShootRequest;
        try {
            body = await req.json()
        } catch (e: any) {
            console.error('Failed to parse request JSON body', e.message);
            return json({ success: false, error: 'Invalid JSON body' }, 400)
        }

        console.log('Parsed body:', JSON.stringify(body))

        const { chef_id, chef_name, shoot_date } = body

        if (!chef_id || !chef_name || !shoot_date) {
            return json({
                success: false,
                error: 'Required fields: chef_id, chef_name, shoot_date',
            }, 400)
        }

        // ── 3. Validate date ──────────────────────────────────────
        if (!/^\d{4}-\d{2}-\d{2}$/.test(shoot_date)) {
            return json({ success: false, error: 'shoot_date must be YYYY-MM-DD' }, 400)
        }

        // ── 4. Supabase client (service role — bypasses RLS) ─────
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // ── 5. Resolve team member UUIDs ─────────────────────────
        const resolveUserId = async (email: string): Promise<{ id: string } | null> => {
            const { data } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle()
            return data
        }

        const [editorUser, publisherUser] = await Promise.all([
            resolveUserId(TEAM.editor.email),
            resolveUserId(TEAM.publisher.email),
        ])

        // ── 6. Insert video project ───────────────────────────────
        console.log('Resolved users:', { editorUser, publisherUser });

        const insertPayload = {
            chef_id,
            chef_name,
            chef_hyperzod_id: body.chef_hyperzod_id || null,
            shoot_date,
            location: body.location || null,
            notes: body.notes || null,
            status: 'scheduled' as const,
            assigned_editor_id: editorUser?.id || null,
            assigned_editor_name: TEAM.editor.name,
            assigned_publisher_id: publisherUser?.id || null,
            assigned_publisher_name: TEAM.publisher.name,
            triggered_from: 'lovable',
        };

        console.log('Attempting insert with payload:', JSON.stringify(insertPayload));

        const { data: project, error: insertError } = await supabase
            .from('video_projects')
            .insert(insertPayload)
            .select('id, chef_name, shoot_date, status')
            .single()

        if (insertError) {
            console.error('Insert error:', insertError)
            throw new Error(`Failed to create video project: ${insertError.message}`)
        }

        console.log(`✅ Video shoot created for ${chef_name} on ${shoot_date}: ${project.id}`)

        return json({
            success: true,
            project_id: project.id,
            message: `Shoot scheduled for ${chef_name} on ${shoot_date}`,
            project,
        })

    } catch (err: any) {
        console.error('create-video-shoot error:', err)
        return json({ success: false, error: err.message }, 500)
    }
})

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
}
