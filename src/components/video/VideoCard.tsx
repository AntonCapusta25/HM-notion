// src/components/video/VideoCard.tsx
import { VideoProject, VIDEO_STATUS_CONFIG, VideoStatus } from '@/types';
import { Calendar, MapPin, ExternalLink, AlertCircle, CheckCircle2, User, Check } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useUsersQuery } from '@/hooks/queries/useTasksQuery';
import { cn } from '@/lib/utils';

interface VideoCardProps {
    project: VideoProject;
    isCompleted?: boolean;
    currentColumnStatus?: VideoStatus;
    onClick: () => void;
    onUpdate?: (id: string, updates: Partial<VideoProject>) => Promise<void>;
}

export const VideoCard = ({ project, isCompleted, currentColumnStatus, onClick, onUpdate }: VideoCardProps) => {
    const { data: users = [] } = useUsersQuery();

    // If it's a completed footprint, use the specific column's config to know what it was,
    // otherwise use the project's current status config for the active card.
    const cfg = VIDEO_STATUS_CONFIG[currentColumnStatus || project.status];
    const isFromLovable = project.triggered_from === 'lovable';

    // Proof state
    const needsShootProof = project.status === 'scheduled' && !project.shoot_proof_url;
    const needsEditProof = project.status === 'shoot_done' && !project.edit_proof_url;
    const proofMissing = needsShootProof || needsEditProof;

    // Determine assignee context based on the card's visual column
    const viewStatus = currentColumnStatus || project.status;
    let activeId = project.assigned_shooter_id;
    let activeName = project.assigned_shooter_name;
    let roleName = 'Videographer';
    let idField = 'assigned_shooter_id';
    let nameField = 'assigned_shooter_name';

    if (viewStatus === 'shoot_done' || viewStatus === 'editing') {
        activeId = project.assigned_editor_id;
        activeName = project.assigned_editor_name;
        roleName = 'Editor';
        idField = 'assigned_editor_id';
        nameField = 'assigned_editor_name';
    } else if (viewStatus === 'publish') {
        activeId = project.assigned_publisher_id;
        activeName = project.assigned_publisher_name;
        roleName = 'Publisher';
        idField = 'assigned_publisher_id';
        nameField = 'assigned_publisher_name';
    }

    const activeInitials = activeName ? activeName.charAt(0).toUpperCase() : '?';

    return (
        <div
            onClick={onClick}
            className={cn(
                'group relative bg-white rounded-xl border cursor-pointer transition-all duration-200',
                isCompleted
                    ? 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 opacity-80'
                    : cn('border-slate-200 hover:border-slate-300 hover:shadow-md'),
                'p-4 space-y-3'
            )}
        >
            {/* Top accent bar */}
            <div className={cn(
                'absolute top-0 left-0 right-0 h-0.5 rounded-t-xl',
                isCompleted ? 'bg-emerald-600/50' : cfg.border.replace('border-', 'bg-')
            )} />

            {/* Header */}
            <div className="flex items-start justify-between gap-2 mt-1">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-slate-900 truncate leading-snug">
                        {project.chef_name}
                    </h3>
                    {project.chef_hyperzod_id && (
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                            HZ-{project.chef_hyperzod_id}
                        </span>
                    )}
                </div>
                {/* Source badge */}
                {isFromLovable && (
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                        onboarding
                    </span>
                )}
            </div>

            {/* Date & Location */}
            <div className="space-y-1">
                <div className={cn("flex items-center gap-1.5 text-xs text-slate-600", isCompleted && "text-slate-400")}>
                    <Calendar className={cn("h-3 w-3 shrink-0 text-slate-400")} />
                    <span>{new Date(project.shoot_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                {project.location && (
                    <div className={cn("flex items-center gap-1.5 text-xs text-slate-500", isCompleted && "text-slate-400")}>
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{project.location}</span>
                    </div>
                )}
            </div>

            {/* Footer: proof state + assignee */}
            <div className={cn("flex items-center justify-between pt-3 border-t", "border-slate-100")}>
                {/* Proof pill */}
                {isCompleted ? (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Done</span>
                    </div>
                ) : proofMissing ? (
                    <div className="flex items-center gap-1 text-[10px] text-amber-400">
                        <AlertCircle className="h-3 w-3" />
                        <span>Proof needed</span>
                    </div>
                ) : (project.shoot_proof_url || project.edit_proof_url) ? (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <ExternalLink className="h-3 w-3" />
                        <span>Proof linked</span>
                    </div>
                ) : (
                    <span />
                )}

                {/* Assignee Popover */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Popover>
                        <PopoverTrigger asChild>
                            {activeId || activeName ? (
                                <div className={cn(
                                    "flex items-center gap-1.5 cursor-pointer transition-opacity text-xs font-medium",
                                    !isCompleted && "hover:opacity-80",
                                    "px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700"
                                )}>
                                    <Avatar className="h-4 w-4">
                                        <AvatarFallback className="text-[9px] bg-slate-200 text-slate-600 font-bold">
                                            {activeInitials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span>{activeName?.split(' ')[0] || "User"}</span>
                                </div>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 rounded-full border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50"
                                >
                                    <User className="h-3 w-3 text-slate-400" />
                                </Button>
                            )}
                        </PopoverTrigger>
                        {!isCompleted && onUpdate && (
                            <PopoverContent className="w-56 p-2 bg-white border-slate-200 text-slate-900 shadow-md" align="end" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 px-2 py-1">
                                        Assign {roleName}:
                                    </div>
                                    <div className="max-h-60 overflow-y-auto pr-1">
                                        {users.map(u => {
                                            const isAssigned = activeId === u.id;
                                            return (
                                                <Button
                                                    key={u.id}
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn(
                                                        "w-full justify-start text-xs",
                                                        isAssigned && "bg-slate-100 text-slate-900 font-semibold hover:bg-slate-200",
                                                        !isAssigned && "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUpdate(project.id, {
                                                            [idField]: u.id,
                                                            [nameField]: u.name,
                                                        });
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700 font-bold">
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="flex-1 text-left">{u.name}</span>
                                                        {isAssigned && <Check className="h-3 w-3 text-violet-600" />}
                                                    </div>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </PopoverContent>
                        )}
                    </Popover>
                </div>
            </div>
        </div>
    );
};
