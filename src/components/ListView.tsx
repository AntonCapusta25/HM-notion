
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar, Trash2, Check, X } from 'lucide-react';
import { Task, User as UserType } from '../types';
import { format } from 'date-fns';
import { QuickAssignTask } from './QuickAssignTask';

interface ListViewProps {
  tasks: Task[];
  users: UserType[];
  onCreateTask: (taskData: any) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAssignTask: (taskId: string, userId: string) => void;
}

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
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'todo' as 'todo' | 'in_progress' | 'done',
    dueDate: ''
  });

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
    
    onCreateTask({
      title: newTask.title,
      description: '',
      priority: newTask.priority,
      status: newTask.status,
      dueDate: newTask.dueDate || undefined,
      tags: []
    });

    setNewTask({
      title: '',
      priority: 'medium',
      status: 'todo',
      dueDate: ''
    });
    setIsAddingTask(false);
  };

  const handleStatusChange = (taskId: string, status: string) => {
    onUpdateTask(taskId, { status: status as 'todo' | 'in_progress' | 'done' });
  };

  const handlePriorityChange = (taskId: string, priority: string) => {
    onUpdateTask(taskId, { priority: priority as 'low' | 'medium' | 'high' });
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
              <TableHead className="w-[100px]">Assignee</TableHead>
              <TableHead className="w-[120px]">Due Date</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAddingTask && (
              <TableRow className="bg-blue-50">
                <TableCell>
                  <Input
                    placeholder="Enter task title..."
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
                    autoFocus
                  />
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
                  <QuickAssignTask
                    users={users}
                    onAssign={() => {}} // Will be assigned after creation
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
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
            
            {tasks.map((task) => {
              const assignedUser = users.find(u => u.id === task.assignedTo);
              
              return (
                <TableRow key={task.id} className="hover:bg-gray-50">
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
                    <QuickAssignTask
                      currentAssigneeId={task.assignedTo}
                      users={users}
                      onAssign={(userId) => onAssignTask(task.id, userId)}
                    />
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.dueDate), 'MMM d')}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No date</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => onDeleteTask(task.id)}
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
        
        {tasks.length === 0 && !isAddingTask && (
          <div className="text-center py-8 text-gray-500">
            <p>No tasks yet. Click "Add Task" to get started!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
