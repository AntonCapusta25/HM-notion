import { useState, useMemo, useCallback, useEffect } from 'react';
import { TaskCard } from '../../components/TaskCard';
import { PremiumCreateTaskDialog } from './PremiumCreateTaskDialog';
import { PremiumTaskDetailDialog } from './PremiumTaskDetailDialog';
import { WorkspaceSelector } from '../../components/WorkspaceSelector';
import { PremiumListView } from './PremiumListView';
import { EnhancedChatbot } from '../../components/EnhancedChatbot';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Calendar, AlertCircle, LayoutGrid, List, RefreshCw, MessageCircle, X, Minimize2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Task } from '../../types';

export const PremiumMyTasks = () => {
    const {
        tasks,
        users,
        workspaces,
        createTask,
        deleteTask,
        updateTask,
        addComment,
        toggleSubtask,
        refreshTasks,
        loading: tasksLoading,
        error
    } = useTaskContext();

    const { user } = useAuth();
    const { profile: userProfile } = useProfile();

    const [showCreateTask, setShowCreateTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Chatbot integration states
    const [showChatbot, setShowChatbot] = useState(false);
    const [isChatbotMinimized, setIsChatbotMinimized] = useState(false);
    const [authToken, setAuthToken] = useState<string>('');

    // Get auth token for chatbot
    useEffect(() => {
        const getAuthToken = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setAuthToken(session?.access_token || '');
        };
        getAuthToken();
    }, []);

    const toggleChatbot = () => {
        setShowChatbot(!showChatbot);
        setIsChatbotMinimized(false);
    };

    const handleManualRefresh = useCallback(async () => {
        if (!refreshTasks) return;
        setIsRefreshing(true);
        try {
            await refreshTasks();
        } catch (err) {
            console.error(err);
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshTasks]);

    const handleCreateTask = useCallback(async (taskData: any) => {
        try {
            await createTask(taskData);
            setShowCreateTask(false);
        } catch (err) {
            console.error(err);
        }
    }, [createTask]);

    const handleUpdateTask = useCallback((taskId: string, updates: any) => {
        updateTask(taskId, updates);
    }, [updateTask]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await deleteTask(taskId);
        } catch (err) {
            console.error(err);
        }
    }, [deleteTask]);

    const myTasks = useMemo(() => {
        if (!user) return [];

        // Filter tasks based ONLY on assignment data from task_assignees
        let personalTasks = tasks.filter(task => {
            let isAssignedToMe = false;
            if (task.task_assignees && Array.isArray(task.task_assignees)) {
                isAssignedToMe = task.task_assignees.some((assignment: any) => assignment.user_id === user.id);
            }
            return isAssignedToMe;
        });

        // Apply workspace filter
        if (selectedWorkspace) {
            personalTasks = personalTasks.filter(task => task.workspace_id === selectedWorkspace);
        }

        // Apply date filters
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        switch (filter) {
            case 'today':
                return personalTasks.filter(task => {
                    if (!task.due_date) return false;
                    return new Date(task.due_date).toDateString() === today.toDateString() && task.status !== 'done';
                });
            case 'week':
                return personalTasks.filter(task => {
                    if (!task.due_date) return false;
                    const dueDate = new Date(task.due_date);
                    return dueDate >= today && dueDate <= weekFromNow && task.status !== 'done';
                });
            case 'overdue':
                return personalTasks.filter(task => {
                    if (!task.due_date) return false;
                    return new Date(task.due_date) < today && task.status !== 'done';
                });
            default:
                return personalTasks;
        }
    }, [tasks, user, selectedWorkspace, filter]);

    const stats = useMemo(() => {
        const todayRaw = new Date();
        const today = new Date(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate());

        return {
            total: myTasks.length,
            overdue: myTasks.filter(t => t.due_date && new Date(t.due_date) < today && t.status !== 'done').length,
            dueToday: myTasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === today.toDateString() && t.status !== 'done').length
        };
    }, [myTasks]);

    const tasksByStatus = useMemo(() => ({
        todo: myTasks.filter(t => t.status === 'todo'),
        in_progress: myTasks.filter(t => t.status === 'in_progress'),
        done: myTasks.filter(t => t.status === 'done')
    }), [myTasks]);


    return (
        <div className="space-y-6 pt-24 md:pl-8 p-4 no-scrollbar animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">My Tasks</h1>
                    <p className="text-white/60 text-lg mt-1">
                        {stats.overdue > 0 ? `${stats.overdue} overdue items requre attention` : "You're all caught up."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-white/5 border border-white/5 rounded-xl p-1 flex">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('kanban')}
                            className={`rounded-lg ${viewMode === 'kanban' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className={`rounded-lg ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        onClick={() => setShowCreateTask(true)}
                        className="bg-white text-black hover:bg-white/90 rounded-full px-6 h-12 font-medium shadow-lg shadow-white/10 transition-all hover:scale-105"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Add Task
                    </Button>
                </div>
            </div>

            {/* Stats Cards (Premium) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Calendar className="h-32 w-32 text-white" /></div>
                    <p className="text-white/60 font-medium">Total Tasks</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{stats.total}</h3>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle2 className="h-32 w-32 text-yellow-500" /></div>
                    <p className="text-white/60 font-medium">Due Today</p>
                    <h3 className={`text-3xl font-bold mt-2 ${stats.dueToday > 0 ? 'text-yellow-400' : 'text-white'}`}>{stats.dueToday}</h3>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><AlertCircle className="h-32 w-32 text-red-500" /></div>
                    <p className="text-white/60 font-medium">Overdue</p>
                    <h3 className={`text-3xl font-bold mt-2 ${stats.overdue > 0 ? 'text-red-400' : 'text-white'}`}>{stats.overdue}</h3>
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
                <div className="flex gap-1 bg-black/40 p-1.5 rounded-xl border border-white/10">
                    {['all', 'today', 'week', 'overdue'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${filter === f ? 'bg-white text-black shadow-lg shadow-white/10 scale-105' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Content Area - Wider */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className={`rounded-lg px-3 ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                <List className="h-4 w-4 mr-2" /> List
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode('kanban')}
                                className={`rounded-lg px-3 ${viewMode === 'kanban' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                <LayoutGrid className="h-4 w-4 mr-2" /> Board
                            </Button>
                        </div>
                    </div>

                    {viewMode === 'list' ? (
                        <div className="rounded-2xl overflow-hidden border border-white/5 bg-black/20 backdrop-blur-sm min-h-[500px] p-6">
                            <PremiumListView
                                tasks={myTasks}
                                users={users}
                                onCreateTask={handleCreateTask}
                                onUpdateTask={handleUpdateTask}
                                onDeleteTask={handleDeleteTask}
                                onAssignTask={(taskId, userIds) => updateTask(taskId, { assignees: userIds })}
                                onTaskClick={(task) => setSelectedTask(task)}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {['todo', 'in_progress', 'done'].map((status) => (
                                <div key={status} className="space-y-4 bg-white/5 rounded-3xl p-4 border border-white/5 backdrop-blur-sm">
                                    <div className="flex items-center justify-between px-2 mb-2">
                                        <h3 className="font-semibold text-white uppercase tracking-wider text-xs">{status.replace('_', ' ')}</h3>
                                        <Badge variant="outline" className="text-white/40 border-white/10">{tasksByStatus[status as keyof typeof tasksByStatus].length}</Badge>
                                    </div>
                                    <div className="space-y-3 min-h-[200px]">
                                        {tasksByStatus[status as keyof typeof tasksByStatus].map(task => (
                                            <div key={task.id} onClick={() => setSelectedTask(task)}>
                                                <TaskCard task={task} onClick={() => setSelectedTask(task)} variant="premium" />
                                            </div>
                                        ))}
                                        {tasksByStatus[status as keyof typeof tasksByStatus].length === 0 && (
                                            <div className="flex items-center justify-center h-20 border-2 border-dashed border-white/5 rounded-xl text-white/20 text-sm">
                                                Empty
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Side Panel (Focus Mode) */}
                <div className="space-y-6">
                    <div className="rounded-3xl bg-gradient-to-b from-blue-600/20 to-purple-600/20 border border-white/10 p-6 backdrop-blur-xl h-full">
                        <h3 className="text-xl font-semibold text-white mb-4">Focus Mode</h3>
                        <div className="flex items-center justify-center p-8">
                            <div className="w-32 h-32 rounded-full border-4 border-white/20 flex items-center justify-center">
                                <span className="text-4xl font-bold text-white">{stats.dueToday}</span>
                            </div>
                        </div>
                        <p className="text-center text-white/60 text-sm">Tasks due today</p>
                    </div>
                </div>
            </div>

            {/* Chatbot (Premium) */}
            <div className="fixed bottom-6 right-6 z-50">
                {!showChatbot ? (
                    <Button onClick={toggleChatbot} size="icon" className="h-14 w-14 rounded-full bg-white text-black hover:bg-white/90 shadow-2xl hover:scale-105 transition-all">
                        <MessageCircle className="h-6 w-6" />
                    </Button>
                ) : (
                    <div className="relative bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl h-[500px] w-[350px] overflow-hidden">
                        <div className="absolute top-2 right-2 z-10 flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setShowChatbot(false)} className="h-8 w-8 text-white/60 hover:text-white">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        {authToken && userProfile && <EnhancedChatbot userAuthToken={authToken} userId={userProfile.id} />}
                    </div>
                )}
            </div>

            <PremiumCreateTaskDialog
                open={showCreateTask}
                onOpenChange={setShowCreateTask}
                onCreateTask={handleCreateTask}
            />

            <PremiumTaskDetailDialog
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
