import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, UserPlus, X, MessageCircle, CheckSquare, Square, Plus } from 'lucide-react';
import { Task, User as UserType } from '../types';
import { format } from 'date-fns';

interface TaskDetailDialogProps {
  task: Task | null;
  users: UserType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddComment: (taskId: string, content: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

// FIXED: Safe date formatting utilities
const safeFormatDate = (dateInput: string | null | undefined, formatStr: string = 'MMM d, yyyy'): string => {
  if (!dateInput) return 'No date';
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date in TaskDetailDialog:', dateInput);
      return 'Invalid date';
    }
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date in TaskDetailDialog:', error, 'Input:', dateInput);
    return 'Invalid date';
  }
};

const isValidDate = (dateInput: string | null | undefined): boolean => {
  if (!dateInput) return false;
  try {
    const date = new Date(dateInput);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

export const TaskDetailDialog = ({ 
  task, 
  users, 
  open, 
  onOpenChange, 
  onUpdateTask, 
  onAddComment, 
  onToggleSubtask 
}: TaskDetailDialogProps) => {
  // ====================================================================
  // === FIX: All hooks are now moved to the top of the component ======
  // ====================================================================
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  const assignedUsers = useMemo(() => {
    if (!task) return [];
    return users.filter(u => task.assignees?.includes(u.id));
  }, [users, task]);
  
  const unassignedUsers = useMemo(() => {
    if (!task) return [];
    return users.filter(u => !task.assignees?.includes(u.id));
  }, [users, task]);
  
  // Now that hooks are done, we can have early returns.
  if (!task) {
    return null;
  }

  const createdByUser = users.find(u => u.id === task.createdBy);

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(task.id, newComment);
      setNewComment('');
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      const newSubtaskObj = {
        id: Math.random().toString(36).substr(2, 9),
        title: newSubtask,
        completed: false
      };
      onUpdateTask(task.id, {
        subtasks: [...(task.subtasks || []), newSubtaskObj]
      });
      setNewSubtask('');
    }
  };

  const handleAddAssignee = (userId: string) => {
    const newAssignees = [...(task.assignees || []), userId];
    onUpdateTask(task.id, { assignees: newAssignees });
  };
  
  const handleRemoveAssignee = (userId: string) => {
    const newAssignees = (task.assignees || []).filter(id => id !== userId);
    onUpdateTask(task.id, { assignees: newAssignees });
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800'
  };
  
  const subtasks = task.subtasks || [];
  const comments = task.comments || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold pr-8">{task.title}</DialogTitle>
          <DialogDescription>
            Manage task details, subtasks, and comments.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg-col-span-2 space-y-6">
            <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
                </div>

                {/* Subtasks */}
                <div>
                  <h3 className="font-medium mb-3">Subtasks ({subtasks.filter(st => st.completed).length}/{subtasks.length})</h3>
                  <div className="space-y-2">
                    {subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleSubtask(task.id, subtask.id)}
                          className="text-homemade-orange hover:text-homemade-orange-dark"
                        >
                          {subtask.completed ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </button>
                        <span className={subtask.completed ? 'line-through text-gray-500' : ''}>{subtask.title}</span>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="Add a subtask..."
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                      />
                      <Button size="sm" onClick={handleAddSubtask}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <h3 className="font-medium mb-3">Comments ({comments.length})</h3>
                  <div className="space-y-4">
                    {comments.map(comment => {
                      const author = users.find(u => u.id === comment.author);
                      return (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gray-200 text-xs">
                              {author ? author.name.charAt(0) : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{author?.name || 'Unknown User'}</span>
                              {/* FIXED: Safe comment date formatting */}
                              <span className="text-xs text-gray-500">
                                {isValidDate(comment.createdAt) 
                                  ? safeFormatDate(comment.createdAt, 'MMM d, yyyy at h:mm a')
                                  : 'No date'
                                }
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={2}
                      />
                      <Button onClick={handleAddComment} className="bg-homemade-orange hover:bg-homemade-orange-dark">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Status</h3>
              <Badge className={statusColors[task.status]}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>

            <div>
              <h3 className="font-medium mb-2">Priority</h3>
              <Badge className={priorityColors[task.priority]}>
                {task.priority}
              </Badge>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Assignees</h3>
              <div className="space-y-2">
                {assignedUsers.map(user => (
                   <div key={user.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                         <Avatar className="h-6 w-6">
                           <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                         </Avatar>
                         <span className="text-sm">{user.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveAssignee(user.id)}>
                         <X className="h-3 w-3"/>
                      </Button>
                   </div>
                ))}
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal text-gray-500">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add assignee...
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0">
                      <div className="p-1">
                        {unassignedUsers.map(user => (
                          <div 
                            key={user.id}
                            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                            onClick={() => handleAddAssignee(user.id)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user.name}</span>
                          </div>
                        ))}
                         {unassignedUsers.length === 0 && (
                           <p className="p-4 text-center text-sm text-gray-500">All users assigned.</p>
                         )}
                      </div>
                    </PopoverContent>
                 </Popover>
              </div>
            </div>

            {/* FIXED: Safe due date display */}
            {task.dueDate && isValidDate(task.dueDate) && (
              <div>
                <h3 className="font-medium mb-2">Due Date</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {safeFormatDate(task.dueDate, 'MMM d, yyyy')}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {(task.tags || []).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* FIXED: Safe created/updated date display */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>Created by {createdByUser?.name || 'Unknown'}</div>
              <div>
                {isValidDate(task.createdAt) 
                  ? `Created ${safeFormatDate(task.createdAt, 'MMM d, yyyy')}`
                  : 'Created date unknown'
                }
              </div>
              <div>
                {isValidDate(task.updatedAt) 
                  ? `Updated ${safeFormatDate(task.updatedAt, 'MMM d, yyyy')}`
                  : 'Updated date unknown'
                }
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
