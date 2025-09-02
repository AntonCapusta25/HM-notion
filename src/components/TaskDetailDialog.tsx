import { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Calendar as CalendarIcon, 
  UserPlus, 
  X, 
  MessageCircle, 
  CheckSquare, 
  Square, 
  Plus,
  Flag,
  Edit3,
  Send,
  User,
  Clock,
  Tag,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Task, User as UserType } from '../types';
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import { useTaskContext } from '../contexts/TaskContext';
import { supabase } from '../lib/supabase';

interface TaskDetailDialogProps {
  task: Task | null;
  users: UserType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddComment: (taskId: string, content: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

const safeFormatDate = (dateInput: string | null | undefined, formatStr: string = 'MMM d, yyyy'): string => {
  if (!dateInput) return 'No date';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Invalid date';
    return format(date, formatStr);
  } catch (error) {
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
  task: initialTask, 
  users, 
  open, 
  onOpenChange, 
  onUpdateTask, 
  onAddComment, 
  onToggleSubtask 
}: TaskDetailDialogProps) => {
  const { refreshTasks, tasks } = useTaskContext();
  const [currentTaskData, setCurrentTaskData] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Get current task data - prioritize direct fetch data, then context, then initial
  const task = currentTaskData || (initialTask ? tasks.find(t => t.id === initialTask.id) : null) || initialTask;

  const assignedUsers = useMemo(() => {
    if (!task) return [];
    return users.filter(u => task.assignees?.includes(u.id));
  }, [users, task]);
  
  const unassignedUsers = useMemo(() => {
    if (!task) return [];
    return users.filter(u => !task.assignees?.includes(u.id));
  }, [users, task]);

  // Direct database fetch to get fresh task data
  const forceRefreshTaskData = async () => {
    if (!initialTask?.id) return;
    
    setIsRefreshing(true);
    console.log('🔄 TaskDetailDialog - Direct database fetch for task:', initialTask.id);
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          comments(*),
          subtasks(*),
          task_tags(tag),
          task_assignees(user_id)
        `)
        .eq('id', initialTask.id)
        .single();
        
      if (error) {
        console.error('❌ Direct fetch error:', error);
        return;
      }
      
      if (data) {
        console.log('✅ Fresh task data fetched:', data);
        
        // Format the data to match your Task interface
        const formattedTask: Task = {
          id: data.id,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date,
          workspace_id: data.workspace_id,
          created_by: data.created_by,
          created_at: data.created_at,
          updated_at: data.updated_at,
          assignees: data.task_assignees?.map(ta => ta.user_id) || [],
          tags: data.task_tags?.map(tt => tt.tag) || [],
          comments: data.comments || [],
          subtasks: data.subtasks || []
        };
        
        console.log('📝 Formatted fresh task:', formattedTask);
        setCurrentTaskData(formattedTask);
      }
    } catch (err) {
      console.error('❌ Direct fetch failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Manual refresh function for the dialog
  const handleRefreshDialog = async () => {
    console.log('🔄 TaskDetailDialog - Manual refresh triggered');
    await forceRefreshTaskData();
  };

  // Auto-refresh when dialog opens or task ID changes
  useEffect(() => {
    if (open && initialTask?.id) {
      console.log('🔄 Dialog opened - fetching fresh task data');
      forceRefreshTaskData();
    }
  }, [open, initialTask?.id]);

  // Update temp values when task data changes
  useEffect(() => {
    if (task) {
      setTempTitle(task.title);
      setTempDescription(task.description || '');
    }
  }, [task]);

  if (!task) return null;

  const createdByUser = users.find(u => u.id === task.created_by);

  const priorityConfig = {
    low: { color: 'bg-green-100 text-green-700 border-green-300', icon: '🟢', label: 'Low' },
    medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: '🟡', label: 'Medium' },
    high: { color: 'bg-red-100 text-red-700 border-red-300', icon: '🔴', label: 'High' }
  };

  const statusConfig = {
    todo: { color: 'bg-gray-100 text-gray-700 border-gray-300', label: 'To Do' },
    in_progress: { color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'In Progress' },
    done: { color: 'bg-green-100 text-green-700 border-green-300', label: 'Done' }
  };

  const getDueDateDisplay = () => {
    if (!task.due_date || !isValidDate(task.due_date)) return null;
    
    const dueDate = new Date(task.due_date);
    if (task.status === 'done') return { text: safeFormatDate(task.due_date, 'MMM d'), color: 'text-green-600', bg: 'bg-green-50' };
    if (isPast(dueDate) && !isToday(dueDate)) return { text: `${safeFormatDate(task.due_date, 'MMM d')} (Overdue)`, color: 'text-red-600', bg: 'bg-red-50' };
    if (isToday(dueDate)) return { text: `${safeFormatDate(task.due_date, 'MMM d')} (Today)`, color: 'text-orange-600', bg: 'bg-orange-50' };
    if (isTomorrow(dueDate)) return { text: `${safeFormatDate(task.due_date, 'MMM d')} (Tomorrow)`, color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { text: safeFormatDate(task.due_date, 'MMM d'), color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  const dueDateDisplay = getDueDateDisplay();

  const handleTitleEdit = () => {
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const saveTitleEdit = async () => {
    if (tempTitle.trim() && tempTitle !== task.title) {
      await onUpdateTask(task.id, { title: tempTitle.trim() });
    }
    setEditingTitle(false);
  };

  const handleDescriptionEdit = () => {
    setEditingDescription(true);
    setTimeout(() => descriptionRef.current?.focus(), 0);
  };

  const saveDescriptionEdit = async () => {
    if (tempDescription !== task.description) {
      await onUpdateTask(task.id, { description: tempDescription });
    }
    setEditingDescription(false);
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(task.id, newComment.trim());
      setNewComment('');
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      const newSubtaskObj = {
        id: Math.random().toString(36).substr(2, 9),
        title: newSubtask.trim(),
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

  const updateDueDate = async (date: Date | undefined) => {
    const dueDateString = date ? date.toISOString().split('T')[0] : null;
    await onUpdateTask(task.id, { due_date: dueDateString });
  };

  const updatePriority = async (priority: string) => {
    await onUpdateTask(task.id, { priority: priority as 'low' | 'medium' | 'high' });
  };

  const updateStatus = async (status: string) => {
    await onUpdateTask(task.id, { status: status as 'todo' | 'in_progress' | 'done' });
  };

  const subtasks = task.subtasks || [];
  const comments = task.comments || [];
  const completedSubtasks = subtasks.filter(st => st.completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              {/* Status Indicator */}
              <div className={`w-3 h-3 rounded-full ${
                task.status === 'todo' ? 'bg-gray-400' :
                task.status === 'in_progress' ? 'bg-blue-500' : 'bg-green-500'
              }`} />
              
              {/* Editable Title */}
              <div className="flex-1">
                {editingTitle ? (
                  <input
                    ref={titleInputRef}
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={saveTitleEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitleEdit();
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                    className="text-xl font-semibold bg-transparent border-0 outline-none focus:ring-2 focus:ring-blue-500 rounded w-full"
                  />
                ) : (
                  <h2 
                    className="text-xl font-semibold hover:text-blue-600 cursor-pointer transition-colors"
                    onClick={handleTitleEdit}
                    title="Click to edit title"
                  >
                    {task.title}
                  </h2>
                )}
              </div>

              {/* Task ID and Refresh Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshDialog}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0"
                  title="Refresh task data"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Badge variant="outline" className="text-xs font-mono">
                  #{task.id.slice(-6)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Main Content */}
              <div className="lg:col-span-2 p-6 space-y-6">
                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Description</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleDescriptionEdit}
                      className="h-6 w-6 p-0"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {editingDescription ? (
                    <div className="space-y-2">
                      <Textarea
                        ref={descriptionRef}
                        value={tempDescription}
                        onChange={(e) => setTempDescription(e.target.value)}
                        placeholder="Add a description..."
                        rows={4}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveDescriptionEdit} className="bg-blue-600 hover:bg-blue-700">
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingDescription(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="min-h-[80px] p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={handleDescriptionEdit}
                    >
                      {task.description ? (
                        <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                      ) : (
                        <p className="text-gray-400 italic">Click to add description...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtasks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      Subtasks ({completedSubtasks}/{subtasks.length})
                    </h3>
                    {subtasks.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {Math.round((completedSubtasks / subtasks.length) * 100)}% complete
                      </div>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  {subtasks.length > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    {subtasks.map(subtask => (
                      <div key={subtask.id} className="group flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                        <button
                          onClick={() => onToggleSubtask(task.id, subtask.id)}
                          className="flex-shrink-0 hover:scale-110 transition-transform"
                        >
                          {subtask.completed ? (
                            <CheckSquare className="h-5 w-5 text-green-500" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                        <span className={`flex-1 ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                          {subtask.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const newSubtasks = subtasks.filter(st => st.id !== subtask.id);
                            onUpdateTask(task.id, { subtasks: newSubtasks });
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Add Subtask */}
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="Add a subtask..."
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleAddSubtask} disabled={!newSubtask.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Comments ({comments.length})
                  </h3>
                  
                  <div className="space-y-4">
                    {comments.map(comment => {
                      const author = users.find(u => u.id === comment.author);
                      return (
                        <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="bg-blue-500 text-white text-xs">
                              {author ? author.name.charAt(0).toUpperCase() : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-gray-900">
                                {author?.name || 'Unknown User'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {isValidDate(comment.created_at) 
                                  ? safeFormatDate(comment.created_at, 'MMM d, h:mm a')
                                  : 'No date'
                                }
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Add Comment */}
                    <div className="flex gap-2">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-gray-400 text-white text-xs">
                          You
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={2}
                          className="resize-none"
                        />
                        <Button 
                          size="sm" 
                          onClick={handleAddComment} 
                          disabled={!newComment.trim()}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Properties Sidebar */}
              <div className="lg:col-span-1 bg-gray-50 p-6 space-y-6 border-l">
                {/* Status */}
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Status
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <div className={`w-3 h-3 rounded-full mr-2 ${statusConfig[task.status].color.split(' ')[0]}`} />
                        {statusConfig[task.status].label}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="start">
                      {Object.entries(statusConfig).map(([status, config]) => (
                        <Button
                          key={status}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => updateStatus(status)}
                        >
                          <div className={`w-3 h-3 rounded-full mr-2 ${config.color.split(' ')[0]}`} />
                          {config.label}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Priority */}
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Priority
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Flag className={`h-4 w-4 mr-2 ${
                          task.priority === 'high' ? 'text-red-500' :
                          task.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'
                        }`} />
                        {priorityConfig[task.priority].label}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1" align="start">
                      {Object.entries(priorityConfig).map(([priority, config]) => (
                        <Button
                          key={priority}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => updatePriority(priority)}
                        >
                          <Flag className="h-4 w-4 mr-2" />
                          {config.label}
                        </Button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Due Date */}
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Due Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {dueDateDisplay ? (
                          <span className={dueDateDisplay.color}>{dueDateDisplay.text}</span>
                        ) : (
                          <span className="text-gray-400">Set due date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3">
                        <Calendar
                          mode="single"
                          selected={task.due_date ? new Date(task.due_date) : undefined}
                          onSelect={updateDueDate}
                          initialFocus
                        />
                        {task.due_date && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => updateDueDate(undefined)}
                          >
                            Remove due date
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Assignees */}
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Assignees
                  </Label>
                  <div className="space-y-2">
                    {assignedUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between group bg-white rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-blue-500 text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{user.name}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveAssignee(user.id)}
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full justify-start text-gray-500 border-dashed"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add assignee
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-1" align="start">
                        {unassignedUsers.map(user => (
                          <div 
                            key={user.id}
                            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                            onClick={() => handleAddAssignee(user.id)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-blue-500 text-white">
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user.name}</span>
                          </div>
                        ))}
                        {unassignedUsers.length === 0 && (
                          <p className="p-4 text-center text-sm text-gray-500">All users assigned</p>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                      Tags
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-700">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta Info */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>Created by {createdByUser?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        Created {isValidDate(task.created_at) 
                          ? safeFormatDate(task.created_at, 'MMM d, yyyy')
                          : 'unknown date'
                        }
                      </span>
                    </div>
                    {task.updated_at && task.updated_at !== task.created_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          Updated {isValidDate(task.updated_at) 
                            ? safeFormatDate(task.updated_at, 'MMM d, yyyy')
                            : 'unknown date'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper component for consistent labeling
const Label = ({ children, className = '', ...props }: any) => (
  <label className={`text-sm font-medium ${className}`} {...props}>
    {children}
  </label>
);
