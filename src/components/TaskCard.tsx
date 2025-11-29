import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar as CalendarIcon,
  Clock,
  MessageCircle,
  CheckSquare,
  Flag,
  User,
  MoreHorizontal,
  Edit3,
  Trash2,
  Check
} from 'lucide-react';
import { Task, User as UserType } from '../types';
import { format, isAfter, isBefore, startOfDay, isToday, isTomorrow } from 'date-fns';
import { useTaskContext } from '../contexts/TaskContext';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onAssign?: (taskId: string, userId: string) => void;
  compact?: boolean;
}

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

const isValidDate = (dateInput: string | null | undefined): boolean => {
  if (!dateInput) return false;
  try {
    const date = new Date(dateInput);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

export const TaskCard = ({ task, onClick, onAssign, compact = false }: TaskCardProps) => {
  const { users, updateTask, deleteTask } = useTaskContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState(task.title);
  const [datePickerOpen, setDatePickerOpen] = useState(false); // Track popover state
  const titleInputRef = useRef<HTMLInputElement>(null);

  const assignedUsers = users.filter(u => task.assignees?.includes(u.id));
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;

  const priorityConfig = {
    low: { color: 'bg-green-100 text-green-700 border-green-200', icon: '🔵', label: 'Low' },
    medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🟡', label: 'Medium' },
    high: { color: 'bg-red-100 text-red-700 border-red-200', icon: '🔴', label: 'High' }
  };

  const statusConfig = {
    todo: { color: 'bg-gray-100 text-gray-700', label: 'To Do' },
    in_progress: { color: 'bg-blue-100 text-blue-700', label: 'In Progress' },
    done: { color: 'bg-green-100 text-green-700', label: 'Done' }
  };

  const getDueDateStatus = () => {
    if (!task.due_date || !isValidDate(task.due_date)) return null;

    const dueDate = new Date(task.due_date);
    if (task.status === 'done') return { type: 'completed', color: 'text-green-600' };
    if (isBefore(dueDate, startOfDay(new Date()))) return { type: 'overdue', color: 'text-red-600' };
    if (isToday(dueDate)) return { type: 'today', color: 'text-orange-600' };
    if (isTomorrow(dueDate)) return { type: 'tomorrow', color: 'text-yellow-600' };
    return { type: 'upcoming', color: 'text-gray-600' };
  };

  const dueDateStatus = getDueDateStatus();

  const handleTitleEdit = () => {
    setEditingField('title');
    setIsEditing(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const saveTitleEdit = async () => {
    if (tempTitle.trim() && tempTitle !== task.title) {
      try {
        await updateTask(task.id, { title: tempTitle.trim() });
      } catch (error) {
        console.error('Failed to update task title:', error);
        setTempTitle(task.title); // Revert on error
      }
    }
    setEditingField(null);
    setIsEditing(false);
  };

  const cancelTitleEdit = () => {
    setTempTitle(task.title);
    setEditingField(null);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitleEdit();
    } else if (e.key === 'Escape') {
      cancelTitleEdit();
    }
  };

  // ⚡ OPTIMIZED: Instant date update - no await, close popover immediately
  const updateDueDate = (date: Date | undefined) => {
    try {
      let dueDateString: string | null = null;

      if (date) {
        // 🔧 FIX: Use local date, not UTC (prevents timezone issues)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dueDateString = `${year}-${month}-${day}`;
      }

      // 🚀 Fire update without waiting
      updateTask(task.id, { due_date: dueDateString });

      // ✅ Close popover immediately (don't wait for database)
      setDatePickerOpen(false);

    } catch (error) {
      console.error('Failed to update due date:', error);
    }
  };

  // ⚡ OPTIMIZED: Instant priority update - no await
  const updatePriority = (priority: string) => {
    try {
      // 🚀 Fire update without waiting - optimistic update handles UI
      updateTask(task.id, { priority: priority as 'low' | 'medium' | 'high' });
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  // ⚡ OPTIMIZED: Instant status update - no await
  const updateStatus = (status: string) => {
    try {
      // 🚀 Fire update without waiting - optimistic update handles UI
      updateTask(task.id, { status: status as 'todo' | 'in_progress' | 'done' });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(task.id);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  return (
    <Card className="group cursor-pointer hover:shadow-md transition-all duration-200 border hover:border-gray-300">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title Row */}
          <div className="flex items-center gap-2">
            {editingField === 'title' ? (
              <input
                ref={titleInputRef}
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={saveTitleEdit}
                onKeyDown={handleKeyPress}
                className="flex-1 font-medium text-gray-900 bg-transparent border-0 outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
              />
            ) : (
              <h3
                className="flex-1 font-medium text-gray-900 leading-tight hover:text-blue-600 transition-colors"
                onClick={onClick}
                onDoubleClick={handleTitleEdit}
                title="Double-click to edit title"
              >
                {task.title}
              </h3>
            )}

            {/* Actions Menu */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="end">
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleTitleEdit}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-red-600" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2" onClick={onClick}>
              {task.description}
            </p>
          )}

          {/* Properties Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Badge - Clickable */}
            <Popover>
              <PopoverTrigger asChild>
                <Badge
                  className={`${statusConfig[task.status].color} cursor-pointer hover:opacity-80 transition-opacity text-xs`}
                  variant="outline"
                >
                  {statusConfig[task.status].label}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start">
                <div className="space-y-1">
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <Button
                      key={status}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => updateStatus(status)}
                    >
                      <span className={`w-3 h-3 rounded-full mr-2 ${config.color.split(' ')[0]}`} />
                      {config.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Priority Badge - Clickable */}
            <Popover>
              <PopoverTrigger asChild>
                <Badge
                  className={`${priorityConfig[task.priority].color} cursor-pointer hover:opacity-80 transition-opacity text-xs border flex items-center gap-1`}
                >
                  <Flag className="h-3 w-3" />
                  {priorityConfig[task.priority].label}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start">
                <div className="space-y-1">
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
                </div>
              </PopoverContent>
            </Popover>

            {/* Due Date - Clickable with instant close */}
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${dueDateStatus?.color || 'text-gray-500'}`}>
                  <CalendarIcon className="h-3 w-3" />
                  {task.due_date && isValidDate(task.due_date) ? (
                    <span>
                      {safeFormatDate(task.due_date, 'MMM d')}
                      {dueDateStatus?.type === 'overdue' && <span className="ml-1 font-medium">Overdue</span>}
                      {dueDateStatus?.type === 'today' && <span className="ml-1 font-medium">Today</span>}
                      {dueDateStatus?.type === 'tomorrow' && <span className="ml-1 font-medium">Tomorrow</span>}
                    </span>
                  ) : (
                    <span className="text-gray-400">Add due date</span>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                  <Calendar
                    mode="single"
                    selected={task.due_date ? new Date(task.due_date) : undefined}
                    onSelect={updateDueDate} // No await needed - instant!
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

          {/* Tags Row */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.slice(0, 4).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 4 && (
                <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                  +{task.tags.length - 4} more
                </Badge>
              )}
            </div>
          )}

          {/* Bottom Row - Assignees, Subtasks, Comments */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Assignees - Always clickable */}
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    {assignedUsers.length > 0 ? (
                      <div className="flex -space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
                        {assignedUsers.slice(0, 3).map((user, index) => (
                          <Avatar key={user.id} className="h-6 w-6 border-2 border-white">
                            <AvatarFallback className="text-xs bg-blue-500 text-white">
                              {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {assignedUsers.length > 3 && (
                          <div className="h-6 w-6 bg-gray-200 border-2 border-white rounded-full flex items-center justify-center">
                            <span className="text-xs text-gray-600">+{assignedUsers.length - 3}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400"
                      >
                        <User className="h-3 w-3 text-gray-400" />
                      </Button>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 px-2 py-1">Assign to:</div>
                      {users.map(user => {
                        const isAssigned = task.assignees?.includes(user.id);
                        return (
                          <Button
                            key={user.id}
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start",
                              isAssigned && "bg-blue-50 hover:bg-blue-100"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newAssignees = isAssigned
                                ? task.assignees.filter(id => id !== user.id)
                                : [...(task.assignees || []), user.id];
                              updateTask(task.id, { assignees: newAssignees });
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">
                                  {user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="flex-1 text-left">{user.name}</span>
                              {isAssigned && <Check className="h-4 w-4 text-blue-600" />}
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Subtasks Counter */}
              {task.subtasks.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  <CheckSquare className="h-3 w-3" />
                  <span className={completedSubtasks === task.subtasks.length ? 'text-green-600 font-medium' : ''}>
                    {completedSubtasks}/{task.subtasks.length}
                  </span>
                </div>
              )}

              {/* Comments Counter */}
              {task.comments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  <MessageCircle className="h-3 w-3" />
                  {task.comments.length}
                </div>
              )}
            </div>

            {/* Updated Date */}
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {safeFormatDate(task.updated_at, 'MMM d')}
            </div>
          </div>
        </div>

        {/* Hover Actions Overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-6 w-6 p-0 bg-white shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleTitleEdit();
              }}
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
