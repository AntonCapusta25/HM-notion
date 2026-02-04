// Updated Dashboard component with error toast notifications
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Calendar, BarChart3, Grid3X3, List, RefreshCw, MessageCircle, X, Minimize2, AlertCircle } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';
import { ListView } from './ListView';
import { TaskFilters, TaskFiltersState } from './TaskFilters';
import { EnhancedChatbot } from './EnhancedChatbot';
import { TaskImportExport } from './TaskImportExport';
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
    refreshTasks,
    page,
    totalTasks,
    TASKS_PER_PAGE,
    setPage
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

  // Enhanced chatbot integration states
  const [showChatbot, setShowChatbot] = useState(false);
  const [isChatbotMinimized, setIsChatbotMinimized] = useState(false);

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
      if (refreshTasks) {
        console.log('🔄 Refreshing tasks via refreshTasks method...');
        await refreshTasks();
      }

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
    }, 1000);

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
      setShowCreateTask(false);
      console.log('✅ Dashboard - Task creation completed');

    } catch (err) {
      console.error('❌ Dashboard - Failed to create task:', err);
      throw err;
    }
  }, [createTask, refreshDashboardStats]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: any) => {
    try {
      console.log('📝 Dashboard - Updating task:', taskId, updates);
      updateTask(taskId, updates);
      console.log('✅ Dashboard - Task update completed');

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
      deleteTask(taskId);
      console.log('✅ Dashboard - Task deletion completed');

    } catch (err) {
      console.error('❌ Dashboard - Failed to delete task:', err);
      throw err;
    }
  }, [deleteTask, refreshDashboardStats]);

  const handleAddComment = useCallback(async (taskId: string, content: string) => {
    try {
      console.log('💬 Dashboard - Adding comment to task:', taskId);
      addComment(taskId, content);
      console.log('✅ Dashboard - Comment added successfully');
    } catch (err) {
      console.error('❌ Dashboard - Failed to add comment:', err);
      throw err;
    }
  }, [addComment]);

  const handleToggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      console.log('☑️ Dashboard - Toggling subtask:', subtaskId);
      toggleSubtask(taskId, subtaskId);
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

  // Chatbot toggle functions
  const toggleChatbot = () => {
    setShowChatbot(!showChatbot);
    setIsChatbotMinimized(false);
  };

  const minimizeChatbot = () => {
    setIsChatbotMinimized(true);
  };

  const closeChatbot = () => {
    setShowChatbot(false);
    setIsChatbotMinimized(false);
  };

  // Get auth token for chatbot
  const getAuthToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  }, []);

  const [authToken, setAuthToken] = useState<string>('');

  useEffect(() => {
    getAuthToken().then(setAuthToken);
  }, [getAuthToken]);

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

  // Only show error alert if still loading (not for optimistic update errors during normal operation)
  if (error && tasksLoading) {
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
    <div className="space-y-6 relative">
      {/* Error Toast for Optimistic Update Failures */}
      {error && !tasksLoading && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <Alert variant="destructive" className="max-w-md shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {/* Error will auto-clear after 5s */ }}
                className="h-6 w-6 p-0 ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

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

          {/* Import/Export Button */}
          {userProfile && (
            <TaskImportExport
              tasks={filteredTasks}
              users={users}
              onCreateTask={handleCreateTask}
              currentUserId={userProfile.id}
            />
          )}

          <Button
            onClick={toggleChatbot}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            AI Assistant
          </Button>
          <Button onClick={() => setShowCreateTask(true)} className="bg-homemade-orange hover:bg-homemade-orange-dark">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Filter and View Controls */}
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

      {/* Task Views */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-full overflow-hidden">
          <Card className="min-w-0">
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

          <Card className="min-w-0">
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

          <Card className="min-w-0">
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
          onAssignTask={(taskId, userIds) => handleUpdateTask(taskId, { assignees: userIds })}
        />
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


      {/* Enhanced Floating Chatbot */}
      <div className="fixed bottom-6 right-6 z-50">
        {!showChatbot ? (
          /* Floating Chat Button - Always Visible */
          <Button
            onClick={toggleChatbot}
            className="bg-homemade-orange hover:bg-homemade-orange-dark rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200"
            title="Open AI Assistant"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        ) : isChatbotMinimized ? (
          /* Minimized State */
          <Button
            onClick={() => setIsChatbotMinimized(false)}
            className="bg-homemade-orange hover:bg-homemade-orange-dark rounded-full w-14 h-14 shadow-lg"
            title="Expand AI Assistant"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        ) : (
          /* Full Enhanced Chatbot with Controls */
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={minimizeChatbot}
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 bg-white/80 hover:bg-white rounded-full"
                title="Minimize"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeChatbot}
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 bg-white/80 hover:bg-white rounded-full"
                title="Close"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            {/* Enhanced Chatbot Component */}
            {authToken && userProfile && (
              <EnhancedChatbot
                userAuthToken={authToken}
                userId={userProfile.id}
              />
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
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
  );
};
