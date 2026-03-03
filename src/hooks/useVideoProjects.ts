// src/hooks/useVideoProjects.ts
// Data access hook for video_projects table

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { VideoProject, VideoStatus, VIDEO_STATUS_ORDER } from '@/types';
import { sendNotificationEmail } from '@/utils/emailUtils';

export const useVideoProjects = () => {
    const [projects, setProjects] = useState<VideoProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError(null);

        const query = supabase
            .from('video_projects')
            .select('*')
            .order('created_at', { ascending: false });

        const { data, error: fetchError } = await query;

        if (fetchError) {
            setError(fetchError.message);
        } else {
            setProjects((data as VideoProject[]) || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchProjects();

        // Realtime subscription for live updates
        const channelName = 'video_projects_global';
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'video_projects',
                },
                () => {
                    fetchProjects();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchProjects]);

    // ── Mutations ──────────────────────────────────────────────

    const createProject = useCallback(
        async (input: Omit<VideoProject, 'id' | 'created_at' | 'updated_at'>) => {
            const { data, error: e } = await supabase
                .from('video_projects')
                .insert({ ...input })
                .select()
                .single();
            if (e) throw new Error(e.message);
            return data as VideoProject;
        },
        []
    );

    const updateProject = useCallback(
        async (id: string, updates: Partial<VideoProject>) => {
            const { error: e } = await supabase
                .from('video_projects')
                .update(updates)
                .eq('id', id);
            if (e) throw new Error(e.message);
            // Optimistic update
            setProjects((prev) =>
                prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
            );
        },
        []
    );

    const deleteProject = useCallback(
        async (id: string) => {
            const { error: e } = await supabase
                .from('video_projects')
                .delete()
                .eq('id', id);
            if (e) throw new Error(e.message);
            // Optimistic update
            setProjects((prev) => prev.filter((p) => p.id !== id));
        },
        []
    );

    // Advance to next status — enforces proof link gate
    const advanceStatus = useCallback(
        async (
            project: VideoProject,
            proofUrl?: string,
            attendanceStatus?: 'pending' | 'attended' | 'not_attended'
        ): Promise<{ blocked: boolean; reason?: string }> => {
            const currentIndex = VIDEO_STATUS_ORDER.indexOf(project.status);
            if (currentIndex === VIDEO_STATUS_ORDER.length - 1) {
                return { blocked: false }; // already at done
            }

            const nextStatus = VIDEO_STATUS_ORDER[currentIndex + 1];
            const updates: Partial<VideoProject> = {};
            let emailTrigger: 'send_to_editor' | 'send_to_publisher' | null = null;

            // 1. Leaving Scheduled -> Shoot Done
            if (project.status === 'scheduled') {
                const finalAttendance = (attendanceStatus && attendanceStatus !== 'pending')
                    ? attendanceStatus
                    : project.attendance_status;

                if (finalAttendance === undefined || finalAttendance === 'pending') {
                    return { blocked: true, reason: 'Please select an attendance status (Attended or No-show) to proceed.' };
                }

                updates.attendance_status = finalAttendance;

                if (finalAttendance === 'attended') {
                    updates.status = nextStatus;
                    // Note: Proof URL check is intentionally NOT here because we decided Scheduled -> Shoot Done
                    // only requires attendance, whereas Shoot Done -> Editing requires the RAW file link.
                } else {
                    // Update the row but don't advance the column if no-show
                    await updateProject(project.id, updates);
                    return { blocked: true, reason: 'Draft saved. Shoot was not attended, reschedule to proceed.' };
                }
            }

            // 2. Leaving Shoot Done -> Editing
            else if (project.status === 'shoot_done') {
                const url = proofUrl || project.shoot_proof_url;
                if (!url || url.trim() === '') {
                    return { blocked: true, reason: 'Add a Google Drive proof link for the shoot before advancing.' };
                }
                updates.status = nextStatus;
                updates.shoot_proof_url = url;
                emailTrigger = 'send_to_editor';
            }

            // 3. Leaving Editing -> Publish
            else if (project.status === 'editing') {
                const url = proofUrl || project.edit_proof_url;
                if (!url || url.trim() === '') {
                    return { blocked: true, reason: 'Add a Google Drive proof link from the editor before advancing.' };
                }
                updates.status = nextStatus;
                updates.edit_proof_url = url;
                emailTrigger = 'send_to_publisher';
            }

            // 4. Leaving Publish -> Done
            else if (project.status === 'publish') {
                const url = proofUrl || project.social_media_url;
                if (!url || url.trim() === '') {
                    return { blocked: true, reason: 'Add the Social Media URL where the video was published.' };
                }
                updates.status = nextStatus;
                updates.social_media_url = url;
            }

            // Optimistic update
            await updateProject(project.id, updates);

            // Handle Email Notifications
            if (emailTrigger) {
                try {
                    if (emailTrigger === 'send_to_editor' && project.assigned_editor_id) {
                        const { data } = await supabase.from('users').select('email').eq('id', project.assigned_editor_id).single();
                        if (data?.email) {
                            sendNotificationEmail({
                                to_email: [data.email],
                                subject: `New Video to Edit: ${project.chef_name}`,
                                html_content: `
                                    <div style="font-family: sans-serif; color: #333;">
                                        <h2 style="color: #4f46e5;">Raw Files Ready for Editing</h2>
                                        <p>The raw shoot files have been uploaded for <strong>${project.chef_name}</strong>.</p>
                                        <p><strong>Raw Files Link:</strong> <a href="${updates.shoot_proof_url}">${updates.shoot_proof_url}</a></p>
                                        <p style="margin-top: 20px; font-size: 12px; color: #888;">Please start editing and upload the final version to the Video Pipeline dashboard when complete.</p>
                                    </div>
                                `
                            }).catch(console.error); // Fire and forget
                        }
                    } else if (emailTrigger === 'send_to_publisher' && project.assigned_publisher_id) {
                        const { data } = await supabase.from('users').select('email').eq('id', project.assigned_publisher_id).single();
                        if (data?.email) {
                            sendNotificationEmail({
                                to_email: [data.email],
                                subject: `New Video to Publish: ${project.chef_name}`,
                                html_content: `
                                    <div style="font-family: sans-serif; color: #333;">
                                        <h2 style="color: #4f46e5;">Edited Video Ready for Publishing</h2>
                                        <p>The final edited video is ready for <strong>${project.chef_name}</strong>.</p>
                                        <p><strong>Edited Files Link:</strong> <a href="${updates.edit_proof_url}">${updates.edit_proof_url}</a></p>
                                        <p style="margin-top: 20px; font-size: 12px; color: #888;">Please publish this to social media and paste the URL back into the Video Pipeline dashboard.</p>
                                    </div>
                                `
                            }).catch(console.error); // Fire and forget
                        }
                    }
                } catch (err) {
                    console.error('Quietly failing email lookup during advancement:', err);
                }
            }

            return { blocked: false };
        },
        [updateProject]
    );

    // Computed stats
    const stats = {
        total: projects.length,
        scheduled: projects.filter((p) => p.status === 'scheduled').length,
        shoot_done: projects.filter((p) => p.status === 'shoot_done').length,
        editing: projects.filter((p) => p.status === 'editing').length,
        publish: projects.filter((p) => p.status === 'publish').length,
        done: projects.filter((p) => p.status === 'done').length,
    };

    const byStatus: Record<VideoStatus, VideoProject[]> = {
        scheduled: projects.filter((p) => p.status === 'scheduled'),
        shoot_done: projects.filter((p) => p.status === 'shoot_done'),
        editing: projects.filter((p) => p.status === 'editing'),
        publish: projects.filter((p) => p.status === 'publish'),
        done: projects.filter((p) => p.status === 'done'),
    };

    return {
        projects,
        byStatus,
        stats,
        loading,
        error,
        fetchProjects,
        createProject,
        updateProject,
        deleteProject,
        advanceStatus,
    };
};
