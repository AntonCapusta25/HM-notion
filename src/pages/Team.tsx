import { useState, useMemo, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { WorkspaceSelector } from '../components/WorkspaceSelector';
import { useTaskContext } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { Task, User, formatTaskFromSupabase } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { PremiumTeam } from '../components/premium/PremiumTeam';

interface TeamDashboardStats {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  due_today: number;
  high_priority: number;
}

const StandardTeam = () => {
  const { user } = useAuth();
  const { profile: userProfile } = useProfile();

  // We still use context for actions, but NOT for tasks (as we need ALL tasks here)
  const {
    users,
    workspaces,
    updateTask,
    addComment,
    toggleSubtask,
    error: contextError
  } = useTaskContext();

  const [teamTasks, setTeamTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // FETCH ALL TASKS (No Pagination)
  const fetchAllTasks = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          comments(id, content, author, created_at),
          subtasks(id, title, completed, created_at),
          task_tags(tag),
          task_assignees(user_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(t => {
        const ft = formatTaskFromSupabase(t);
        ft.task_assignees = t.task_assignees || [];
        return ft;
      });

      setTeamTasks(formatted);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch team tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAllTasks();
    setIsRefreshing(false);
  }, [fetchAllTasks]);

  // Enhanced task operations
  const handleUpdateTask = useCallback(async (taskId: string, updates: any) => {
    await updateTask(taskId, updates);
    // Optimistic update local state
    setTeamTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  }, [updateTask]);

  const handleAddComment = useCallback(async (taskId: string, content: string) => {
    await addComment(taskId, content);
  }, [addComment]);

  const handleToggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    await toggleSubtask(taskId, subtaskId);
  }, [toggleSubtask]);

  const filteredTasks = useMemo(() => {
    let result = teamTasks || [];

    if (selectedWorkspace) {
      result = result.filter(task => task.workspace_id === selectedWorkspace);
    }

    if (selectedUser) {
      result = result.filter(task =>
        task.assignees && task.assignees.includes(selectedUser)
      );
    }

    return result;
  }, [teamTasks, selectedWorkspace, selectedUser]);

  // Client-side stats calculation (Accurate now because we have ALL tasks)
  const teamStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      totalTasks: filteredTasks.length,
      inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
      completed: filteredTasks.filter(t => t.status === 'done').length,
      overdue: filteredTasks.filter(t => {
        if (!t.due_date || t.status === 'done') return false;
        try {
          const dueDate = new Date(t.due_date);
          return dueDate < today;
        } catch {
          return false;
        }
      }).length
    };
  }, [filteredTasks]);

  const userStats = useMemo(() => {
    return users.map(user => {
      const userTasks = filteredTasks.filter(t =>
        t.assignees && t.assignees.includes(user.id)
      );

      const completed = userTasks.filter(t => t.status === 'done').length;
      const inProgress = userTasks.filter(t => t.status === 'in_progress').length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdue = userTasks.filter(t => {
        if (!t.due_date || t.status === 'done') return false;
        try {
          const dueDate = new Date(t.due_date);
          return dueDate < today;
        } catch {
          return false;
        }
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


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading team overview...</p>
        </div>
      </div>
    );
  }

  if (error || contextError) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertDescription>
          Error loading team data: {error || contextError}
        </AlertDescription>
      </Alert>
    );
  }

  if (!user) {
    return (
      <Alert className="m-6">
        <AlertDescription>
          Please log in to view team data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Overview</h1>
          <p className="text-gray-600 mt-1">Track team progress and collaboration</p>
        </div>

        <Button
          onClick={handleManualRefresh}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalTasks}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{teamStats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{teamStats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{teamStats.overdue}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <WorkspaceSelector
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            onWorkspaceChange={setSelectedWorkspace}
          />
        </div>
        <div className="flex-1">
          <Select value={selectedUser || 'all'} onValueChange={(value) => setSelectedUser(value === 'all' ? null : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Team Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Team Members</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs bg-blue-500 text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {user.name} {user.department && `(${user.department})`}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userStats.map(userStat => (
              <div key={userStat.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-homemade-orange text-white">
                      {userStat.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{userStat.name}</h3>
                    {userStat.department && (
                      <p className="text-sm text-gray-600">{userStat.department}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Tasks:</span>
                    <span className="font-medium">{userStat.totalTasks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>In Progress:</span>
                    <span className="font-medium text-yellow-600">{userStat.inProgress}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completed:</span>
                    <span className="font-medium text-green-600">{userStat.completed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Overdue:</span>
                    <span className="font-medium text-red-600">{userStat.overdue}</span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completion Rate:</span>
                      <span className="font-medium">{userStat.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-homemade-orange h-2 rounded-full transition-all duration-300"
                        style={{ width: `${userStat.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
                To Do
              </span>
              <Badge variant="secondary">{tasksByStatus.todo.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasksByStatus.todo.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
              />
            ))}
            {tasksByStatus.todo.length === 0 && (
              <p className="text-gray-500 text-center py-8 text-sm">No tasks in this column</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                In Progress
              </span>
              <Badge variant="secondary">{tasksByStatus.in_progress.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasksByStatus.in_progress.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
              />
            ))}
            {tasksByStatus.in_progress.length === 0 && (
              <p className="text-gray-500 text-center py-8 text-sm">No tasks in this column</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full" />
                Done
              </span>
              <Badge variant="secondary">{tasksByStatus.done.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasksByStatus.done.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
              />
            ))}
            {tasksByStatus.done.length === 0 && (
              <p className="text-gray-500 text-center py-8 text-sm">No tasks in this column</p>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskDetailDialog
        task={selectedTask}
        users={users}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onUpdateTask={handleUpdateTask}
        onAddComment={handleAddComment}
        onToggleSubtask={handleToggleSubtask}
      />
    </div>
  );
};

const Team = () => {
  const { theme } = useTheme();
  return (
    <Layout>
      {theme === 'dark' ? <PremiumTeam /> : <StandardTeam />}
    </Layout>
  );
};

export default Team;
