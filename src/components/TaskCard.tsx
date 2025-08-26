
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, MessageCircle, CheckSquare } from 'lucide-react';
import { Task, User as UserType } from '../types';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { QuickAssignTask } from './QuickAssignTask';
import { mockUsers } from '../data/mockData';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onAssign?: (taskId: string, userId: string) => void;
}

export const TaskCard = ({ task, onClick, onAssign }: TaskCardProps) => {
  const assignedUser = mockUsers.find(u => u.id === task.assignedTo);
  
  const priorityColors = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-red-100 text-red-800 border-red-200'
  };

  const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), startOfDay(new Date())) && task.status !== 'done';
  const isDueToday = task.dueDate && format(new Date(task.dueDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;

  const handleAssign = (userId: string) => {
    if (onAssign) {
      onAssign(task.id, userId);
    }
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-homemade-orange">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with title and quick assign */}
          <div className="flex items-start justify-between gap-2">
            <h3 
              className="font-medium text-gray-900 leading-snug flex-1 hover:text-homemade-orange transition-colors"
              onClick={onClick}
            >
              {task.title}
            </h3>
            <QuickAssignTask
              currentAssigneeId={task.assignedTo}
              users={mockUsers}
              onAssign={handleAssign}
              size="sm"
            />
          </div>

          {/* Description preview */}
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2" onClick={onClick}>
              {task.description}
            </p>
          )}

          {/* Priority and due date */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${priorityColors[task.priority]} text-xs border`}>
              {task.priority}
            </Badge>
            
            {task.dueDate && (
              <div className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-red-600' : isDueToday ? 'text-yellow-600' : 'text-gray-500'
              }`}>
                <Calendar className="h-3 w-3" />
                {format(new Date(task.dueDate), 'MMM d')}
                {isOverdue && <span className="ml-1 text-red-600 font-medium">Overdue</span>}
                {isDueToday && <span className="ml-1 text-yellow-600 font-medium">Due today</span>}
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer with subtasks and comments */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {task.subtasks.length > 0 && (
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {completedSubtasks}/{task.subtasks.length}
                </div>
              )}
              
              {task.comments.length > 0 && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {task.comments.length}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {format(new Date(task.updatedAt), 'MMM d')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
