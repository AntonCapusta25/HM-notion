import { useState, useMemo } from 'react';
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
import { Plus, Calendar, AlertCircle, LayoutGrid, List } from 'lucide-react';
import { Task } from '../types';

export const MyTasks = () => {
  const { 
    tasks, 
    users, 
    workspaces, 
    deleteTask, 
    updateTask,
    addComment,
    updateAssignees,
    loading: tasksLoading,
    error
  } = useTaskContext();

  const { user } = useAuth();
  
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

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

  if (error) { /* ... error UI ... */ }
  if (!user) { /* ... login prompt UI ... */ }

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

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
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
              <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className={viewMode === 'kanban' ? 'bg-homemade-orange' : ''}><LayoutGrid className="h-4 w-4 mr-2" />Kanban</Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-homemade-orange' : ''}><List className="h-4 w-4 mr-2" />List</Button>
            </div>
            <Button onClick={() => setShowCreateTask(true)} className="bg-homemade-orange"><Plus className="h-4 w-4 mr-2" />New Task</Button>
          </div>
        </div>

        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><CardContent className="p-6">
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </CardContent></Card>
            <Card><CardContent className="p-6">
                <p className="text-sm text-gray-600">Due Today</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.dueToday}</p>
            </CardContent></Card>
            <Card><CardContent className="p-6">
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </CardContent></Card>
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
            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')} className={filter === 'all' ? 'bg-homemade-orange' : ''}>All</Button>
            <Button variant={filter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('today')} className={filter === 'today' ? 'bg-homemade-orange' : ''}>Due Today</Button>
            <Button variant={filter === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('week')} className={filter === 'week' ? 'bg-homemade-orange' : ''}>This Week</Button>
            <Button variant={filter === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('overdue')} className={filter === 'overdue' ? 'bg-homemade-orange' : ''}>Overdue</Button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <ListView
            tasks={myTasks}
            users={users}
            onUpdateTask={updateTask}
            onDeleteTask={handleDeleteTask}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader><CardTitle>To Do <Badge variant="secondary">{tasksByStatus.todo.length}</Badge></CardTitle></CardHeader>
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
              <CardHeader><CardTitle>In Progress <Badge variant="secondary">{tasksByStatus.in_progress.length}</Badge></CardTitle></CardHeader>
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
              <CardHeader><CardTitle>Done <Badge variant="secondary">{tasksByStatus.done.length}</Badge></CardTitle></CardHeader>
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
        />
        <TaskDetailDialog
          task={selectedTask}
          users={users}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onUpdateTask={updateTask}
          updateAssignees={updateAssignees}
          onAddComment={addComment}
        />
      </div>
    </Layout>
  );
};

export default MyTasks;
