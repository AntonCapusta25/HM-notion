import { useState } from 'react';
import { Layout } from '../components/Layout';
import { TaskCard } from '../components/TaskCard';
import { CreateTaskDialog } from '../components/CreateTaskDialog';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { WorkspaceSelector } from '../components/WorkspaceSelector';
import { ListView } from '../components/ListView';
import { useTaskStore } from '../hooks/useTaskStore';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Calendar, AlertCircle, LayoutGrid, List } from 'lucide-react';
import { Task } from '../types';

// CRITICAL FIX: Move filters object outside component to prevent re-creation
const PERSONAL_FILTERS = { filters: { personal_only: true } };

const MyTasks = () => {
  // CRITICAL: ALL hooks must be called first, no conditional hook calls
  const { user } = useAuth();
  
  const { 
    tasks: personalTasks, 
    users, 
    workspaces, 
    createTask, 
    updateTask, 
    deleteTask, 
    addComment, 
    toggleSubtask,
    loading: tasksLoading,
    error
  } = useTaskStore(PERSONAL_FILTERS); // FIXED: Use constant instead of creating new object
  
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // NOW we can do conditional rendering after all hooks are called
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
          <AlertDescription>
            Error loading your tasks: {error}
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

  // Simple filtering without useMemo to avoid dependency issues
  let myTasks = personalTasks || [];
  
  // Workspace filtering
  if (selectedWorkspace) {
    const workspace = workspaces.find(w => w.id === selectedWorkspace);
    if (workspace) {
      myTasks = myTasks.filter(task => task.tags && task.tags.includes(workspace.department));
    }
  }

  // Date filtering
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (filter === 'today') {
    myTasks = myTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate <= today && task.status !== 'done';
    });
  } else if (filter === 'week') {
    myTasks = myTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate <= weekFromNow && task.status !== 'done';
    });
  } else if (filter === 'overdue') {
    myTasks = myTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate < today && task.status !== 'done';
    });
  }

  // Simple object creation without useMemo
  const tasksByStatus = {
    todo: myTasks.filter(t => t.status === 'todo'),
    in_progress: myTasks.filter(t => t.status === 'in_progress'),
    done: myTasks.filter(t => t.status === 'done')
  };

  const stats = {
    total: myTasks.length,
    overdue: myTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
    dueToday: myTasks.filter(t => {
      if (!t.dueDate) return false;
      const today = new Date();
      const dueDate = new Date(t.dueDate);
      return dueDate.toDateString() === today.toDateString() && t.status !== 'done';
    }).length
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      await createTask({
        ...taskData,
        assignedTo: user.id, // Use user.id directly
        subtasks: []
      });
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleAssignTask = async (taskId: string, userId: string) => {
    try {
      await updateTask(taskId, { assignedTo: userId });
    } catch (err) {
      console.error('Failed to assign task:', err);
    }
  };

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
            
            <Button onClick={() => setShowCreateTask(true)} className="bg-homemade-orange hover:bg-homemade-orange-dark">
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

        {viewMode === 'kanban' && (
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
        )}

        {viewMode === 'list' ? (
          <ListView
            tasks={myTasks}
            users={users}
            onCreateTask={handleCreateTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAssignTask={handleAssignTask}
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
                    onAssign={handleAssignTask}
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
                    onAssign={handleAssignTask}
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
                    onAssign={handleAssignTask}
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
          onUpdateTask={updateTask}
          onAddComment={addComment}
          onToggleSubtask={toggleSubtask}
        />
      </div>
    </Layout>
  );
};

export default MyTasks;
