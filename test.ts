import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
    "https://wqpmhnsxqcsplfdyxrih.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxcG1obnN4cWNzcGxmZHl4cmloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQyMTA3MywiZXhwIjoyMDcxOTk3MDczfQ.LcIhW37JDQU61dnjdOk5P2MRau8TfUqIwo3HXJHOnb8"
);

const TEAM = {
    editor: {
        email: 'abdellrahman@homemadeplatform.com',
        name: 'Abdellrahman',
    },
    publisher: {
        email: 'mennat@homemadeplatform.com',
        name: 'Mennat',
    },
}

async function run() {
    try {
        const body: any = {
            chef_id: "test",
            chef_name: "Test Chef",
            shoot_date: "2026-03-15",
            triggered_by: "test"
        };

        const { chef_id, chef_name, shoot_date } = body;

        const resolveUserId = async (email: string) => {
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
        ]);

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
            created_by: (body.triggered_by && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.triggered_by)) ? body.triggered_by : null,
            triggered_from: 'lovable',
        };

        const { data: project, error: insertError } = await supabase
            .from('video_projects')
            .insert(insertPayload)
            .select('id, chef_name, shoot_date, status')
            .single()

        if (insertError) {
            throw new Error(`Failed to create video project: ${insertError.message}`)
        }

        console.log("Success:", project);
    } catch (e: any) {
        console.error("Caught error:", e.message);
    }
}

run();
