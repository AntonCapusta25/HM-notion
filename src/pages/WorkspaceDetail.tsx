import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { TaskCard } from '../components/TaskCard';
import { CreateTaskDialog } from '../components/CreateTaskDialog';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { EditWorkspaceDialog } from '../components/EditWorkspaceDialog';
import { useTaskStore } from '../hooks/useTaskStore';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Calendar, 
  Users, 
  Settings, 
  ArrowLeft, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';
import { Task } from '../types';

const NO_FILTERS = {};

const WorkspaceDetail = () => {
  const { id: workspaceId } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const { 
    tasks, 
    users, 
    workspaces, 
    createTask, 
    updateTask, 
    deleteTask, 
    addComment, 
    toggleSubtask,
    loading: tasksLoading, 
    error 
  } = useTaskStore(NO_FILTERS);
  
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showEditWorkspace, setShowEditWorkspace] = useState(false);

  // Find the current workspace
  const workspace = workspaces.find(w => w.id === workspaceId);
  
  // Filter tasks for this workspace
  const workspaceTasks = useMemo(() => {
    return tasks.filter(task => task.workspace_id === workspaceId);
  }, [tasks, workspaceId]);

  // Find team members working in this workspace
  const workspaceTeam = useMemo(() => {
    const teamIds = new Set();
    workspaceTasks.forEach(task => {
      if (task.assignedTo) teamIds.add(task.assignedTo);
      if (task.createdBy) teamIds.add(task.createdBy);
    });
    return users.filter(user => teamIds.has(user.id));
  }, [workspaceTasks, users]);

  // Calculate workspace statistics
  const stats = useMemo(() => {
    const total = workspaceTasks.length;
    const completed = workspaceTasks.filter(t => t.status === 'done').length;
    const inProgress = workspaceTasks.filter(t => t.status === 'in_progress').length;
    const todo = workspaceTasks.filter(t => t.status === 'todo').length;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const overdue = workspaceTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < today && t.status !== 'done'
    ).length;
    
    const dueToday = workspaceTasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      return dueDate.toDateString() === today.toDateString() && t.status !== 'done';
    }).length;

    // Recent activity (tasks updated in last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = workspaceTasks.filter(t => {
      const updatedAt = new Date(t.updatedAt || t.createdAt);
      return updatedAt > weekAgo;
    }).length;

    return {
      total,
      completed,
      inProgress, 
      todo,
      overdue,
      dueToday,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      recentActivity
    };
  }, [workspaceTasks]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => ({
    todo: workspaceTasks.filter(t => t.status === 'todo'),
    in_progress: workspaceTasks.filter(t => t.status === 'in_progress'),
    done: workspaceTasks.filter(t => t.status === 'done')
  }), [workspaceTasks]);

  if (tasksLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading workspace...</p>
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
            Error loading workspace: {error}
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  if (!workspace) {
    return (
      <Layout>
        <div className="p-6">
          <Alert>
            <AlertDescription>
              Workspace not found. <Link to="/" className="text-homemade-orange hover:underline">Return to Dashboard</Link>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const handleCreateTask = async (taskData: any) => {
    try {
      await createTask({
        ...taskData,
        workspace_id: workspaceId, // Auto-assign to current workspace
        assignedTo: taskData.assignedTo || user?.id,
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
        {/* Workspace Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-6 h-6 rounded-lg flex-shrink-0" 
                  style={{ backgroundColor: workspace.color }}
                />
                <h1 className="text-3xl font-bold text-gray-900">{workspace.name}</h1>
                <Badge variant="secondary">{workspace.department}</Badge>
              </div>
              
              {workspace.description && (
                <p className="text-gray-600 max-w-2xl">{workspace.description}</p>
              )}
              
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {workspaceTeam.length} team members
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  {stats.recentActivity} recent updates
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditWorkspace(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button 
              onClick={() => setShowCreateTask(true)} 
              className="bg-homemade-orange hover:bg-homemade-orange-dark"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Workspace Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
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
                  <Clock className="h-6 w-6 text-yellow-600" />
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
                  <CheckCircle className="h-6 w-6 text-green-600" />
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

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Progress</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.completionRate}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Workspace Progress</h3>
              <span className="text-sm text-gray-500">
                {stats.completed} of {stats.total} tasks completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="h-4 rounded-full transition-all duration-500"
                style={{ 
                  width: `${stats.completionRate}%`,
                  backgroundColor: workspace.color 
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        {workspaceTeam.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({workspaceTeam.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {workspaceTeam.map(member => {
                  const memberTasks = workspaceTasks.filter(t => 
                    t.assignedTo === member.id || t.createdBy === member.id
                  );
                  const memberCompleted = memberTasks.filter(t => t.status === 'done').length;
                  
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ backgroundColor: workspace.color, color: 'white' }}>
                          {member.avatar || member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.department}</p>
                        <p className="text-xs text-gray-500">
                          {memberTasks.length} tasks • {memberCompleted} completed
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
                  onAssign={handleAssignTask}
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
                  onAssign={handleAssignTask}
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
                  onAssign={handleAssignTask}
                />
              ))}
              {tasksByStatus.done.length === 0 && (
                <p className="text-gray-500 text-center py-8 text-sm">No tasks in this column</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Empty State for No Tasks */}
        {stats.total === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks yet</h3>
              <p className="text-gray-500 mb-4">Get started by creating the first task for this workspace.</p>
              <Button 
                onClick={() => setShowCreateTask(true)}
                className="bg-homemade-orange hover:bg-homemade-orange-dark"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            </CardContent>
          </Card>
        )}

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
          onUpdateTask={updateTask}
          onAddComment={addComment}
          onToggleSubtask={toggleSubtask}
        />

        <EditWorkspaceDialog
          workspace={workspace}
          open={showEditWorkspace}
          onOpenChange={setShowEditWorkspace}
        />
      </div>
    </Layout>
  );
};

export default WorkspaceDetail;
