import { useState, useMemo } from 'react';
import { Search, User, Calendar, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useTaskContext } from '../contexts/TaskContext'; // CHANGED: from useTaskStore
import { TaskCard } from './TaskCard';
import { TaskDetailDialog } from './TaskDetailDialog'; // ADDED: for viewing task details
import { Task } from '../types';

export const SearchResults = () => {
  // CHANGED: Switched to the real-time context
  const { 
    tasks, 
    users, 
    workspaces,
    updateTask,
    addComment,
    toggleSubtask
  } = useTaskContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { tasks: [], users: [], workspaces: [] };

    const query = searchQuery.toLowerCase();
    
    const filteredTasks = tasks.filter(task =>
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query)) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(query))) // FIXED: Added check for tags
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
      tasks: filteredTasks,
      users: filteredUsers,
      workspaces: filteredWorkspaces
    };
  }, [searchQuery, tasks, users, workspaces]);

  const hasResults = searchResults.tasks.length > 0 || searchResults.users.length > 0 || searchResults.workspaces.length > 0;

  const handleAssignTask = async (taskId: string, userId: string) => {
    try {
      await updateTask(taskId, { assignedTo: userId });
    } catch (err) {
      console.error('Failed to assign task:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Search</h1>
        <p className="text-gray-600 mt-1">Find tasks, users, and workspaces across your entire Homemade platform.</p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input 
          placeholder="Search everything..." 
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Results */}
      {searchQuery.trim() && (
        <div className="space-y-6">
          {!hasResults ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600">Try adjusting your search terms.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Tasks Results */}
              {searchResults.tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Tasks ({searchResults.tasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {searchResults.tasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task}
                        onClick={() => setSelectedTask(task)}
                        onAssign={handleAssignTask}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Users Results */}
              {searchResults.users.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Users ({searchResults.users.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {searchResults.users.map(user => (
                      <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-homemade-orange text-white">
                            {user.avatar || user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium">{user.name}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          {user.department && (
                            <Badge variant="outline" className="mt-1">
                              {user.department}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Workspaces Results */}
              {searchResults.workspaces.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Workspaces ({searchResults.workspaces.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {searchResults.workspaces.map(workspace => (
                      <div key={workspace.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: workspace.color }}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{workspace.name}</h4>
                          <p className="text-sm text-gray-600">{workspace.department}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ADDED: Task Detail Dialog to view selected tasks */}
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
