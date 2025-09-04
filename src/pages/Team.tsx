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
import { Task, User } from '../types';

interface TeamDashboardStats {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  due_today: number;
  high_priority: number;
}

const Team = () => {
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

  // Fetch team stats
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

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    if (!refreshTasks) return;
    
    setIsRefreshing(true);
    console.log('🔄 Team - Manual refresh triggered');
    
    try {
      await refreshTasks();
      await fetchTeamStats();
      console.log('✅ Team - Manual refresh completed');
    } catch (err) {
      console.error('❌ Team - Manual refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshTasks, fetchTeamStats]);

  // Enhanced task operations
  const handleUpdateTask = useCallback(async (taskId: string, updates: any) => {
    try {
      console.log('📝 Team - Updating task:', taskId);
      await updateTask(taskId, updates);
      console.log('✅ Team - Task update completed');
    } catch (err) {
      console.error('❌ Team - Failed to update task:', err);
      throw err;
    }
  }, [updateTask]);

  const handleAddComment = useCallback(async (taskId: string, content: string) => {
    try {
      console.log('💬 Team - Adding comment to task:', taskId);
      await addComment(taskId, content);
      console.log('✅ Team - Comment added successfully');
    } catch (err) {
      console.error('❌ Team - Failed to add comment:', err);
      throw err;
    }
  }, [addComment]);

  const handleToggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      console.log('☑️ Team - Toggling subtask:', subtaskId);
      await toggleSubtask(taskId, subtaskId);
      console.log('✅ Team - Subtask toggled successfully');
    } catch (err) {
      console.error('❌ Team - Failed to toggle subtask:', err);
      throw err;
    }
  }, [toggleSubtask]);

  // Fixed: Use correct field names for filtering
  const filteredTasks = useMemo(() => {
    let result = tasks || [];
    
    if (selectedWorkspace) {
      // Fixed: Filter by workspace_id (correct field name)
      result = result.filter(task => task.workspace_id === selectedWorkspace);
    }

    if (selectedUser) {
      // Fixed: Filter by assignees array instead of assignedTo
      result = result.filter(task => 
        task.assignees && task.assignees.includes(selectedUser)
      );
    }

    return result;
  }, [tasks, selectedWorkspace, selectedUser]);

  // Fixed: Use correct field names for stats calculation
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
        try {
          const dueDate = new Date(t.due_date);
          return dueDate < today;
        } catch {
          return false;
        }
      }).length
    };
  }, [dashboardStats, filteredTasks]);

  // Fixed: Use correct field names for user stats
  const userStats = useMemo(() => {
    return users.map(user => {
      // Fixed: Filter by assignees array
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

  // Fixed: Updated to use correct assignees field structure
  const handleAssignTask = useCallback(async (taskId: string, userId: string) => {
    try {
      console.log('👤 Team - Assigning task:', taskId, 'to user:', userId);
      
      // Get current task to preserve existing assignees
      const currentTask = tasks.find(t => t.id === taskId);
      const currentAssignees = currentTask?.assignees || [];
      
      // Add user if not already assigned
      const newAssignees = currentAssignees.includes(userId) 
        ? currentAssignees 
        : [...currentAssignees, userId];
      
      await handleUpdateTask(taskId, { assignees: newAssignees });
      console.log('✅ Team - Task assignment completed');
    } catch (err) {
      console.error('❌ Team - Failed to assign task:', err);
      throw err;
    }
  }, [tasks, handleUpdateTask]);

  if (tasksLoading || statsLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading team overview...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert variant="destructive" className="m-6">
          <AlertDescription>
            Error loading team data: {error}
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <Alert className="m-6">
          <AlertDescription>
            Please log in to view team data.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Overview</h1>
            <p className="text-gray-600 mt-1">Track team progress and collaboration</p>
          </div>
          
          {refreshTasks && (
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
          )}
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
    </Layout>
  );
};

export default Team;
