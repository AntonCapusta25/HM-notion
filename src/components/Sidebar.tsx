import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Calendar, 
  Settings, 
  ChevronLeft,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTaskStore } from '../hooks/useTaskStore';
import { useAuth } from '../contexts/AuthContext';
import { CreateWorkspaceDialog } from '../components/CreateWorkspaceDialog';
import { EditWorkspaceDialog } from '../components/EditWorkspaceDialog';
import { CreateTaskDialog } from '../components/CreateTaskDialog';
import { Workspace } from '../types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'My Tasks', href: '/my-tasks', icon: CheckSquare },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Search', href: '/search', icon: Search },
];

const NO_FILTERS = {};

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  
  // Get real workspace and task data
  const { tasks, workspaces, loading, createTask } = useTaskStore(NO_FILTERS);

  // Calculate task counts for each workspace
  const workspacesWithCounts = workspaces.map(workspace => {
    const workspaceTasks = tasks.filter(task => task.workspace_id === workspace.id);
    const activeTasks = workspaceTasks.filter(task => task.status !== 'done');
    
    return {
      ...workspace,
      taskCount: activeTasks.length
    };
  });

  const handleDeleteWorkspace = async (workspace: Workspace) => {
    const confirmed = window.confirm(
      `Delete "${workspace.name}"? This will remove the workspace from all tasks.`
    );
    
    if (!confirmed) return;

    try {
      // This would typically be handled by a useWorkspace hook, but for now:
      // Note: You'll need to implement the actual deletion logic in your useTaskStore or create a useWorkspace hook
      console.log('Delete workspace:', workspace.id);
      window.location.reload(); // Temporary - ideally would update state directly
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  };

  // Remove this function since CreateTaskDialog handles it internally

  return (
    <>
      <div className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {!collapsed && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-homemade-orange rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
                  <span className="font-bold text-xl text-gray-900">Homebase</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={onToggle}>
                <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
              </Button>
            </div>
          </div>

          {/* Search */}
          {!collapsed && (
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {!collapsed && (
            <div className="px-4 pb-4">
              <Button 
                className="w-full bg-homemade-orange hover:bg-homemade-orange-dark"
                onClick={() => setShowCreateTask(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          )}

          {/* Collapsed New Task Button */}
          {collapsed && (
            <div className="px-2 pb-4">
              <Button 
                className="w-full bg-homemade-orange hover:bg-homemade-orange-dark p-2"
                onClick={() => setShowCreateTask(true)}
                title="New Task"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="px-4">
            <nav className="space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-homemade-orange text-white" 
                        : "text-gray-700 hover:bg-gray-100",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Workspaces Section */}
          {!collapsed && (
            <div className="flex-1 px-4 py-4 border-t border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workspaces
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={() => setShowCreateWorkspace(true)}
                >
                  <Plus className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
              
              <div className="space-y-1 overflow-y-auto flex-1">
                {!loading && workspacesWithCounts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 mb-3">No workspaces yet</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setShowCreateWorkspace(true)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create first workspace
                    </Button>
                  </div>
                ) : (
                  workspacesWithCounts.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Link
                        to={`/workspace/${workspace.id}`}
                        className="flex items-center gap-2 flex-1 min-w-0"
                      >
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: workspace.color }}
                        />
                        <span className="text-sm text-gray-700 truncate group-hover:text-gray-900">
                          {workspace.name}
                        </span>
                      </Link>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {workspace.taskCount > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5">
                            {workspace.taskCount}
                          </Badge>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-200"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreHorizontal className="h-3 w-3 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem 
                              onClick={() => setEditingWorkspace(workspace)}
                              className="text-sm"
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteWorkspace(workspace)}
                              className="text-sm text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200 mt-auto">
            <div className={cn(
              "flex items-center gap-3",
              collapsed && "justify-center"
            )}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-homemade-orange text-white">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user?.email || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">Team Member</div>
                </div>
              )}
              {!collapsed && (
                <Link to="/settings">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
      />

      {/* Create Workspace Dialog */}
      <CreateWorkspaceDialog 
        open={showCreateWorkspace}
        onOpenChange={setShowCreateWorkspace}
      />

      {/* Edit Workspace Dialog */}
      <EditWorkspaceDialog
        workspace={editingWorkspace}
        open={!!editingWorkspace}
        onOpenChange={(open) => !open && setEditingWorkspace(null)}
      />
    </>
  );
};
