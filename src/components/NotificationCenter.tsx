
import { useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'due_soon' | 'overdue';
  taskId?: string;
  read: boolean;
  createdAt: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'New Task Assigned',
    message: 'You have been assigned to "Create social media templates"',
    type: 'task_assigned',
    taskId: 'task-1',
    read: false,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Task Due Soon',
    message: 'Chef interview with Maria is due in 2 hours',
    type: 'due_soon',
    taskId: 'task-2',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: '3',
    title: 'Comment Added',
    message: 'Menna commented on "Update website copy"',
    type: 'comment_added',
    taskId: 'task-3',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  }
];

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'task_assigned':
        return 'bg-blue-100 text-blue-800';
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'comment_added':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No notifications
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          <Badge variant="outline" className={getNotificationColor(notification.type)}>
                            {notification.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNotification(notification.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};
