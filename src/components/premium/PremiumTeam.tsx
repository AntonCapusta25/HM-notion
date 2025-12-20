import { useState, useMemo, useEffect, useCallback } from 'react';
import { TaskCard } from '../../components/TaskCard';
import { TaskDetailDialog } from '../../components/TaskDetailDialog';
import { WorkspaceSelector } from '../../components/WorkspaceSelector';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Calendar, TrendingUp, RefreshCw, BarChart3, CheckCircle2, AlertCircle } from 'lucide-react';
import { Task, User } from '../../types';

interface TeamDashboardStats {
    total_tasks: number;
    todo_tasks: number;
    in_progress_tasks: number;
    done_tasks: number;
    overdue_tasks: number;
    due_today: number;
    high_priority: number;
}

export const PremiumTeam = () => {
    const { user } = useAuth();
    const { profile: userProfile } = useProfile();

    const {
        tasks,
        users,
        workspaces,
        updateTask,
        addComment,
        toggleSubtask,
        refreshTasks,
        loading: tasksLoading,
        error
    } = useTaskContext();

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [dashboardStats, setDashboardStats] = useState<TeamDashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchTeamStats = useCallback(async () => {
        if (!userProfile?.id) {
            setStatsLoading(false);
            return;
        }

        try {
            setStatsLoading(true);
            const { data, error } = await supabase
                .rpc('get_dashboard_stats', { user_uuid: userProfile.id });

            if (data && !error) {
                setDashboardStats(data);
            } else {
                console.error('Error fetching team stats:', error);
            }
        } catch (err) {
            console.error('Failed to fetch team stats:', err);
        } finally {
            setStatsLoading(false);
        }
    }, [userProfile?.id]);

    useEffect(() => {
        fetchTeamStats();
    }, [fetchTeamStats]);

    const handleManualRefresh = useCallback(async () => {
        if (!refreshTasks) return;
        setIsRefreshing(true);
        try {
            await refreshTasks();
            await fetchTeamStats();
        } catch (err) {
            console.error(err);
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshTasks, fetchTeamStats]);

    const filteredTasks = useMemo(() => {
        let result = tasks || [];
        if (selectedWorkspace) result = result.filter(task => task.workspace_id === selectedWorkspace);
        if (selectedUser) result = result.filter(task => task.assignees && task.assignees.includes(selectedUser));
        return result;
    }, [tasks, selectedWorkspace, selectedUser]);

    const teamStats = useMemo(() => {
        if (dashboardStats) {
            return {
                totalTasks: dashboardStats.total_tasks,
                inProgress: dashboardStats.in_progress_tasks,
                completed: dashboardStats.done_tasks,
                overdue: dashboardStats.overdue_tasks
            };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return {
            totalTasks: filteredTasks.length,
            inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
            completed: filteredTasks.filter(t => t.status === 'done').length,
            overdue: filteredTasks.filter(t => {
                if (!t.due_date || t.status === 'done') return false;
                try { return new Date(t.due_date) < today; } catch { return false; }
            }).length
        };
    }, [dashboardStats, filteredTasks]);

    const userStats = useMemo(() => {
        return users.map(user => {
            const userTasks = filteredTasks.filter(t => t.assignees && t.assignees.includes(user.id));
            const completed = userTasks.filter(t => t.status === 'done').length;
            const inProgress = userTasks.filter(t => t.status === 'in_progress').length;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const overdue = userTasks.filter(t => {
                if (!t.due_date || t.status === 'done') return false;
                try { return new Date(t.due_date) < today; } catch { return false; }
            }).length;

            return {
                ...user,
                totalTasks: userTasks.length,
                completed,
                inProgress,
                overdue,
                completionRate: userTasks.length > 0 ? Math.round((completed / userTasks.length) * 100) : 0
            };
        });
    }, [users, filteredTasks]);

    const tasksByStatus = useMemo(() => ({
        todo: filteredTasks.filter(t => t.status === 'todo'),
        in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
        done: filteredTasks.filter(t => t.status === 'done')
    }), [filteredTasks]);

    const handleUpdateTask = useCallback(async (taskId: string, updates: any) => {
        updateTask(taskId, updates);
    }, [updateTask]);

    if (tasksLoading || statsLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/50"></div></div>;

    return (
        <div className="space-y-8 pt-24 md:pl-8 p-4 no-scrollbar animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">Team Overview</h1>
                    <p className="text-white/60 text-lg mt-1">Track collaboration and velocity across workspaces.</p>
                </div>
                {refreshTasks && (
                    <Button
                        onClick={handleManualRefresh}
                        variant="ghost"
                        size="icon"
                        className="text-white/60 hover:text-white hover:bg-white/10 rounded-full"
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                )}
            </div>

            {/* Glass Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><BarChart3 className="h-24 w-24 text-blue-400" /></div>
                    <p className="text-white/60 font-medium">Total Tasks</p>
                    <h3 className="text-3xl font-bold text-white mt-1">{teamStats.totalTasks}</h3>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp className="h-24 w-24 text-yellow-500" /></div>
                    <p className="text-white/60 font-medium">In Progress</p>
                    <h3 className="text-3xl font-bold text-yellow-400 mt-1">{teamStats.inProgress}</h3>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle2 className="h-24 w-24 text-green-500" /></div>
                    <p className="text-white/60 font-medium">Completed</p>
                    <h3 className="text-3xl font-bold text-green-400 mt-1">{teamStats.completed}</h3>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><AlertCircle className="h-24 w-24 text-red-500" /></div>
                    <p className="text-white/60 font-medium">Overdue</p>
                    <h3 className="text-3xl font-bold text-red-400 mt-1">{teamStats.overdue}</h3>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl">
                <div className="flex-1 min-w-[200px]">
                    <WorkspaceSelector
                        workspaces={workspaces}
                        selectedWorkspace={selectedWorkspace}
                        onWorkspaceChange={setSelectedWorkspace}
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <Select value={selectedUser || 'all'} onValueChange={(value) => setSelectedUser(value === 'all' ? null : value)}>
                        <SelectTrigger className="bg-transparent border-white/10 text-white focus:ring-offset-0 focus:ring-white/20">
                            <SelectValue placeholder="All Team Members" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Team Members</SelectItem>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Team Performance List (Glass) */}
            <div className="rounded-3xl bg-white/5 border border-white/5 p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-6">
                    <Users className="h-5 w-5 text-white" />
                    <h3 className="text-xl font-semibold text-white">Team Performance</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userStats.map(userStat => (
                        <div key={userStat.id} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                            <div className="flex items-center gap-3 mb-4">
                                <Avatar className="h-10 w-10 border-2 border-white/10">
                                    <AvatarFallback className="bg-blue-600 text-white">{userStat.name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="text-white font-medium">{userStat.name}</h4>
                                    <p className="text-xs text-white/40">{userStat.department}</p>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-white/60"><span>Tasks</span><span className="text-white">{userStat.totalTasks}</span></div>
                                <div className="flex justify-between text-white/60"><span>Active</span><span className="text-yellow-400">{userStat.inProgress}</span></div>
                                <div className="flex justify-between text-white/60"><span>Done</span><span className="text-green-400">{userStat.completed}</span></div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <div className="flex justify-between text-xs text-white/40 mb-1">
                                    <span>Efficiency</span>
                                    <span>{userStat.completionRate}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${userStat.completionRate}%` }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Task Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {['todo', 'in_progress', 'done'].map((status) => (
                    <div key={status} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="font-semibold text-white uppercase tracking-wider text-sm">{status.replace('_', ' ')}</h3>
                            <Badge variant="outline" className="text-white/60 border-white/10">{tasksByStatus[status as keyof typeof tasksByStatus].length}</Badge>
                        </div>
                        <div className="space-y-3">
                            {tasksByStatus[status as keyof typeof tasksByStatus].map(task => (
                                <div key={task.id} onClick={() => setSelectedTask(task)}>
                                    <TaskCard task={task} onClick={() => setSelectedTask(task)} variant="premium" />
                                </div>
                            ))}
                            {tasksByStatus[status as keyof typeof tasksByStatus].length === 0 && (
                                <div className="text-center py-8 text-white/20 text-sm italic">Empty</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <TaskDetailDialog
                task={selectedTask}
                users={users}
                open={!!selectedTask}
                onOpenChange={(open) => !open && setSelectedTask(null)}
                onUpdateTask={handleUpdateTask}
                onAddComment={addComment}
                onToggleSubtask={toggleSubtask}
            />
        </div>
    );
};
