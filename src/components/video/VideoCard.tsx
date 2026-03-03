// src/components/video/VideoCard.tsx
import { VideoProject, VIDEO_STATUS_CONFIG, VideoStatus } from '@/types';
import { Calendar, MapPin, ExternalLink, AlertCircle, CheckCircle2, User, Check, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
        <Card
            onClick={onClick}
            className={cn(
                'group cursor-pointer hover:shadow-md transition-all duration-200 border',
                isCompleted
                    ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-80'
                    : 'bg-white hover:border-slate-300'
            )}
        >
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Title Row */}
                    <div className="flex items-center gap-2">
                        <h3 className="flex-1 font-medium leading-tight hover:text-blue-600 transition-colors text-slate-900 truncate" title={project.chef_name}>
                            {project.chef_name}
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                        </Button>
                    </div>

                    {/* Description (HZ ID) */}
                    {project.chef_hyperzod_id && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                            HZ-{project.chef_hyperzod_id}
                        </p>
                    )}

                    {/* Properties Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        <Badge
                            variant="outline"
                            className={cn(
                                "border text-[10px] uppercase font-bold tracking-wider px-2 py-0.5",
                                // Dark mode text colors are -300, we map them to -700 for light mode
                                cfg.color.replace('-300', '-700'),
                                // Dark mode border colors are -600, we map them to bg- -100 for light mode
                                isCompleted ? "bg-slate-50 border-slate-200 text-slate-500" : [
                                    cfg.border.replace('border-', 'bg-').replace('-600', '-50'),
                                    cfg.border.replace('-600', '-200')
                                ]
                            )}
                        >
                            {cfg.label}
                        </Badge>

                        {/* Date */}
                        <div className="flex items-center gap-1 text-xs text-slate-500 px-1 py-0.5 rounded-md hover:bg-slate-100 cursor-pointer">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(project.shoot_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>

                        {/* Location */}
                        {project.location && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 px-1 py-0.5 rounded-md hover:bg-slate-100 cursor-pointer">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{project.location}</span>
                            </div>
                        )}
                    </div>

                    {/* Tags Row */}
                    {isFromLovable && (
                        <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200">
                                onboarding
                            </Badge>
                        </div>
                    )}

                    {/* Bottom Row - Assignees, Proof states */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                            {/* Assignee Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        {activeId || activeName ? (
                                            <div className="flex -space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
                                                <Avatar className="h-6 w-6 border-2 border-white">
                                                    <AvatarFallback className="text-[10px] bg-blue-500 text-white font-medium">
                                                        {activeInitials}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 rounded-full border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50"
                                            >
                                                <User className="h-3 w-3 text-slate-400" />
                                            </Button>
                                        )}
                                    </div>
                                </PopoverTrigger>
                                {!isCompleted && onUpdate && (
                                    <PopoverContent className="w-56 p-2 bg-white border-slate-200 text-slate-900 shadow-md" align="start" onClick={(e) => e.stopPropagation()}>
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

                        {/* Proof icons */}
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            {isCompleted ? (
                                <div className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
                            ) : proofMissing ? (
                                <div className="flex items-center gap-1"><AlertCircle className="h-4 w-4 text-amber-500" /></div>
                            ) : (project.shoot_proof_url || project.edit_proof_url) ? (
                                <div className="flex items-center gap-1"><ExternalLink className="h-4 w-4 text-emerald-500" /></div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
