import { useState, useMemo } from 'react';
import { Search, Settings, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationCenter } from './NotificationCenter';
import { TaskDetailDialog } from './TaskDetailDialog';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useTaskContext } from '../contexts/TaskContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Task } from '../types';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Get real data from TaskContext
  const {
    tasks,
    users,
    workspaces,
    updateTask,
    addComment,
    toggleSubtask
  } = useTaskContext();

  // Search functionality - same logic as SearchResults and Sidebar
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { tasks: [], users: [], workspaces: [] };

    const query = searchQuery.toLowerCase();

    const filteredTasks = tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query)) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(query)))
    );

    const filteredUsers = users.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.department && user.department.toLowerCase().includes(query))
    );

    const filteredWorkspaces = workspaces.filter(workspace =>
      workspace.name.toLowerCase().includes(query) ||
      (workspace.department && workspace.department.toLowerCase().includes(query))
    );

    return {
      tasks: filteredTasks.slice(0, 4), // Slightly more results in header
      users: filteredUsers.slice(0, 4),
      workspaces: filteredWorkspaces.slice(0, 4)
    };
  }, [searchQuery, tasks, users, workspaces]);

  const hasSearchResults = searchResults.tasks.length > 0 || searchResults.users.length > 0 || searchResults.workspaces.length > 0;

  const getInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return (emailName.charAt(0) + (emailName.charAt(1) || '')).toUpperCase();
    }
    return 'U';
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User';

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.trim().length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowSearchResults(false);
  };

  const handleUserClick = (userId: string) => {
    navigate('/team');
    clearSearch();
  };

  const handleWorkspaceClick = (workspaceId: string) => {
    navigate(`/workspace/${workspaceId}`);
    clearSearch();
  };

  const handleSeeAllResults = () => {
    navigate('/search');
    clearSearch();
  };

  const handleAssignTask = async (taskId: string, userId: string) => {
    try {
      // Get current task to preserve existing assignees (using correct field mapping)
      const currentTask = tasks.find(t => t.id === taskId);
      const currentAssignees = currentTask?.assignees || [];

      // Add user if not already assigned
      const newAssignees = currentAssignees.includes(userId)
        ? currentAssignees
        : [...currentAssignees, userId];

      await updateTask(taskId, { assignees: newAssignees });
    } catch (err) {
      console.error('Failed to assign task:', err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-all duration-300">
        <div className="flex items-center justify-between">
          {/* Left Side */}
          <div className="flex items-center gap-4 flex-1">
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks, users, or workspaces..."
                className="pl-10 pr-8 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-homemade-orange/20 dark:bg-white/10 dark:focus:bg-white/20 dark:text-white dark:placeholder:text-white/40"
                value={searchQuery}
                onChange={handleSearchInputChange}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={clearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto shadow-lg">
                  <CardContent className="p-4">
                    {!hasSearchResults ? (
                      <div className="text-center py-6">
                        <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No results found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Tasks */}
                        {searchResults.tasks.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Tasks ({searchResults.tasks.length})
                            </h4>
                            <div className="space-y-2">
                              {searchResults.tasks.map(task => (
                                <button
                                  key={task.id}
                                  onClick={() => handleTaskClick(task)}
                                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
                                >
                                  <div className="font-medium text-sm text-gray-900 truncate mb-1">
                                    {task.title}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {task.priority}
                                    </Badge>
                                    <span className={cn(
                                      "text-xs px-2 py-1 rounded-full",
                                      task.status === 'todo' && "bg-gray-100 text-gray-600",
                                      task.status === 'in_progress' && "bg-yellow-100 text-yellow-600",
                                      task.status === 'done' && "bg-green-100 text-green-600"
                                    )}>
                                      {task.status.replace('_', ' ')}
                                    </span>
                                    {task.due_date && (
                                      <span className="text-xs text-gray-500">
                                        Due: {new Date(task.due_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Users */}
                        {searchResults.users.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Users ({searchResults.users.length})
                            </h4>
                            <div className="space-y-2">
                              {searchResults.users.map(user => (
                                <button
                                  key={user.id}
                                  onClick={() => handleUserClick(user.id)}
                                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-100 flex items-center gap-3 transition-colors"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-homemade-orange text-white text-xs">
                                      {user.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-900 truncate">
                                      {user.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {user.email}
                                    </div>
                                    {user.department && (
                                      <Badge variant="outline" className="text-xs mt-1">
                                        {user.department}
                                      </Badge>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Workspaces */}
                        {searchResults.workspaces.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Workspaces ({searchResults.workspaces.length})
                            </h4>
                            <div className="space-y-2">
                              {searchResults.workspaces.map(workspace => (
                                <button
                                  key={workspace.id}
                                  onClick={() => handleWorkspaceClick(workspace.id)}
                                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-100 flex items-center gap-3 transition-colors"
                                >
                                  <div
                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: workspace.color }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-900 truncate">
                                      {workspace.name}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {workspace.department}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* See All Results */}
                        <div className="pt-3 border-t border-gray-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center text-sm"
                            onClick={handleSeeAllResults}
                          >
                            See all results for "{searchQuery}"
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <NotificationCenter />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-auto">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-homemade-orange text-white text-sm font-medium">
                      {profileLoading ? '...' : getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:block text-gray-700 dark:text-gray-200">
                    {profileLoading ? 'Loading...' : displayName}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="end">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-homemade-orange text-white">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      {profile?.department && (<p className="text-xs text-gray-400 truncate">{profile.department}</p>)}
                    </div>
                  </div>
                </div>

                <div className="p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => navigate('/settings')}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign out
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      {/* Overlay to close search results */}
      {showSearchResults && (
        <div
          className="fixed inset-0 z-30 bg-transparent"
          onClick={clearSearch}
        />
      )}

      {/* Task Detail Dialog for search results */}
      <TaskDetailDialog
        task={selectedTask}
        users={users}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onUpdateTask={updateTask}
        onAddComment={addComment}
        onToggleSubtask={toggleSubtask}
      />
    </>
  );
};
