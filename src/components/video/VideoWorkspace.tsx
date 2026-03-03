// src/components/video/VideoWorkspace.tsx
// Main Video Pipeline workspace — cinematic Kanban with stats bar

import { useState } from 'react';
import { useVideoProjects } from '@/hooks/useVideoProjects';
import { VideoCard } from './VideoCard';
import { VideoProjectDialog } from './VideoProjectDialog';
import { AddShootDialog } from './AddShootDialog';
import { VideoProject, VIDEO_STATUS_CONFIG, VIDEO_STATUS_ORDER } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Film, TrendingUp, Camera, Scissors, Megaphone, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoWorkspaceProps {
    workspaceName?: string;
}

// Stat card for the top bar
const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
            <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
            <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{label}</p>
        </div>
    </div>
);

export const VideoWorkspace = ({ workspaceName = 'Video Pipeline' }: VideoWorkspaceProps) => {
    const { projects, byStatus, stats, loading, error, createProject, updateProject, deleteProject, advanceStatus, fetchProjects } = useVideoProjects();
    const [selectedProject, setSelectedProject] = useState<VideoProject | null>(null);
    const [showAddShoot, setShowAddShoot] = useState(false);
    const [addingToStatus, setAddingToStatus] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchProjects();
        setIsRefreshing(false);
    };

    const handleAdvance = async (project: VideoProject, proofUrl?: string, attendanceStatus?: 'pending' | 'attended' | 'not_attended') => {
        return await advanceStatus(project, proofUrl, attendanceStatus);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Film className="h-12 w-12 text-violet-500 mx-auto animate-pulse" />
                    <p className="text-slate-500 text-sm">Loading pipeline...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <p className="text-red-500">Error: {error}</p>
                    <Button onClick={handleRefresh} variant="outline" size="sm" className="text-slate-600 border-slate-300">
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900" style={{
            backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(139,92,246,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(14,165,233,0.03) 0%, transparent 60%)',
        }}>
            {/* ── Page Header ──────────────────────────────────────── */}
            <div className="border-b border-slate-200 bg-white px-6 py-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center border border-violet-200">
                            <Film className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">{workspaceName}</h1>
                            <p className="text-xs text-slate-500 mt-0.5">Chef shoots · video production pipeline</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
                        >
                            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                        </Button>
                        <Button
                            onClick={() => setShowAddShoot(true)}
                            className="bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-sm"
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Schedule Shoot
                        </Button>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard icon={Film} label="Total Shoots" value={stats.total} color="bg-slate-800" />
                    <StatCard icon={Camera} label="Scheduled" value={stats.scheduled} color="bg-slate-500" />
                    <StatCard icon={Camera} label="Shoot Done" value={stats.shoot_done} color="bg-amber-500" />
                    <StatCard icon={Scissors} label="Editing" value={stats.editing} color="bg-violet-500" />
                    <StatCard icon={Megaphone} label="Publishing" value={stats.publish} color="bg-sky-500" />
                    <StatCard icon={CheckCircle2} label="Published" value={stats.done} color="bg-emerald-500" />
                </div>

                {/* Global progress bar */}
                {stats.total > 0 && (
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span className="font-medium">Overall progress</span>
                            <span className="text-emerald-600 font-bold">{completionRate}% published</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                                className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all duration-700"
                                style={{ width: `${completionRate}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Kanban Board ─────────────────────────────────────── */}
            <div className="flex gap-4 p-6 overflow-x-auto min-h-[calc(100vh-240px)]">
                {VIDEO_STATUS_ORDER.map((status, colIndex) => {
                    const cfg = VIDEO_STATUS_CONFIG[status];

                    // A project belongs in this column if its current status index is >= this column's index.
                    const columnProjects = projects.filter(p => {
                        const pIndex = VIDEO_STATUS_ORDER.indexOf(p.status);
                        return pIndex >= colIndex;
                    });

                    return (
                        <div
                            key={status}
                            className="flex flex-col gap-3 min-w-[260px] w-[260px] shrink-0"
                        >
                            {/* Column header */}
                            <div className={cn(
                                'flex items-center justify-between px-3 py-2.5 rounded-xl border',
                                'bg-white shadow-sm',
                                cfg.border,
                            )}>
                                <div className="flex items-center gap-2">
                                    <span className="text-base leading-none">{cfg.icon}</span>
                                    <span className={cn('text-xs font-semibold uppercase tracking-wider', cfg.color)}>
                                        {cfg.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={cn(
                                        'text-xs font-bold px-2 py-0.5 rounded-full',
                                        cfg.bg, cfg.color, 'border', cfg.border,
                                    )}>
                                        {columnProjects.length}
                                    </span>
                                    <button
                                        onClick={() => { setAddingToStatus(status); setShowAddShoot(true); }}
                                        className={cn(
                                            'w-6 h-6 rounded-md flex items-center justify-center',
                                            'text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors',
                                        )}
                                        title={`Add to ${cfg.label}`}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="flex flex-col gap-2.5 flex-1">
                                {columnProjects.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                                        <span className="text-2xl mb-2">{cfg.icon}</span>
                                        <p className="text-xs text-slate-500 font-medium">No shoots here yet</p>
                                    </div>
                                ) : (
                                    columnProjects.map((project) => {
                                        const pIndex = VIDEO_STATUS_ORDER.indexOf(project.status);
                                        const isCompleted = pIndex > colIndex;

                                        return (
                                            <VideoCard
                                                key={project.id}
                                                project={project}
                                                isCompleted={isCompleted}
                                                currentColumnStatus={status}
                                                onClick={() => setSelectedProject(project)}
                                                onUpdate={updateProject}
                                            />
                                        );
                                    })
                                )}
                            </div>

                            {/* Add button at bottom of column */}
                            {status === 'scheduled' && (
                                <button
                                    onClick={() => setShowAddShoot(true)}
                                    className={cn(
                                        'flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm font-medium',
                                        'bg-white border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 transition-colors',
                                    )}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add shoot
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Empty state ───────────────────────────────────────── */}
            {stats.total === 0 && !loading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center space-y-4 pointer-events-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center mx-auto">
                            <Film className="h-8 w-8 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">No shoots scheduled yet</h2>
                            <p className="text-slate-500 text-sm mt-1">
                                Shoots are added automatically from the onboarding platform,<br />or you can add one manually.
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowAddShoot(true)}
                            className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm mt-2"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Schedule First Shoot
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Dialogs ───────────────────────────────────────────── */}
            <VideoProjectDialog
                project={selectedProject}
                open={!!selectedProject}
                onOpenChange={(open) => !open && setSelectedProject(null)}
                onUpdate={updateProject}
                onAdvance={handleAdvance}
                onDelete={deleteProject}
            />

            <AddShootDialog
                open={showAddShoot}
                onOpenChange={(open) => { setShowAddShoot(open); if (!open) setAddingToStatus(null); }}
                onCreateProject={createProject}
            />
        </div>
    );
};
