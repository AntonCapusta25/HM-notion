import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { TaskCard } from '../components/TaskCard';
import { CreateTaskDialog } from '../components/CreateTaskDialog';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { EditWorkspaceDialog } from '../components/EditWorkspaceDialog';
import { ChefWorkspace } from '../components/chef/ChefWorkspace'; // NEW: Import chef workspace
import { useTaskContext } from '../contexts/TaskContext';
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
  Activity,
  RefreshCw
} from 'lucide-react';
import { Task } from '../types';

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
    refreshTasks,
    loading: tasksLoading, 
    error 
  } = useTaskContext();
  
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showEditWorkspace, setShowEditWorkspace] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const workspace = workspaces.find(w => w.id === workspaceId);

  // NEW: Check workspace type and route accordingly
  if (workspace?.type === 'chef_outreach') {
    return (
      <Layout>
        <ChefWorkspace workspaceId={workspaceId!} />
      </Layout>
    );
  }

  // Rest of your existing task management code...
  const workspaceTasks = useMemo(() => {
    if (!workspaceId) return [];
    return tasks.filter(task => task.workspace_id === workspaceId);
  }, [tasks, workspaceId]);

  const workspaceTeam = useMemo(() => {
    const teamIds = new Set<string>();
    workspaceTasks.forEach(task => {
      // Fixed: Use correct field names
      if (task.assignees && task.assignees.length > 0) {
        task.assignees.forEach(assigneeId => teamIds.add(assigneeId));
      }
      if (task.created_by) teamIds.add(task.created_by);
    });
    return users.filter(user => teamIds.has(user.id));
  }, [workspaceTasks, users]);

  const stats = useMemo(() => {
    const total = workspaceTasks.length;
    const completed = workspaceTasks.filter(t => t.status === 'done').length;
    const inProgress = workspaceTasks.filter(t => t.status === 'in_progress').length;
    const todo = workspaceTasks.filter(t => t.status === 'todo').length;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Fixed: Use correct field name due_date
    const overdue = workspaceTasks.filter(t => 
      t.due_date && new Date(t.due_date) < today && t.status !== 'done'
    ).length;
    
    const dueToday = workspaceTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate.toDateString() === today.toDateString() && t.status !== 'done';
    }).length;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    // Fixed: Use correct field name updated_at
    const recentActivity = workspaceTasks.filter(t => {
      const updatedAt = new Date(t.updated_at || t.created_at);
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

  const tasksByStatus = useMemo(() => ({
    todo: workspaceTasks.filter(t => t.status === 'todo'),
    in_progress: workspaceTasks.filter(t => t.status === 'in_progress'),
    done: workspaceTasks.filter(t => t.status === 'done')
  }), [workspaceTasks]);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    if (!refreshTasks) return;
    
    setIsRefreshing(true);
    console.log('🔄 WorkspaceDetail - Manual refresh triggered');
    
    try {
      await refreshTasks();
      console.log('✅ WorkspaceDetail - Manual refresh completed');
    } catch (err) {
      console.error('❌ WorkspaceDetail - Manual refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshTasks]);

  // Enhanced task operations
  const handleCreateTask = useCallback(async (taskData: any) => {
    if (!workspaceId) return;
    
    try {
      console.log('📝 WorkspaceDetail - Creating task for workspace:', workspaceId);
      await createTask({
        ...taskData,
        workspace_id: workspaceId,
        subtasks: []
      });
      setShowCreateTask(false);
      console.log('✅ WorkspaceDetail - Task creation completed');
    } catch (err) {
      console.error('❌ WorkspaceDetail - Failed to create task:', err);
      throw err;
    }
  }, [workspaceId, createTask]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: any) => {
    try {
      console.log('📝 WorkspaceDetail - Updating task:', taskId);
      await updateTask(taskId, updates);
      console.log('✅ WorkspaceDetail - Task update completed');
    } catch (err) {
      console.error('❌ WorkspaceDetail - Failed to update task:', err);
      throw err;
    }
  }, [updateTask]);

  // Fixed: Updated to use correct assignees field structure
  const handleAssignTask = useCallback(async (taskId: string, userId: string) => {
    try {
      console.log('👤 WorkspaceDetail - Assigning task:', taskId, 'to user:', userId);
      
      // Get current task to preserve existing assignees
      const currentTask = tasks.find(t => t.id === taskId);
      const currentAssignees = currentTask?.assignees || [];
      
      // Add user if not already assigned, or replace if it's a single assignment
      const newAssignees = currentAssignees.includes(userId) 
        ? currentAssignees 
        : [...currentAssignees, userId];
      
      await updateTask(taskId, { assignees: newAssignees });
      console.log('✅ WorkspaceDetail - Task assignment completed');
    } catch (err) {
      console.error('❌ WorkspaceDetail - Failed to assign task:', err);
      throw err;
    }
  }, [tasks, updateTask]);
  
  const handleDeleteTask = useCallback(async (taskId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this task?');
    if (!confirmed) return;
    
    try {
      console.log('🗑️ WorkspaceDetail - Deleting task:', taskId);
      await deleteTask(taskId);
      console.log('✅ WorkspaceDetail - Task deletion completed');
    } catch (err) {
      console.error('❌ WorkspaceDetail - Failed to delete task:', err);
      throw err;
    }
  }, [deleteTask]);

  const handleAddComment = useCallback(async (taskId: string, content: string) => {
    try {
      console.log('💬 WorkspaceDetail - Adding comment to task:', taskId);
      await addComment(taskId, content);
      console.log('✅ WorkspaceDetail - Comment added successfully');
    } catch (err) {
      console.error('❌ WorkspaceDetail - Failed to add comment:', err);
      throw err;
    }
  }, [addComment]);

  const handleToggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      console.log('☑️ WorkspaceDetail - Toggling subtask:', subtaskId);
      await toggleSubtask(taskId, subtaskId);
      console.log('✅ WorkspaceDetail - Subtask toggled successfully');
    } catch (err) {
      console.error('❌ WorkspaceDetail - Failed to toggle subtask:', err);
      throw err;
    }
  }, [toggleSubtask]);

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
                {workspace.department && <Badge variant="secondary">{workspace.department}</Badge>}
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
                    (t.assignees && t.assignees.includes(member.id)) || t.created_by === member.id
                  );
                  const memberCompleted = memberTasks.filter(t => t.status === 'done').length;
                  
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ backgroundColor: workspace.color, color: 'white' }}>
                          {member.avatar || (member.name ? member.name.charAt(0) : '?')}
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
          onUpdateTask={handleUpdateTask}
          onAddComment={handleAddComment}
          onToggleSubtask={handleToggleSubtask}
        />

        {workspace && (
          <EditWorkspaceDialog
            workspace={workspace}
            open={showEditWorkspace}
            onOpenChange={setShowEditWorkspace}
          />
        )}
      </div>
    </Layout>
  );
};

export default WorkspaceDetail;
