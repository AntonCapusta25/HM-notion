import { useState, useOptimistic } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Calendar, Trash2, Check, X, Users, Edit2 } from 'lucide-react';
import { Task, User as UserType } from '../types';
import { format } from 'date-fns';

interface ListViewProps {
  tasks: Task[];
  users: UserType[];
  onCreateTask: (taskData: any) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAssignTask: (taskId: string, userIds: string[]) => void;
}

// Safe date formatting utility
const safeFormatDate = (dateInput: string | null | undefined, formatStr: string = 'MMM d'): string => {
  if (!dateInput) return 'No date';
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return format(date, formatStr);
  } catch (error) {
    return 'Invalid date';
  }
};

// Component for managing task assignees with optimistic updates
const AssigneeManager = ({ 
  taskId, 
  currentAssignees, 
  users, 
  onAssign 
}: { 
  taskId: string;
  currentAssignees: string[];
  users: UserType[];
  onAssign: (taskId: string, userIds: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [optimisticAssignees, setOptimisticAssignees] = useOptimistic(
    currentAssignees,
    (state, newAssignees: string[]) => newAssignees
  );

  const assignedUsers = users.filter(u => optimisticAssignees?.includes(u.id));
  const unassignedUsers = users.filter(u => !optimisticAssignees?.includes(u.id));

  const handleAssignUser = async (userId: string) => {
    const newAssignees = [...(optimisticAssignees || []), userId];
    setOptimisticAssignees(newAssignees);
    onAssign(taskId, newAssignees);
  };

  const handleUnassignUser = async (userId: string) => {
    const newAssignees = (optimisticAssignees || []).filter(id => id !== userId);
    setOptimisticAssignees(newAssignees);
    onAssign(taskId, newAssignees);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Users className="h-3 w-3 mr-1" />
          {assignedUsers.length > 0 ? `${assignedUsers.length} assigned` : 'Assign'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandEmpty>No users found.</CommandEmpty>
          
          {assignedUsers.length > 0 && (
            <CommandGroup heading="Assigned">
              {assignedUsers.map(user => (
                <CommandItem
                  key={user.id}
                  className="flex items-center justify-between cursor-pointer"
                  onSelect={() => handleUnassignUser(user.id)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name}</span>
                    <Badge variant="outline" className="text-xs">{user.department}</Badge>
                  </div>
                  <X className="h-3 w-3 text-red-500" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
          {unassignedUsers.length > 0 && (
            <CommandGroup heading="Available">
              {unassignedUsers.map(user => (
                <CommandItem
                  key={user.id}
                  className="flex items-center justify-between cursor-pointer"
                  onSelect={() => handleAssignUser(user.id)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name}</span>
                    <Badge variant="outline" className="text-xs">{user.department}</Badge>
                  </div>
                  <Plus className="h-3 w-3 text-green-500" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Inline date editor component with optimistic updates
const InlineDateEditor = ({ 
  taskId, 
  currentDate, 
  onUpdate 
}: { 
  taskId: string;
  currentDate: string | null;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [dateValue, setDateValue] = useState(currentDate || '');
  const [optimisticDate, setOptimisticDate] = useOptimistic(
    currentDate,
    (state, newDate: string | null) => newDate
  );

  const handleSave = () => {
    const newDate = dateValue || null;
    setOptimisticDate(newDate);
    onUpdate(taskId, { due_date: newDate });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDateValue(optimisticDate || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          className="h-7 text-xs"
          autoFocus
        />
        <Button size="sm" variant="ghost" onClick={handleSave} className="h-6 w-6 p-0">
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-6 w-6 p-0">
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-1"
      onClick={() => setIsEditing(true)}
    >
      <Calendar className="h-3 w-3" />
      <span className="text-sm">
        {optimisticDate ? safeFormatDate(optimisticDate, 'MMM d') : 'Set date'}
      </span>
      <Edit2 className="h-3 w-3 text-gray-400" />
    </div>
  );
};

export const ListView = ({ 
  tasks, 
  users, 
  onCreateTask, 
  onUpdateTask, 
  onDeleteTask,
  onAssignTask
}: ListViewProps) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'todo' as 'todo' | 'in_progress' | 'done',
    due_date: ''
  });

  // Optimistic state for all tasks
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    tasks,
    (state, action: { type: string; taskId?: string; updates?: any; newTask?: Task }) => {
      switch (action.type) {
        case 'update':
          return state.map(task => 
            task.id === action.taskId 
              ? { ...task, ...action.updates }
              : task
          );
        case 'delete':
          return state.filter(task => task.id !== action.taskId);
        case 'create':
          return [...state, action.newTask!];
        default:
          return state;
      }
    }
  );

  const priorityColors = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-red-100 text-red-800 border-red-200'
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800'
  };

  const handleCreateTask = () => {
    if (!newTask.title.trim()) return;
    
    const taskData = {
      id: `temp-${Date.now()}`, // Temporary ID for optimistic update
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      priority: newTask.priority,
      status: newTask.status,
      due_date: newTask.due_date || null,
      assignees: [],
      created_at: new Date().toISOString()
    };

    // Optimistic update
    setOptimisticTasks({ type: 'create', newTask: taskData as Task });
    
    // Actual API call
    onCreateTask({
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      priority: newTask.priority,
      status: newTask.status,
      due_date: newTask.due_date || null
    });

    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      due_date: ''
    });
    setIsAddingTask(false);
  };

  const handleStatusChange = (taskId: string, status: string) => {
    // Optimistic update
    setOptimisticTasks({ 
      type: 'update', 
      taskId, 
      updates: { status: status as 'todo' | 'in_progress' | 'done' }
    });
    
    // Actual API call
    onUpdateTask(taskId, { status: status as 'todo' | 'in_progress' | 'done' });
  };

  const handlePriorityChange = (taskId: string, priority: string) => {
    // Optimistic update
    setOptimisticTasks({ 
      type: 'update', 
      taskId, 
      updates: { priority: priority as 'low' | 'medium' | 'high' }
    });
    
    // Actual API call
    onUpdateTask(taskId, { priority: priority as 'low' | 'medium' | 'high' });
  };

  const handleDelete = (taskId: string) => {
    // Optimistic update
    setOptimisticTasks({ type: 'delete', taskId });
    
    // Actual API call
    onDeleteTask(taskId);
  };

  const handleAssign = (taskId: string, userIds: string[]) => {
    // Optimistic update
    setOptimisticTasks({ 
      type: 'update', 
      taskId, 
      updates: { assignees: userIds }
    });
    
    // Actual API call
    onAssignTask(taskId, userIds);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Tasks List</CardTitle>
          <Button 
            onClick={() => setIsAddingTask(true)} 
            className="bg-homemade-orange hover:bg-homemade-orange-dark"
            disabled={isAddingTask}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Task</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[120px]">Priority</TableHead>
              <TableHead className="w-[150px]">Assignees</TableHead>
              <TableHead className="w-[140px]">Due Date</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAddingTask && (
              <TableRow className="bg-blue-50">
                <TableCell>
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter task title..."
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateTask()}
                      autoFocus
                    />
                    <Input
                      placeholder="Enter task description (optional)..."
                      value={newTask.description}
                      onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Select 
                    value={newTask.status} 
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select 
                    value={newTask.priority} 
                    onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-500">Assign after creation</span>
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={handleCreateTask}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsAddingTask(false)}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            
            {optimisticTasks.map((task) => {
              const taskAssignees = task.assignees || [];
              const assignedUsers = users.filter(u => taskAssignees.includes(u.id));
              
              return (
                <TableRow 
                  key={task.id} 
                  className={`hover:bg-gray-50 transition-opacity ${
                    task.id.startsWith('temp-') ? 'opacity-70' : ''
                  }`}
                >
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium text-gray-900">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={task.status} 
                      onValueChange={(value) => handleStatusChange(task.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          <Badge className={statusColors[task.status]}>
                            {task.status === 'todo' ? 'To Do' : 
                             task.status === 'in_progress' ? 'In Progress' : 'Done'}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={task.priority} 
                      onValueChange={(value) => handlePriorityChange(task.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          <Badge className={`${priorityColors[task.priority]} text-xs border`}>
                            {task.priority}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {assignedUsers.slice(0, 3).map(user => (
                          <Avatar key={user.id} className="h-6 w-6 border-2 border-white">
                            <AvatarFallback className="text-xs bg-blue-100">
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {assignedUsers.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-gray-600">+{assignedUsers.length - 3}</span>
                          </div>
                        )}
                      </div>
                      <AssigneeManager
                        taskId={task.id}
                        currentAssignees={taskAssignees}
                        users={users}
                        onAssign={handleAssign}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <InlineDateEditor
                      taskId={task.id}
                      currentDate={task.due_date}
                      onUpdate={onUpdateTask}
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDelete(task.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {optimisticTasks.length === 0 && !isAddingTask && (
          <div className="text-center py-8 text-gray-500">
            <p>No tasks yet. Click "Add Task" to get started!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
