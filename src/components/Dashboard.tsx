import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Calendar, BarChart3, Grid3X3, List, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaskCard } from './TaskCard';
import { InternalChatbot } from './InternalChatbot';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';
import { ListView } from './ListView';
import { TaskFilters, TaskFiltersState } from './TaskFilters';
import { useTaskContext } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { Task } from '../types';

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

export const Dashboard = () => {
  const { user } = useAuth();
  const { profile: userProfile, loading: profileLoading, error: profileError } = useProfile();
  const { 
    tasks, 
    users, 
    createTask, 
    updateTask, 
    deleteTask, 
    addComment, 
    toggleSubtask, 
    loading: tasksLoading, 
    error,
    refreshTasks // Add this from the enhanced useTaskStore
  } = useTaskContext();

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'my' | 'team'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [taskFilters, setTaskFilters] = useState<TaskFiltersState>({
    status: [],
    priority: [],
    assignee: [],
    tags: [],
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Track task changes for logging
  useEffect(() => {
    console.log('📊 Dashboard - Task count changed:', tasks.length);
    console.log('📊 Dashboard - Current tasks:', tasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
  }, [tasks]);

  // Enhanced dashboard stats refresh
  const refreshDashboardStats = useCallback(async () => {
    if (!userProfile?.id) {
      console.log('📊 No userProfile.id available for dashboard stats');
      return;
    }
    
    try {
      console.log('📊 Refreshing dashboard stats for user:', userProfile.id);
      
      const { data, error } = await supabase
        .rpc('get_dashboard_stats', { user_uuid: userProfile.id });
      
      if (error) {
        console.error('📊 Dashboard stats error:', error);
        setDashboardStats(null);
      } else {
        console.log('📊 Dashboard stats updated:', data);
        setDashboardStats(data);
      }
    } catch (err) {
      console.error('📊 Failed to refresh dashboard stats:', err);
      setDashboardStats(null);
    }
  }, [userProfile?.id]);

  // Manual refresh function that forces both tasks and stats refresh
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    console.log('🔄 Manual refresh triggered');
    
    try {
      // Force refresh tasks using the exposed refreshTasks method
      if (refreshTasks) {
        console.log('🔄 Refreshing tasks via refreshTasks method...');
        await refreshTasks();
      }
      
      // Refresh dashboard stats
      console.log('🔄 Refreshing dashboard stats...');
      await refreshDashboardStats();
      
      console.log('✅ Manual refresh completed');
    } catch (err) {
      console.error('❌ Manual refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshDashboardStats, refreshTasks]);

  // Auto-refresh stats when tasks change (but not on every task change to avoid spam)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshDashboardStats();
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [tasks.length, refreshDashboardStats]);

  // Initial dashboard stats fetch
  useEffect(() => {
    const fetchInitialStats = async () => {
      if (!userProfile?.id) {
        console.log('📊 No userProfile.id available for initial dashboard stats');
        setStatsLoading(false);
        return;
      }
      
      try {
        setStatsLoading(true);
        console.log('📊 Initial dashboard stats fetch for user:', userProfile.id);
        
        const { data, error } = await supabase
          .rpc('get_dashboard_stats', { user_uuid: userProfile.id });
        
        console.log('📊 Initial dashboard stats response:', { data, error });
        
        if (error) {
          console.error('📊 Initial dashboard stats error:', error);
          setDashboardStats(null);
        } else {
          setDashboardStats(data);
        }
      } catch (err) {
        console.error('📊 Failed to fetch initial dashboard stats:', err);
        setDashboardStats(null);
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchInitialStats();
  }, [userProfile?.id]);

  // Enhanced task operations with forced refresh
  const handleCreateTask = useCallback(async (taskData: any) => {
    try {
      console.log('📝 Dashboard - Creating task:', taskData.title);
      await createTask(taskData);
      setShowCreateTask(false); // Close dialog on success
      console.log('✅ Dashboard - Task creation completed');
      
      // The enhanced useTaskStore now automatically refreshes after task creation
      // But we can also refresh stats here
      setTimeout(() => {
        refreshDashboardStats();
      }, 500);
      
    } catch (err) {
      console.error('❌ Dashboard - Failed to create task:', err);
      // Don't close dialog on error so user can retry
      throw err; // Re-throw to let the dialog handle the error
    }
  }, [createTask, refreshDashboardStats]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: any) => {
    try {
      console.log('📝 Dashboard - Updating task:', taskId, updates);
      await updateTask(taskId, updates);
      console.log('✅ Dashboard - Task update completed');
      
      // The enhanced useTaskStore now automatically refreshes after task update
      setTimeout(() => {
        refreshDashboardStats();
      }, 300);
      
    } catch (err) {
      console.error('❌ Dashboard - Failed to update task:', err);
      throw err;
    }
  }, [updateTask, refreshDashboardStats]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
  const confirmed = window.confirm('Are you sure you want to delete this task?');
  if (!confirmed) return;
  
  try {
    console.log('🗑️ Dashboard - Deleting task:', taskId);
    await deleteTask(taskId);
    console.log('✅ Dashboard - Task deletion completed');
    
    // The enhanced useTaskStore now automatically refreshes after task deletion
    setTimeout(() => {
      refreshDashboardStats();
    }, 300);
    
  } catch (err) {
    console.error('❌ Dashboard - Failed to delete task:', err);
    throw err;
  }
}, [deleteTask, refreshDashboardStats]);
  
  const handleAddComment = useCallback(async (taskId: string, content: string) => {
    try {
      console.log('💬 Dashboard - Adding comment to task:', taskId);
      await addComment(taskId, content);
      console.log('✅ Dashboard - Comment added successfully');
    } catch (err) {
      console.error('❌ Dashboard - Failed to add comment:', err);
      throw err;
    }
  }, [addComment]);

  const handleToggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      console.log('☑️ Dashboard - Toggling subtask:', subtaskId);
      await toggleSubtask(taskId, subtaskId);
      console.log('✅ Dashboard - Subtask toggled successfully');
    } catch (err) {
      console.error('❌ Dashboard - Failed to toggle subtask:', err);
      throw err;
    }
  }, [toggleSubtask]);

  // Enhanced filtering with better performance
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    if (filter === 'my' && userProfile) {
      result = result.filter(t => 
        (t.assignees && t.assignees.includes(userProfile.id)) || t.created_by === userProfile.id
      );
    }

    if (taskFilters.status.length > 0) {
      result = result.filter(t => taskFilters.status.includes(t.status));
    }
    if (taskFilters.priority.length > 0) {
      result = result.filter(t => taskFilters.priority.includes(t.priority));
    }
    if (taskFilters.assignee.length > 0) {
      result = result.filter(t => 
        t.assignees && t.assignees.some(assigneeId => taskFilters.assignee.includes(assigneeId))
      );
    }
    if (taskFilters.tags.length > 0) {
      result = result.filter(t => 
        t.tags && t.tags.some(tag => taskFilters.tags.includes(tag))
      );
    }

    return result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      try {
        switch (taskFilters.sortBy) {
          case 'due_date':
            const parseDate = (dateStr?: string | null) => {
              if (!dateStr) return new Date('9999-12-31').getTime();
              try {
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? new Date('9999-12-31').getTime() : date.getTime();
              } catch {
                return new Date('9999-12-31').getTime();
              }
            };
            
            aValue = parseDate(a.due_date);
            bValue = parseDate(b.due_date);
            break;
            
          case 'priority':
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
            bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
            break;
            
          case 'title':
            aValue = (a.title || '').toLowerCase();
            bValue = (b.title || '').toLowerCase();
            break;
            
          default: // created_at
            const parseCreatedDate = (dateStr: string) => {
              try {
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? 0 : date.getTime();
              } catch {
                return 0;
              }
            };
            
            aValue = parseCreatedDate(a.created_at);
            bValue = parseCreatedDate(b.created_at);
        }
        
        if (taskFilters.sortOrder === 'desc') {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
        
      } catch (error) {
        console.warn('⚠️ Error in task sorting:', error);
        return 0;
      }
    });
  }, [tasks, filter, taskFilters, userProfile]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(task => {
      if (task.tags) {
        task.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [tasks]);

  const tasksByStatus = useMemo(() => ({
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done')
  }), [filteredTasks]);

  if (profileLoading || tasksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertDescription>
          Error loading profile: {profileError}
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertDescription>
          Error loading dashboard: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!userProfile && user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Good morning, {user.email}!
            </h1>
            <p className="text-gray-600 mt-1">
              Profile data is loading...
            </p>
          </div>
          <Button onClick={() => setShowCreateTask(true)} className="bg-homemade-orange hover:bg-homemade-orange-dark">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
        
        <Alert className="m-6">
          <AlertDescription>
            Profile data is still loading. Some features may be limited.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!userProfile && !user) {
    return (
      <Alert className="m-6">
        <AlertDescription>
          Unable to load user information. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate stats - use dashboard stats if available, otherwise calculate from tasks
  const stats = dashboardStats ? {
    total: dashboardStats.total_tasks,
    inProgress: dashboardStats.in_progress_tasks,
    completed: dashboardStats.done_tasks,
    overdue: dashboardStats.overdue_tasks,
    dueToday: dashboardStats.due_today,
    myTasks: dashboardStats.my_tasks
  } : {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      try {
        const dueDate = new Date(t.due_date);
        const today = new Date();
        return !isNaN(dueDate.getTime()) && dueDate < today;
      } catch {
        return false;
      }
    }).length,
    dueToday: tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      try {
        const dueDate = new Date(t.due_date);
        const today = new Date();
        return !isNaN(dueDate.getTime()) && dueDate.toDateString() === today.toDateString();
      } catch {
        return false;
      }
    }).length,
    myTasks: userProfile ? tasks.filter(t => (t.assignees && t.assignees.includes(userProfile.id)) || t.created_by === userProfile.id).length : 0
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Good morning, {userProfile?.name || user?.email || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            You have {stats.inProgress} tasks in progress and {stats.overdue} overdue items
            {filter === 'my' && ` • Viewing your ${stats.myTasks} personal tasks`}
            {filter === 'all' && ` • Viewing all ${stats.total} team tasks`}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={() => setShowCreateTask(true)} className="bg-homemade-orange hover:bg-homemade-orange-dark">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {filter === 'my' ? 'My Tasks' : 'Total Tasks'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {filter === 'my' ? stats.myTasks : stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
            >
              All Tasks ({stats.total})
            </Button>
            <Button 
              variant={filter === 'my' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('my')}
              className={filter === 'my' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
            >
              My Tasks ({stats.myTasks})
            </Button>
            <Button 
              variant={filter === 'team' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('team')}
              className={filter === 'team' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
            >
              Team View ({stats.total})
            </Button>
          </div>
          <TaskFilters
            filters={taskFilters}
            onFiltersChange={setTaskFilters}
            users={users}
            availableTags={availableTags}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'cards' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('cards')}
            className={viewMode === 'cards' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            Cards
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>
      </div>

      {viewMode === 'cards' ? (
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
            </CardContent>
          </Card>
        </div>
      ) : (
        <ListView
          tasks={filteredTasks}
          users={users}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      <CreateTaskDialog 
        open={showCreateTask} 
        onOpenChange={setShowCreateTask}
        onCreateTask={handleCreateTask}
      />

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
            {/* Chatbot Section */}
        <aside className="lg:col-span-1">
           {/* 2. Place the chatbot component here */}
          <InternalChatbot />
        </aside>
  );
};
