import { useState, useEffect } from 'react';
import { Plus, Filter, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';
import { useTaskStore } from '../hooks/useTaskStore';
import { useAuth } from '../contexts/AuthContext';
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
  const { userProfile, loading: authLoading } = useAuth();
  const { tasks, users, createTask, updateTask, addComment, toggleSubtask, loading: tasksLoading, error } = useTaskStore();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'my' | 'team'>('all');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ##### THIS BLOCK IS NOW FIXED #####
  useEffect(() => {
    const fetchDashboardStats = async () => {
      // If there is no user profile yet, we are not loading stats.
      // Set loading to false and exit.
      if (!userProfile) {
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
          console.error('Error fetching dashboard stats:', error);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [userProfile]);

  if (authLoading || statsLoading) { // Temporarily removed 'tasksLoading'
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
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

  if (!userProfile) {
    return (
      <Alert className="m-6">
        <AlertDescription>
          Unable to load user profile. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

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
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
    dueToday: tasks.filter(t => t.dueDate === new Date().toISOString().split('T')[0] && t.status !== 'done').length,
    myTasks: tasks.filter(t => t.assignedTo === userProfile.id || t.createdBy === userProfile.id).length
  };

  const filteredTasks = filter === 'my' 
    ? tasks.filter(t => t.assignedTo === userProfile.id || t.createdBy === userProfile.id)
    : tasks; 

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done')
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      await createTask({
        ...taskData,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Good morning, {userProfile.name}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            You have {stats.inProgress} tasks in progress and {stats.overdue} overdue items
            {filter === 'my' && ` • Viewing your ${stats.myTasks} personal tasks`}
            {filter === 'all' && ` • Viewing all ${stats.total} team tasks`}
          </p>
        </div>
        <Button onClick={() => setShowCreateTask(true)} className="bg-homemade-orange hover:bg-homemade-orange-dark">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
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
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

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
  );
};
