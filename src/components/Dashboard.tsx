
import { useState } from 'react';
import { Plus, Filter, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailDialog } from './TaskDetailDialog';
import { useTaskStore } from '../hooks/useTaskStore';
import { Task } from '../types';

export const Dashboard = () => {
  const { tasks, users, createTask, updateTask, addComment, toggleSubtask } = useTaskStore();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'my' | 'team'>('all');

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
  };

  const currentUser = users[0]; // Ali Hassan as current user
  const filteredTasks = filter === 'my' 
    ? tasks.filter(t => t.assignedTo === currentUser.id)
    : tasks;

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done')
  };

  const handleCreateTask = (taskData: any) => {
    createTask({
      ...taskData,
      subtasks: []
    });
  };

  const handleAssignTask = (taskId: string, userId: string) => {
    updateTask(taskId, { assignedTo: userId });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Good morning, Ali! 👋</h1>
          <p className="text-gray-600 mt-1">You have {stats.inProgress} tasks in progress and {stats.overdue} overdue items</p>
        </div>
        <Button onClick={() => setShowCreateTask(true)} className="bg-homemade-orange hover:bg-homemade-orange-dark">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
          >
            All Tasks
          </Button>
          <Button 
            variant={filter === 'my' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('my')}
            className={filter === 'my' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
          >
            My Tasks
          </Button>
          <Button 
            variant={filter === 'team' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('team')}
            className={filter === 'team' ? 'bg-homemade-orange hover:bg-homemade-orange-dark' : ''}
          >
            Team Tasks
          </Button>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Task Columns */}
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
