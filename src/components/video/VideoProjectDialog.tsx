// src/components/video/VideoProjectDialog.tsx
// Full detail/action dialog for a video project (step-gated pipeline)

import { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    VideoProject, VIDEO_STATUS_CONFIG, VIDEO_STATUS_ORDER,
} from '@/types';
import {
    Calendar, MapPin, ExternalLink, AlertCircle,
    CheckCircle2, Lock, ChevronRight, Loader2, Camera, Trash2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { useUsersQuery } from '@/hooks/queries/useTasksQuery';

interface VideoProjectDialogProps {
    project: VideoProject | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (id: string, updates: Partial<VideoProject>) => Promise<void>;
    onAdvance: (project: VideoProject, proofUrl?: string, attendanceStatus?: 'attended' | 'not_attended') => Promise<{ blocked: boolean; reason?: string }>;
    onDelete?: (id: string) => Promise<void>;
}

// Step definitions — drives UI progression
const STEPS = [
    {
        status: 'scheduled' as const,
        title: 'Shoot Scheduled',
        emoji: '📅',
        description: 'The shoot is on the calendar. Was it attended?',
        proofField: null,
        proofLabel: null,
        proofPlaceholder: null,
        attendanceField: true,
        advanceLabel: 'Save Attendance',
        advanceColor: 'bg-amber-600 hover:bg-amber-500',
    },
    {
        status: 'shoot_done' as const,
        title: 'Shoot Done — Editing',
        emoji: '🎬',
        description: 'Shoot completed! Upload raw files to Drive and paste the link below to unlock editing.',
        proofField: 'shoot_proof_url' as const,
        proofLabel: 'Raw Files Proof (Google Drive link)',
        proofPlaceholder: 'https://drive.google.com/...',
        advanceLabel: 'Send to Editor ✓',
        advanceColor: 'bg-violet-600 hover:bg-violet-500',
    },
    {
        status: 'editing' as const,
        title: 'Ready to Publish',
        emoji: '✂️',
        description: 'Raw files uploaded. Abdellrahman is editing. Once done, upload the edited files and paste the link.',
        proofField: 'edit_proof_url' as const,
        proofLabel: 'Edited Video Proof (Google Drive link)',
        proofPlaceholder: 'https://drive.google.com/...',
        advanceLabel: 'Mark as Ready to Publish 🚀',
        advanceColor: 'bg-sky-600 hover:bg-sky-500',
    },
    {
        status: 'publish' as const,
        title: 'Publishing',
        emoji: '📣',
        description: 'Edit complete. Mennat will publish the content. Paste the Social Media URL below.',
        proofField: 'social_media_url' as const,
        proofLabel: 'Social Media URL',
        proofPlaceholder: 'https://instagram.com/...',
        advanceLabel: 'Mark as Published 🎉',
        advanceColor: 'bg-emerald-600 hover:bg-emerald-500',
    },
    {
        status: 'done' as const,
        title: 'Published! 🎉',
        emoji: '🚀',
        description: 'All done — content is live.',
        proofField: null,
        proofLabel: null,
        proofPlaceholder: null,
        attendanceField: false,
        advanceLabel: null,
        advanceColor: null,
    },
];

export const VideoProjectDialog = ({
    project, open, onOpenChange, onUpdate, onAdvance, onDelete
}: VideoProjectDialogProps) => {
    const { data: users = [] } = useUsersQuery();
    const [proofUrl, setProofUrl] = useState('');
    const [attendanceStatus, setAttendanceStatus] = useState<'pending' | 'attended' | 'not_attended'>('pending');

    // Meta edit state
    const [metaForm, setMetaForm] = useState({ shoot_date: '', location: '', notes: '', assigned_shooter_id: 'none' });
    const [savingMeta, setSavingMeta] = useState(false);
    const [advancing, setAdvancing] = useState(false);

    // Sync project data when opened
    useEffect(() => {
        if (project && open) {
            setMetaForm({
                shoot_date: project.shoot_date || '',
                location: project.location || '',
                notes: project.notes || '',
                assigned_shooter_id: project.assigned_shooter_id || 'none',
            });
            setAttendanceStatus(project.attendance_status || 'pending');
            setProofUrl('');
        }
    }, [project, open]);

    if (!project) return null;

    const currentIndex = VIDEO_STATUS_ORDER.indexOf(project.status);
    const currentStep = STEPS.find((s) => s.status === project.status) ?? STEPS[STEPS.length - 1];
    const isDone = project.status === 'done';

    const handleAdvance = async () => {
        setAdvancing(true);
        try {
            const result = await onAdvance(project, proofUrl || undefined, attendanceStatus === 'pending' ? undefined : attendanceStatus);
            if (result.blocked) {
                toast({ title: '⛔ Wait!', description: result.reason, variant: 'destructive' });
            } else {
                toast({ title: '✅ Stage advanced!' });
                setProofUrl('');
            }
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setAdvancing(false);
        }
    };

    const handleDelete = async () => {
        if (!project || !onDelete) return;

        // Confirm deletion
        if (!confirm(`Are you sure you want to delete the video project for ${project.chef_name}? This action cannot be undone.`)) {
            return;
        }

        try {
            await onDelete(project.id);
            toast({ title: "Project deleted successfully." });
            onOpenChange(false);
        } catch (err: any) {
            toast({ title: "Failed to delete project", description: err.message, variant: "destructive" });
        }
    };

    const handleSaveMeta = async () => {
        setSavingMeta(true);
        try {
            const selectedShooter = metaForm.assigned_shooter_id !== 'none'
                ? users.find(u => u.id === metaForm.assigned_shooter_id)
                : undefined;

            await onUpdate(project.id, {
                shoot_date: metaForm.shoot_date,
                location: metaForm.location,
                notes: metaForm.notes,
                assigned_shooter_id: selectedShooter?.id || null,
                assigned_shooter_name: selectedShooter?.name || null,
            });
            toast({ title: 'Shoot details updated' });
        } catch (err: any) {
            toast({ title: 'Error saving details', description: err.message, variant: 'destructive' });
        } finally {
            setSavingMeta(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white border border-slate-200 text-slate-900 max-w-xl max-h-[90vh] overflow-y-auto p-0 shadow-lg">
                {/* Cinematic header */}
                <div className={cn(
                    'relative px-6 pt-6 pb-5',
                    'border-b border-slate-200 bg-slate-50/50',
                )}>
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-start text-xl font-bold text-slate-900 leading-snug">
                            <span>{project.chef_name}</span>
                            {onDelete && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-slate-800 -mr-2"
                                    onClick={handleDelete}
                                    title="Delete Project"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </DialogTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {project.chef_hyperzod_id && (
                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    HZ-{project.chef_hyperzod_id}
                                </span>
                            )}
                            {project.triggered_from === 'lovable' && (
                                <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-200 border">
                                    via Onboarding
                                </Badge>
                            )}
                        </div>
                    </DialogHeader>

                    {/* Shoot meta */}
                    {project.status === 'scheduled' ? (
                        <div className="mt-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-[11px] text-slate-500 mb-1.5 block uppercase tracking-wider font-semibold">Shoot Date</Label>
                                    <Input
                                        type="date"
                                        value={metaForm.shoot_date}
                                        onChange={(e) => setMetaForm({ ...metaForm, shoot_date: e.target.value })}
                                        className="bg-slate-50 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20 text-slate-900"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px] text-slate-500 mb-1.5 block uppercase tracking-wider font-semibold">Location</Label>
                                    <Input
                                        value={metaForm.location}
                                        onChange={(e) => setMetaForm({ ...metaForm, location: e.target.value })}
                                        className="bg-slate-50 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20 text-slate-900"
                                        placeholder="e.g. Amsterdam Studio"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-[11px] text-slate-500 mb-1.5 block uppercase tracking-wider font-semibold">Videographer</Label>
                                    <Select value={metaForm.assigned_shooter_id} onValueChange={(val) => setMetaForm({ ...metaForm, assigned_shooter_id: val })}>
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
                            </div>
                            <div>
                                <Label className="text-[11px] text-slate-500 mb-1.5 block uppercase tracking-wider font-semibold">Notes</Label>
                                <textarea
                                    value={metaForm.notes}
                                    onChange={(e) => setMetaForm({ ...metaForm, notes: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm p-3 min-h-[80px] focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 resize-none"
                                    placeholder="Any context from onboarding..."
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    onClick={handleSaveMeta}
                                    disabled={savingMeta || (metaForm.shoot_date === project.shoot_date && metaForm.location === (project.location || '') && metaForm.notes === (project.notes || '') && metaForm.assigned_shooter_id === (project.assigned_shooter_id || 'none'))}
                                    className="bg-slate-100 hover:bg-slate-200 text-xs text-slate-900 border border-slate-200 font-medium"
                                >
                                    {savingMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    {new Date(project.shoot_date).toLocaleDateString('en-GB', {
                                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                    })}
                                </div>
                                {project.location && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                        {project.location}
                                    </div>
                                )}
                            </div>
                            {project.notes && (
                                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                                    {project.notes}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Pipeline progress track */}
                <div className="px-6 pt-5 pb-2">
                    <div className="flex items-center gap-1">
                        {VIDEO_STATUS_ORDER.map((status, idx) => {
                            const cfg = VIDEO_STATUS_CONFIG[status];
                            const past = idx < currentIndex;
                            const current = idx === currentIndex;
                            return (
                                <div key={status} className="flex items-center gap-1 flex-1 min-w-0">
                                    <div className={cn(
                                        'flex-1 h-1.5 rounded-full transition-all duration-500',
                                        past ? 'bg-emerald-500' : current ? `${cfg.border.replace('border-', 'bg-')} opacity-80` : 'bg-slate-200',
                                    )} />
                                    {idx < VIDEO_STATUS_ORDER.length - 1 && (
                                        <ChevronRight className={cn('h-3 w-3 shrink-0', past ? 'text-emerald-500' : 'text-slate-300')} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-1">
                        {VIDEO_STATUS_ORDER.map((status, idx) => {
                            const cfg = VIDEO_STATUS_CONFIG[status];
                            return (
                                <span key={status} className={cn(
                                    'text-[9px] uppercase tracking-wider font-semibold',
                                    idx < currentIndex ? 'text-emerald-600' :
                                        idx === currentIndex ? cfg.color : 'text-slate-400',
                                )}>
                                    {cfg.icon}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* Active step card */}
                <div className="px-6 pb-6 space-y-4">
                    {!isDone ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500 flex items-center gap-1.5 opacity-80">
                                    <span className="text-sm grayscale">{VIDEO_STATUS_CONFIG[project.status].icon}</span> Current Step
                                </p>
                                <h3 className="text-base font-bold text-slate-900">{currentStep.title}</h3>
                                <p className="text-sm text-slate-600 mt-1">{currentStep.description}</p>
                            </div>

                            {/* Assignee */}
                            {(project.status === 'scheduled' || project.status === 'shoot_done') && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {project.assigned_shooter_name?.charAt(0) ?? '?'}
                                    </div>
                                    <span className="text-slate-900 font-medium">{project.assigned_shooter_name || 'Unassigned'}</span>
                                    <span className="text-slate-500 text-xs">videographer</span>
                                </div>
                            )}
                            {(project.status === 'shoot_done' || project.status === 'editing') && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {project.assigned_editor_name?.charAt(0) ?? 'A'}
                                    </div>
                                    <span className="text-slate-900 font-medium">{project.assigned_editor_name}</span>
                                    <span className="text-slate-500 text-xs">editing</span>
                                </div>
                            )}
                            {project.status === 'publish' && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {project.assigned_publisher_name?.charAt(0) ?? 'M'}
                                    </div>
                                    <span className="text-slate-900 font-medium">{project.assigned_publisher_name}</span>
                                    <span className="text-slate-500 text-xs">publishing</span>
                                </div>
                            )}

                            {/* Existing proof links */}
                            {project.shoot_proof_url && (
                                <a
                                    href={project.shoot_proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-500 transition-colors font-medium"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Shoot files on Drive
                                </a>
                            )}
                            {project.edit_proof_url && (
                                <a
                                    href={project.edit_proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-500 transition-colors font-medium"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Edited files on Drive
                                </a>
                            )}

                            {/* Proof link input */}
                            {currentStep.proofField && (
                                <div className="space-y-1.5 border-t border-slate-200 pt-4 mt-2">
                                    <Label className="text-xs text-slate-600 flex items-center gap-1 font-semibold">
                                        <AlertCircle className={cn('h-3 w-3', proofUrl ? 'text-emerald-500' : 'text-amber-500')} />
                                        {currentStep.proofLabel}
                                        <span className="text-amber-500 ml-0.5">*required</span>
                                    </Label>
                                    <Input
                                        value={proofUrl}
                                        onChange={(e) => setProofUrl(e.target.value)}
                                        placeholder={currentStep.proofPlaceholder ?? ''}
                                        className={cn(
                                            'bg-white border text-slate-900 placeholder:text-slate-400 text-sm focus:border-violet-500 focus:ring-violet-500/20',
                                            proofUrl && proofUrl.startsWith('http')
                                                ? 'border-emerald-500'
                                                : 'border-slate-600',
                                        )}
                                    />
                                    <p className="text-[10px] text-slate-500">
                                        Without this, you cannot advance to the next pipeline stage.
                                    </p>
                                </div>
                            )}

                            {/* Attendance Toggle */}
                            {(currentStep as any).attendanceField && (
                                <div className="space-y-2 border-t border-slate-200 pt-4 mt-2">
                                    <Label className="text-xs text-slate-600 flex items-center gap-1 font-semibold">
                                        <AlertCircle className={cn('h-3 w-3', attendanceStatus !== 'pending' ? 'text-emerald-500' : 'text-amber-500')} />
                                        Shoot Attendance
                                        <span className="text-amber-500 ml-0.5">*required</span>
                                    </Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            className={cn('justify-start bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors',
                                                attendanceStatus === 'attended' && 'bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-100')}
                                            onClick={() => setAttendanceStatus('attended')}
                                        >
                                            ✅ Attended
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className={cn('justify-start bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors',
                                                attendanceStatus === 'not_attended' && 'bg-rose-50 border-rose-500 text-rose-700 hover:bg-rose-100')}
                                            onClick={() => setAttendanceStatus('not_attended')}
                                        >
                                            ❌ No-show
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Advance button */}
                            {currentStep.advanceLabel && (
                                <Button
                                    onClick={handleAdvance}
                                    disabled={advancing}
                                    className={cn('w-full font-semibold', currentStep.advanceColor)}
                                >
                                    {advancing ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Advancing...</>
                                    ) : (
                                        currentStep.advanceLabel
                                    )}
                                </Button>
                            )}
                        </div>
                    ) : (
                        /* Done state */
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3 shadow-sm">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                            <p className="text-emerald-800 font-bold text-lg">All done! Content is live 🎉</p>
                            {project.shoot_proof_url && (
                                <a href={project.shoot_proof_url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-emerald-600 underline block font-medium hover:text-emerald-500">Raw shoot files</a>
                            )}
                            {project.edit_proof_url && (
                                <a href={project.edit_proof_url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-emerald-600 underline block font-medium hover:text-emerald-500">Edited files</a>
                            )}
                            {project.social_media_url && (
                                <a href={project.social_media_url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-sky-600 underline block mt-2 pt-2 border-t border-emerald-200 font-medium hover:text-sky-500">View on Social Media 🚀</a>
                            )}
                        </div>
                    )}

                    {/* Upcoming steps (locked) */}
                    {!isDone && currentIndex < VIDEO_STATUS_ORDER.length - 2 && (
                        <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Upcoming</p>
                            {STEPS.slice(currentIndex + 1, -1).map((step) => (
                                <div key={step.status} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 opacity-70">
                                    <span className="text-xl opacity-60 grayscale">{step.emoji}</span>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                                        <p className="text-xs text-slate-600 line-clamp-1">{step.description}</p>
                                        {step.proofField && (
                                            <p className="text-[10px] text-slate-600 mt-0.5">Requires proof link</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
