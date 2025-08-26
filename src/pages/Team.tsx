import { useState, useMemo, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailDialog } from '../components/TaskDetailDialog';
import { WorkspaceSelector } from '../components/WorkspaceSelector';
import { useTaskStore } from '../hooks/useTaskStore';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Calendar, TrendingUp } from 'lucide-react';
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
  // CHANGED: Get authentication and team-wide data from Supabase
  const { userProfile, loading: authLoading } = useAuth();
  
  // CHANGED: Get ALL team tasks (no personal_only filter)
  const { 
    tasks, 
    users, 
    workspaces, 
    updateTask, 
    addComment, 
    toggleSubtask, 
    loading: tasksLoading, 
    error 
  } = useTaskStore(); // No filters - shows ALL team tasks
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // ADDED: Real team dashboard stats from Supabase
  const [dashboardStats, setDashboardStats] = useState<TeamDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ADDED: Fetch team-wide dashboard stats
  useEffect(() => {
    const fetchTeamStats = async () => {
      if (!userProfile) return;

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
    };

    fetchTeamStats();
  }, [userProfile]);

  // ADDED: Loading state
  if (authLoading || tasksLoading || statsLoading) {
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

  // ADDED: Error state
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

  // ADDED: No user profile state
  if (!userProfile) {
    return (
      <Layout>
        <Alert className="m-6">
          <AlertDescription>
            Unable to load user profile. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  // UNCHANGED: Keep your existing filtering logic (works with ALL team tasks now)
  const filteredTasks = useMemo(() => {
    let filtered = tasks; // Now contains ALL team tasks from Supabase
    
    if (selectedWorkspace) {
      const workspace = workspaces.find(w => w.id === selectedWorkspace);
      if (workspace) {
        filtered = filtered.filter(task => task.tags.includes(workspace.department));
      }
    }

    if (selectedUser) {
      filtered = filtered.filter(task => task.assignedTo === selectedUser);
    }

    return filtered;
  }, [tasks, selectedWorkspace, selectedUser, workspaces]);

  // CHANGED: Use real stats from Supabase when available, fallback to calculated stats
  const teamStats = useMemo(() => {
    if (dashboardStats) {
      return {
        totalTasks: dashboardStats.total_tasks,
        inProgress: dashboardStats.in_progress_tasks,
        completed: dashboardStats.done_tasks,
        overdue: dashboardStats.overdue_tasks
      };
    }
    
    // Fallback to calculated stats from filtered tasks
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return {
      totalTasks: filteredTasks.length,
      inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
      completed: filteredTasks.filter(t => t.status === 'done').length,
      overdue: filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== 'done').length
    };
  }, [filteredTasks, dashboardStats]);

  // UNCHANGED: Keep your existing user stats calculation (now works with real users and tasks)
  const userStats = useMemo(() => {
    return users.map(user => {
      const userTasks = filteredTasks.filter(t => t.assignedTo === user.id);
      const completed = userTasks.filter(t => t.status === 'done').length;
      const inProgress = userTasks.filter(t => t.status === 'in_progress').length;
      const overdue = userTasks.filter(t => {
        if (!t.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(t.dueDate);
        return dueDate < today && t.status !== 'done';
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

  // UNCHANGED: Keep your existing task grouping
  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done')
  };

  // CHANGED: Add async handling for task assignment
  const handleAssignTask = async (taskId: string, userId: string) => {
    try {
      await updateTask(taskId, { assignedTo: userId });
    } catch (err) {
      console.error('Failed to assign task:', err);
      // Could add toast notification here
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* UNCHANGED: Keep your exact header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Overview</h1>
            <p className="text-gray-600 mt-1">Track team progress and collaboration</p>
          </div>
        </div>

        {/* CHANGED: Now uses real team stats */}
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

        {/* UNCHANGED: Keep your exact filters (now works with real data) */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <WorkspaceSelector 
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              onWorkspaceChange={setSelectedWorkspace}
            />
          </div>
          <div className="flex-1">
            <select 
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value || null)}
            >
              <option value="">All Team Members</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.department})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* UNCHANGED: Keep your team performance section (now with real user data) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userStats.map(user => (
                <div key={user.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-homemade-orange text-white">
                        {user.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-gray-600">{user.department}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Tasks:</span>
                      <span className="font-medium">{user.totalTasks}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>In Progress:</span>
                      <span className="font-medium text-yellow-600">{user.inProgress}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Completed:</span>
                      <span className="font-medium text-green-600">{user.completed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Overdue:</span>
                      <span className="font-medium text-red-600">{user.overdue}</span>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Completion Rate:</span>
                        <span className="font-medium">{user.completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-homemade-orange h-2 rounded-full transition-all duration-300"
                          style={{ width: `${user.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* UNCHANGED: Keep your exact Kanban layout */}
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

        {/* UNCHANGED: Keep your existing task detail dialog */}
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

export default Team;
