import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    Calendar,
    Settings,
    Search,
    Plus,
    MoreHorizontal,
    Edit,
    Trash2,
    X,
    ChevronDown,
    ChevronRight,
    Zap,
    Building2,
    Sparkles,
    MessageSquare,
    Bot,
    Image,
    Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { CreateWorkspaceDialog } from '../../components/CreateWorkspaceDialog';
import { EditWorkspaceDialog } from '../../components/EditWorkspaceDialog';
import { CreateTaskDialog } from '../../components/CreateTaskDialog';
import { TaskDetailDialog } from '../../components/TaskDetailDialog';
import { Workspace, Task } from '../../types';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { educationData } from '../../data/education-data';

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

export const PremiumSidebar = ({ collapsed, onToggle }: SidebarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const { user } = useAuth();
    const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
    const [educationExpanded, setEducationExpanded] = useState(true);
    const [aiToolsExpanded, setAiToolsExpanded] = useState(false);

    // Get real data from TaskContext
    const {
        tasks,
        users,
        workspaces,
        loading,
        updateTask,
        addComment,
        toggleSubtask
    } = useTaskContext();

    // Search functionality - same logic as SearchResults component
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
            tasks: filteredTasks.slice(0, 3), // Limit results in sidebar
            users: filteredUsers.slice(0, 3),
            workspaces: filteredWorkspaces.slice(0, 3)
        };
    }, [searchQuery, tasks, users, workspaces]);

    const hasSearchResults = searchResults.tasks.length > 0 || searchResults.users.length > 0 || searchResults.workspaces.length > 0;

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
            console.log('Delete workspace:', workspace.id);
            // TODO: Implement actual deletion logic
            window.location.reload(); // Temporary
        } catch (error) {
            console.error('Failed to delete workspace:', error);
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
            const currentTask = tasks.find(t => t.id === taskId);
            const currentAssignees = currentTask?.assignees || [];
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
            <div className={cn(
                "fixed left-4 top-4 bottom-4 z-40 w-64 rounded-xl transition-all duration-300 hidden md:flex flex-col", // Floating sidebar logic
                "bg-black/40 backdrop-blur-2xl border border-white/5 shadow-2xl", // Premium Glass Styles
                collapsed && "w-20"
            )}>
                <div className="flex flex-col h-full p-4">
                    {/* Header */}
                    <div className="pb-6 px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <span className="text-white font-bold text-lg">H</span>
                            </div>
                            {!collapsed && (
                                <span className="font-bold text-xl text-white tracking-tight">Homebase</span>
                            )}
                        </div>
                    </div>

                    {/* Search - Glass Pill */}
                    {!collapsed && (
                        <div className="pb-6 relative">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4 group-focus-within:text-white transition-colors" />
                                <Input
                                    placeholder="Search..."
                                    className="pl-10 pr-4 bg-white/5 border-white/5 text-white placeholder:text-white/20 focus:bg-white/10 focus:ring-0 rounded-full h-10 transition-all"
                                    value={searchQuery}
                                    onChange={handleSearchInputChange}
                                />
                                {searchQuery && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-white/10 text-white/60 hover:text-white rounded-full"
                                        onClick={clearSearch}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>

                            {/* Search Results Dropdown (Premium) */}
                            {showSearchResults && (
                                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                                    <div className="p-2">
                                        {!hasSearchResults ? (
                                            <div className="text-center py-4">
                                                <Search className="h-6 w-6 text-white/20 mx-auto mb-2" />
                                                <p className="text-xs text-white/40">No results found</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {/* Tasks */}
                                                {searchResults.tasks.length > 0 && (
                                                    <div>
                                                        <h4 className="px-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">Tasks</h4>
                                                        <div className="space-y-1">
                                                            {searchResults.tasks.map(task => (
                                                                <button
                                                                    key={task.id}
                                                                    onClick={() => handleTaskClick(task)}
                                                                    className="w-full text-left p-2 rounded-lg hover:bg-white/10 group transition-colors"
                                                                >
                                                                    <div className="font-medium text-xs text-white/90 group-hover:text-white truncate">
                                                                        {task.title}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-white/10 text-white/50">
                                                                            {task.status.replace('_', ' ')}
                                                                        </Badge>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Users */}
                                                {searchResults.users.length > 0 && (
                                                    <div>
                                                        <h4 className="px-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">People</h4>
                                                        <div className="space-y-1">
                                                            {searchResults.users.map(user => (
                                                                <button
                                                                    key={user.id}
                                                                    onClick={() => handleUserClick(user.id)}
                                                                    className="w-full text-left p-2 rounded-lg hover:bg-white/10 flex items-center gap-2 group transition-colors"
                                                                >
                                                                    <Avatar className="h-5 w-5 border border-white/10">
                                                                        <AvatarFallback className="bg-white/10 text-[10px] text-white">
                                                                            {user.name.charAt(0).toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="text-xs text-white/70 group-hover:text-white truncate">
                                                                        {user.name}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Workspaces */}
                                                {searchResults.workspaces.length > 0 && (
                                                    <div>
                                                        <h4 className="px-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">Workspaces</h4>
                                                        <div className="space-y-1">
                                                            {searchResults.workspaces.map(workspace => (
                                                                <button
                                                                    key={workspace.id}
                                                                    onClick={() => handleWorkspaceClick(workspace.id)}
                                                                    className="w-full text-left p-2 rounded-lg hover:bg-white/10 flex items-center gap-2 group transition-colors"
                                                                >
                                                                    <div
                                                                        className="w-2 h-2 rounded-full"
                                                                        style={{ backgroundColor: workspace.color }}
                                                                    />
                                                                    <span className="text-xs text-white/70 group-hover:text-white truncate">
                                                                        {workspace.name}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full text-xs text-white/40 hover:text-white hover:bg-white/5 h-8 mt-1"
                                                    onClick={handleSeeAllResults}
                                                >
                                                    See all results
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2 space-y-6 no-scrollbar">

                        {/* Navigation - Floating Pills */}
                        <nav className="space-y-1">
                            {navigation.map((item) => {
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                                            isActive
                                                ? "bg-white text-black shadow-lg shadow-white/10"
                                                : "text-white/60 hover:text-white hover:bg-white/5",
                                            collapsed && "justify-center px-0"
                                        )}
                                    >
                                        <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-300", isActive && "scale-110")} />
                                        {!collapsed && <span className="relative z-10">{item.name}</span>}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Education Section (Full) */}
                        {!collapsed && (
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2 px-3">
                                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                                        Education
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-white/30 hover:text-white hover:bg-transparent"
                                        onClick={() => setEducationExpanded(!educationExpanded)}
                                    >
                                        {educationExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    </Button>
                                </div>

                                {educationExpanded && (
                                    <div className="space-y-1">
                                        {educationData.map((item) => {
                                            const Icon = item.icon === 'Zap' ? Zap : item.icon === 'Building2' ? Building2 : Sparkles;
                                            const isActive = location.pathname.startsWith(item.route);
                                            const hasChildren = item.children && item.children.length > 0;
                                            const isAiTools = item.id === 'ai-tools';

                                            return (
                                                <div key={item.id}>
                                                    <div className="flex items-center gap-1">
                                                        <Link
                                                            to={item.route}
                                                            className={cn(
                                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors flex-1",
                                                                isActive
                                                                    ? "bg-white/10 text-white font-medium"
                                                                    : "text-white/50 hover:text-white hover:bg-white/5"
                                                            )}
                                                        >
                                                            <Icon className="h-4 w-4 flex-shrink-0" />
                                                            <span className="truncate">{item.title}</span>
                                                        </Link>
                                                        {hasChildren && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-white/30 hover:text-white hover:bg-white/5 rounded-lg"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    if (isAiTools) setAiToolsExpanded(!aiToolsExpanded);
                                                                }}
                                                            >
                                                                {aiToolsExpanded ? (
                                                                    <ChevronDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ChevronRight className="h-3 w-3" />
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {/* Nested AI Tools */}
                                                    {hasChildren && isAiTools && aiToolsExpanded && (
                                                        <div className="ml-9 mt-1 space-y-1 border-l border-white/10 pl-2">
                                                            {item.children!.map((child) => {
                                                                const ChildIcon = child.icon === 'MessageSquare' ? MessageSquare : child.icon === 'Bot' ? Bot : child.icon === 'Wrench' ? Wrench : Image;
                                                                const isChildActive = location.pathname === child.route;

                                                                return (
                                                                    <Link
                                                                        key={child.id}
                                                                        to={child.route}
                                                                        className={cn(
                                                                            "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors",
                                                                            isChildActive
                                                                                ? "text-white bg-white/5"
                                                                                : "text-white/40 hover:text-white hover:bg-white/5"
                                                                        )}
                                                                    >
                                                                        <ChildIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                                                        <span className="truncate">{child.title}</span>
                                                                    </Link>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Workspaces Section */}
                        {!collapsed && (
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2 px-3">
                                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                                        Workspaces
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 text-white/30 hover:text-white hover:bg-transparent"
                                        onClick={() => setShowCreateWorkspace(true)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-1">
                                    {!loading && workspacesWithCounts.length === 0 ? (
                                        <div className="text-center py-4 border border-dashed border-white/10 rounded-lg mx-2">
                                            <p className="text-xs text-white/30 mb-2">No workspaces yet</p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setShowCreateWorkspace(true)}
                                                className="text-xs bg-white/5 border-white/10 text-white hover:bg-white/10 h-7"
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Create
                                            </Button>
                                        </div>
                                    ) : (
                                        workspacesWithCounts.map((workspace) => (
                                            <div
                                                key={workspace.id}
                                                className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                                            >
                                                <Link
                                                    to={`/workspace/${workspace.id}`}
                                                    className="flex items-center gap-3 flex-1 min-w-0"
                                                >
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white/5"
                                                        style={{ backgroundColor: workspace.color }}
                                                    />
                                                    <span className="text-sm text-white/60 truncate group-hover:text-white transition-colors">
                                                        {workspace.name}
                                                    </span>
                                                </Link>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {workspace.taskCount > 0 && (
                                                        <span className="text-[10px] text-black bg-white/80 px-1.5 py-0.5 rounded-md font-medium">
                                                            {workspace.taskCount}
                                                        </span>
                                                    )}

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-white/40 hover:text-white hover:bg-white/10"
                                                                onClick={(e) => e.preventDefault()}
                                                            >
                                                                <MoreHorizontal className="h-3 w-3" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40 bg-[#1c1c1e] border-white/10 text-white">
                                                            <DropdownMenuItem
                                                                onClick={() => setEditingWorkspace(workspace)}
                                                                className="text-sm focus:bg-white/10 focus:text-white cursor-pointer"
                                                            >
                                                                <Edit className="h-3 w-3 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteWorkspace(workspace)}
                                                                className="text-sm text-red-500 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
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
                    </div>

                    {/* User Profile - Bottom Glass Card */}
                    <div className="mt-auto pt-4 border-t border-white/5">
                        <div className={cn(
                            "flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-white/5 cursor-pointer",
                            collapsed && "justify-center"
                        )}>
                            <div className="relative">
                                <Avatar className="h-9 w-9 ring-2 ring-white/10">
                                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium">
                                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full"></div>
                            </div>

                            {!collapsed && (
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">
                                        {user?.email?.split('@')[0]}
                                    </div>
                                    <div className="text-xs text-white/40 truncate">Pro Plan</div>
                                </div>
                            )}

                            {!collapsed && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {/* Theme Toggle Button (Added for parity) */}
                        {!collapsed && (
                            <div className="flex justify-center mt-2 opacity-0 hover:opacity-100 transition-opacity">
                                <ThemeToggle />
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
