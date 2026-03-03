// src/components/video/AddShootDialog.tsx
// Manual quick-add dialog for ad-hoc shoots NOT coming via the lovable edge function

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VideoProject } from '@/types';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Film } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useUsersQuery } from '@/hooks/queries/useTasksQuery';
import { sendNotificationEmail } from '@/utils/emailUtils';

interface AddShootDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreateProject: (input: Omit<VideoProject, 'id' | 'created_at' | 'updated_at'>) => Promise<VideoProject>;
}

export const AddShootDialog = ({ open, onOpenChange, onCreateProject }: AddShootDialogProps) => {
    const { user } = useAuth();
    const { data: users = [] } = useUsersQuery();

    const editorUser = users.find(u => u.name.toLowerCase().includes('abdellrahman') || u.name.toLowerCase().includes('abdelrahman'));
    const publisherUser = users.find(u => u.name.toLowerCase().includes('mennat') || u.name.toLowerCase().includes('menna'));

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        chef_name: '',
        chef_id: '',
        chef_hyperzod_id: '',
        shoot_date: '',
        location: '',
        notes: '',
        assigned_shooter_id: 'none',
    });

    const set = (field: string, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.chef_name || !form.shoot_date) {
            toast({ title: 'Chef name and shoot date are required', variant: 'destructive' });
            return;
        }

        const selectedShooter = form.assigned_shooter_id !== 'none'
            ? users.find(u => u.id === form.assigned_shooter_id)
            : undefined;

        setLoading(true);
        try {
            await onCreateProject({
                chef_id: form.chef_id || `manual_${Date.now()}`,
                chef_name: form.chef_name.trim(),
                chef_hyperzod_id: form.chef_hyperzod_id || undefined,
                shoot_date: form.shoot_date,
                location: form.location || undefined,
                notes: form.notes || undefined,
                status: 'scheduled',
                attendance_status: 'pending',
                assigned_shooter_id: selectedShooter?.id,
                assigned_shooter_name: selectedShooter?.name,
                assigned_editor_name: editorUser ? editorUser.name : 'Abdellrahman',
                assigned_editor_id: editorUser?.id,
                assigned_publisher_name: publisherUser ? publisherUser.name : 'Mennat',
                assigned_publisher_id: publisherUser?.id,
                created_by: user?.id,
                triggered_from: 'manual',
            });

            toast({ title: `📅 Shoot scheduled for ${form.chef_name}` });

            // Trigger Stage 1 Email: Shoot Assigned / Created
            const recipients: string[] = [];
            if (selectedShooter?.email) recipients.push(selectedShooter.email);
            if (editorUser?.email) recipients.push(editorUser.email);
            if (publisherUser?.email) recipients.push(publisherUser.email);

            // Deduplicate emails just in case
            const uniqueRecipients = [...new Set(recipients)];

            if (uniqueRecipients.length > 0) {
                // Fire and forget email
                sendNotificationEmail({
                    to_email: uniqueRecipients,
                    subject: `New Video Shoot Scheduled: ${form.chef_name}`,
                    html_content: `
                        <div style="font-family: sans-serif; color: #333;">
                            <h2 style="color: #4f46e5;">New Shoot Scheduled</h2>
                            <p>A new video shoot has been scheduled for <strong>${form.chef_name}</strong> on <strong>${form.shoot_date}</strong>.</p>
                            ${form.location ? `<p><strong>Location:</strong> ${form.location}</p>` : ''}
                            ${form.notes ? `<p><strong>Notes:</strong> ${form.notes}</p>` : ''}
                            <hr style="border: 1px solid #eee; margin: 20px 0;" />
                            <h3>Assignments</h3>
                            <ul>
                                <li><strong>Videographer:</strong> ${selectedShooter?.name || 'Unassigned'}</li>
                                <li><strong>Editor:</strong> ${editorUser ? editorUser.name : 'Abdellrahman'}</li>
                                <li><strong>Publisher:</strong> ${publisherUser ? publisherUser.name : 'Mennat'}</li>
                            </ul>
                            <p style="margin-top: 20px; font-size: 12px; color: #888;">Go to the Video Pipeline dashboard to view more details.</p>
                        </div>
                    `
                }).catch(console.error);
            }

            onOpenChange(false);
            setForm({ chef_name: '', chef_id: '', chef_hyperzod_id: '', shoot_date: '', location: '', notes: '', assigned_shooter_id: 'none' });
        } catch (err: any) {
            toast({ title: 'Failed to create shoot', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white border border-slate-200 text-slate-900 max-w-md shadow-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
                        <Film className="h-5 w-5 text-violet-600" />
                        Schedule a Shoot
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-slate-700 text-xs font-semibold">Chef Name *</Label>
                            <Input
                                value={form.chef_name}
                                onChange={(e) => set('chef_name', e.target.value)}
                                placeholder="e.g. Hassan el-Amin"
                                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-700 text-xs font-semibold">Chef ID</Label>
                            <Input
                                value={form.chef_id}
                                onChange={(e) => set('chef_id', e.target.value)}
                                placeholder="Optional"
                                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-700 text-xs font-semibold">Hyperzod ID</Label>
                            <Input
                                value={form.chef_hyperzod_id}
                                onChange={(e) => set('chef_hyperzod_id', e.target.value)}
                                placeholder="HZ-XXXX"
                                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20"
                            />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-slate-700 text-xs font-semibold">Shoot Date *</Label>
                            <Input
                                type="date"
                                value={form.shoot_date}
                                onChange={(e) => set('shoot_date', e.target.value)}
                                className="bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 focus:ring-violet-500/20"
                            />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-slate-700 text-xs font-semibold">Location</Label>
                            <Input
                                value={form.location}
                                onChange={(e) => set('location', e.target.value)}
                                placeholder="e.g. Rotterdam Studio"
                                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20"
                            />
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-slate-700 text-xs font-semibold">Assign Videographer</Label>
                            <Select value={form.assigned_shooter_id} onValueChange={(val) => set('assigned_shooter_id', val)}>
                                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500 focus:ring-violet-500/20">
                                    <SelectValue placeholder="Select videographer" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-md">
                                    <SelectItem value="none" className="text-slate-500">Unassigned</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-slate-700 text-xs font-semibold">Notes</Label>
                            <Textarea
                                value={form.notes}
                                onChange={(e) => set('notes', e.target.value)}
                                placeholder="Bring 5 dishes, special lighting req..."
                                rows={3}
                                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 resize-none focus:border-violet-500 focus:ring-violet-500/20"
                            />
                        </div>
                    </div>

                    {/* Auto-assignment info */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500 space-y-1">
                        <p className="text-slate-900 font-bold mb-1">Auto-assignments</p>
                        <p>✂️ Editing → <span className="text-violet-700 font-medium">{editorUser ? editorUser.name : 'loading...'}</span></p>
                        <p>📣 Publish → <span className="text-sky-700 font-medium">{publisherUser ? publisherUser.name : 'loading...'}</span></p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-violet-600 hover:bg-violet-500 text-white"
                        >
                            {loading ? 'Scheduling...' : 'Schedule Shoot'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
