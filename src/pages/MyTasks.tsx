import { useState, useMemo, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { TaskCard } from '../components/TaskCard';
import { CreateTaskDialog } from '../components/CreateTaskDialog';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { WorkspaceSelector } from '../components/WorkspaceSelector';
import { ListView } from '../components/ListView';
import { useTaskContext } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Calendar, AlertCircle, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { Task } from '../types';

export const MyTasks = () => {
  const { 
    tasks, 
    users, 
    workspaces, 
    createTask,
    deleteTask, 
    updateTask,
    addComment,
    toggleSubtask,
    updateAssignees,
    refreshTasks, // Add this if using the enhanced useTaskStore
    loading: tasksLoading,
    error
  } = useTaskContext();

  const { user } = useAuth();
  
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    if (!refreshTasks) return;
    
    setIsRefreshing(true);
    console.log('🔄 MyTasks - Manual refresh triggered');
    
    try {
      await refreshTasks();
      console.log('✅ MyTasks - Manual refresh completed');
    } catch (err) {
      console.error('❌ MyTasks - Manual refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshTasks]);

  // Enhanced task operations with proper error handling
  const handleCreateTask = useCallback(async (taskData: any) => {
    try {
      console.log('📝 MyTasks - Creating task:', taskData.title);
      await createTask(taskData);
      setShowCreateTask(false);
      console.log('✅ MyTasks - Task creation completed');
    } catch (err) {
      console.error('❌ MyTasks - Failed to create task:', err);
      throw err;
    }
  }, [createTask]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: any) => {
    try {
      console.log('📝 MyTasks - Updating task:', taskId);
      await updateTask(taskId, updates);
      console.log('✅ MyTasks - Task update completed');
    } catch (err) {
      console.error('❌ MyTasks - Failed to update task:', err);
      throw err;
    }
  }, [updateTask]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this task?');
    if (!confirmed) return;
    
    try {
      console.log('🗑️ MyTasks - Deleting task:', taskId);
      await deleteTask(taskId);
      console.log('✅ MyTasks - Task deletion completed');
    } catch (err) {
      console.error('❌ MyTasks - Failed to delete task:', err);
      throw err;
    }
  }, [deleteTask]);

  const handleAddComment = useCallback(async (taskId: string, content: string) => {
    try {
      console.log('💬 MyTasks - Adding comment to task:', taskId);
      await addComment(taskId, content);
      console.log('✅ MyTasks - Comment added successfully');
    } catch (err) {
      console.error('❌ MyTasks - Failed to add comment:', err);
      throw err;
    }
  }, [addComment]);

  const handleToggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      console.log('☑️ MyTasks - Toggling subtask:', subtaskId);
      await toggleSubtask(taskId, subtaskId);
      console.log('✅ MyTasks - Subtask toggled successfully');
    } catch (err) {
      console.error('❌ MyTasks - Failed to toggle subtask:', err);
      throw err;
    }
  }, [toggleSubtask]);

  const myTasks = useMemo(() => {
    if (!user) return [];

    let personalTasks = tasks.filter(task => 
      (task.assignees && task.assignees.includes(user.id)) || task.created_by === user.id
    );

    if (selectedWorkspace) {
      personalTasks = personalTasks.filter(task => task.workspace_id === selectedWorkspace);
    }

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

  if (tasksLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your tasks...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert variant="destructive" className="m-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading tasks: {error}
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
            Please log in to view your tasks.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  const tasksByStatus = useMemo(() => ({
    todo: myTasks.filter(t => t.status === 'todo'),
    in_progress: myTasks.filter(t => t.status === 'in_progress'),
    done: myTasks.filter(t => t.status === 'done')
  }), [myTasks]);

  const stats = useMemo(() => {
    const todayRaw = new Date();
    const today = new Date(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate());
    return {
      total: myTasks.length,
      overdue: myTasks.filter(t => t.due_date && new Date(t.due_date) < today && t.status !== 'done').length,
      dueToday: myTasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === today.toDateString() && t.status !== 'done').length
    };
  }, [myTasks]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600 mt-1">
              {stats.overdue > 0 ? `${stats.overdue} overdue tasks` : 'You\'re up to date!'} 
              {stats.dueToday > 0 && ` • ${stats.dueToday} due today`}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <div className="flex border rounded-lg p-1 bg-gray-50">
              <Button 
                variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('kanban')} 
                className={viewMode === 'kanban' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('list')} 
                className={viewMode === 'list' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
            <Button 
              onClick={() => setShowCreateTask(true)} 
              className="bg-homemade-orange hover:bg-homemade-orange-dark"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                    <p className="text-sm text-gray-600">Due Today</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.dueToday}</p>
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
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <WorkspaceSelector 
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              onWorkspaceChange={setSelectedWorkspace}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('all')} 
              className={filter === 'all' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
            >
              All
            </Button>
            <Button 
              variant={filter === 'today' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('today')} 
              className={filter === 'today' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
            >
              Due Today
            </Button>
            <Button 
              variant={filter === 'week' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('week')} 
              className={filter === 'week' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
            >
              This Week
            </Button>
            <Button 
              variant={filter === 'overdue' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('overdue')} 
              className={filter === 'overdue' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
            >
              Overdue
            </Button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <ListView
            tasks={myTasks}
            users={users}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        ) : (
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
    </Layout>
  );
};

export default MyTasks;
