import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, BarChart3, TrendingUp, Users, ArrowUpRight, CheckCircle2, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { Task } from '../../types';
import { PremiumCreateTaskDialog } from './PremiumCreateTaskDialog';
import { PremiumTaskDetailDialog } from './PremiumTaskDetailDialog';
import { PremiumListView } from './PremiumListView';
import { TaskCard } from '../../components/TaskCard';
import { supabase } from '../../lib/supabase';

// Premium Stat Card Component
const StatCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
    <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 p-6 backdrop-blur-md group hover:bg-white/10 transition-all duration-500">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon className="h-24 w-24 text-white" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-white/10 text-white">
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-white/60">{title}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-4">
                <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                {trend && (
                    <span className="text-xs font-medium text-green-400 flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" /> {trend}
                    </span>
                )}
            </div>
            <p className="text-xs text-white/40 mt-1">{subtext}</p>
        </div>
    </div>
);

interface DashboardStats {
    total_tasks: number;
    todo_tasks: number;
    in_progress_tasks: number;
    done_tasks: number;
    overdue_tasks: number;
    due_today: number;
    high_priority: number;
    my_tasks: number;
    my_created_tasks: number;
}

export const PremiumDashboard = () => {
    const { user } = useAuth();
    const { profile } = useProfile();
    const { tasks, users, createTask, updateTask, deleteTask, addComment, toggleSubtask, page, totalTasks, TASKS_PER_PAGE, setPage } = useTaskContext();
    const navigate = useNavigate();
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [isExpanded, setIsExpanded] = useState(false);

    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Enhanced dashboard stats refresh
    const refreshDashboardStats = useCallback(async () => {
        if (!profile?.id) return;

        try {
            const { data, error } = await supabase
                .rpc('get_dashboard_stats', { user_uuid: profile.id });

            if (error) {
                console.error('📊 Dashboard stats error:', error);
                setDashboardStats(null);
            } else {
                setDashboardStats(data);
            }
        } catch (err) {
            console.error('📊 Failed to refresh dashboard stats:', err);
            setDashboardStats(null);
        }
    }, [profile?.id]);

    // Initial Stats Fetch
    useEffect(() => {
        const fetchInitialStats = async () => {
            if (!profile?.id) {
                setStatsLoading(false);
                return;
            }
            try {
                setStatsLoading(true);
                const { data, error } = await supabase
                    .rpc('get_dashboard_stats', { user_uuid: profile.id });

                if (!error) {
                    setDashboardStats(data);
                }
            } catch (err) {
                console.error('Failed to fetch stats:', err);
            } finally {
                setStatsLoading(false);
            }
        };
        fetchInitialStats();
    }, [profile?.id]);

    // Refresh stats when tasks change
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            refreshDashboardStats();
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [tasks.length, refreshDashboardStats]);

    // Simplified stats for premium view - prioritize RPC data
    const stats = useMemo(() => {
        if (dashboardStats) {
            return {
                total: dashboardStats.total_tasks,
                inProgress: dashboardStats.in_progress_tasks,
                done: dashboardStats.done_tasks,
                highPriority: dashboardStats.high_priority,
                myTasks: dashboardStats.my_tasks
            };
        }
        // Fallback to client-side calc
        return {
            total: tasks.length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            done: tasks.filter(t => t.status === 'done').length,
            highPriority: tasks.filter(t => t.priority === 'high').length,
            myTasks: profile ? tasks.filter(t => (t.assignees && t.assignees.includes(profile.id)) || t.created_by === profile.id).length : 0
        };
    }, [tasks, dashboardStats, profile]);

    return (
        <div className="space-y-8 p-4 pt-24 md:pl-8 no-scrollbar animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                        Dashboard
                    </h1>
                    <p className="text-white/60 text-lg">
                        Welcome back, {profile?.name || user?.email?.split('@')[0]}. Here's your overview.
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateTask(true)}
                    className="bg-white text-black hover:bg-white/90 rounded-full px-6 h-12 font-medium shadow-lg shadow-white/10 transition-all hover:scale-105"
                >
                    <Plus className="h-5 w-5 mr-2" /> New Task
                </Button>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Tasks"
                    value={stats.total}
                    subtext="Across all workspaces"
                    icon={BarChart3}
                />
                <StatCard
                    title="In Progress"
                    value={stats.inProgress}
                    subtext="Active assignments"
                    icon={TrendingUp}
                />
                <StatCard
                    title="Completed"
                    value={stats.done}
                    subtext="Tasks finished this month"
                    icon={CheckCircle2}
                />
                <StatCard
                    title="Team Members"
                    value={users.length}
                    subtext="Active contributors"
                    icon={Users}
                />
            </div>

            {/* Recent Activity / Content Area (Glass Panels) */}
            {/* Main Content Area - Full Width */}
            <div className="lg:col-span-4 space-y-6">
                {/* Filters Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl">
                    <div className="flex gap-1 bg-black/40 p-1.5 rounded-xl border border-white/10">
                        {['list', 'kanban'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${viewMode === mode ? 'bg-white text-black shadow-lg shadow-white/10 scale-105' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                                {mode === 'list' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="min-h-[500px] mb-8">
                    {viewMode === 'list' ? (
                        <div className="rounded-2xl overflow-hidden border border-white/5 bg-black/20 backdrop-blur-sm min-h-[500px]">
                            <PremiumListView
                                tasks={tasks}
                                users={users}
                                onCreateTask={createTask}
                                onUpdateTask={updateTask}
                                onDeleteTask={deleteTask}
                                onAssignTask={(taskId, userIds) => updateTask(taskId, { assignees: userIds })}
                                onTaskClick={(task) => setSelectedTask(task)}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {['todo', 'in_progress', 'done'].map((status) => {
                                const statusTasks = tasks.filter(t => t.status === status);
                                return (
                                    <div key={status} className="space-y-4 bg-white/5 rounded-3xl p-4 border border-white/5 backdrop-blur-sm">
                                        <div className="flex items-center justify-between px-2 mb-2">
                                            <h3 className="font-semibold text-white uppercase tracking-wider text-xs">{status.replace('_', ' ')}</h3>
                                            <Badge variant="outline" className="text-white/40 border-white/10">{statusTasks.length}</Badge>
                                        </div>
                                        <div className="space-y-3 min-h-[200px]">
                                            {statusTasks.map(task => (
                                                <div key={task.id} onClick={() => setSelectedTask(task)}>
                                                    <TaskCard task={task} onClick={() => setSelectedTask(task)} variant="premium" />
                                                </div>
                                            ))}
                                            {statusTasks.length === 0 && (
                                                <div className="flex items-center justify-center h-20 border-2 border-dashed border-white/5 rounded-xl text-white/20 text-sm">
                                                    Empty
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalTasks > TASKS_PER_PAGE && (
                        <div className="flex justify-center mt-8 pb-8">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                                            className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>

                                    {/* Generate page numbers */}
                                    {Array.from({ length: Math.ceil(totalTasks / TASKS_PER_PAGE) }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === Math.ceil(totalTasks / TASKS_PER_PAGE) || (p >= page - 1 && p <= page + 1))
                                        .map((p, i, arr) => {
                                            // Handle ellipsis logic (simplified)
                                            const showEllipsisBefore = i > 0 && p > arr[i - 1] + 1;
                                            return (
                                                <div key={p} className="flex items-center">
                                                    {showEllipsisBefore && <PaginationEllipsis />}
                                                    <PaginationItem>
                                                        <PaginationLink
                                                            href="#"
                                                            isActive={page === p}
                                                            onClick={(e) => { e.preventDefault(); setPage(p); }}
                                                        >
                                                            {p}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                </div>
                                            );
                                        })}

                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); if (page < Math.ceil(totalTasks / TASKS_PER_PAGE)) setPage(page + 1); }}
                                            className={page >= Math.ceil(totalTasks / TASKS_PER_PAGE) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            </div>

            <PremiumCreateTaskDialog
                open={showCreateTask}
                onOpenChange={setShowCreateTask}
                onCreateTask={createTask}
            />

            <PremiumTaskDetailDialog
                task={selectedTask}
                users={users}
                open={!!selectedTask}
                onOpenChange={(open) => !open && setSelectedTask(null)}
                onUpdateTask={updateTask}
                onAddComment={addComment}
                onToggleSubtask={toggleSubtask}
            />
        </div>
    );
};
