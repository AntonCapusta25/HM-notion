import { useState, useEffect, useMemo } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useTaskContext } from '../contexts/TaskContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'due_soon' | 'overdue' | 'completed';
  taskId?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationSettings {
  email: boolean;
  desktop: boolean;
  taskAssigned: boolean;
  taskUpdated: boolean;
  comments: boolean;
  dueSoon: boolean;
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { tasks } = useTaskContext();
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: true,
    desktop: true,
    taskAssigned: true, // Force this to be true
    taskUpdated: true,  // Force this to be true  
    comments: true,
    dueSoon: true
  });

  // Load notification settings from localStorage
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedPreferences = localStorage.getItem('userPreferences');
        if (savedPreferences) {
          const prefs = JSON.parse(savedPreferences);
          if (prefs.notifications) {
            setNotificationSettings(prefs.notifications);
            console.log('📧 Loaded notification settings:', prefs.notifications);
          }
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };

    loadSettings();

    // Listen for settings changes (when user updates settings in another tab/component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userPreferences') {
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Generate real-time notifications based on tasks and user preferences
  const notifications = useMemo(() => {
    if (!user || !tasks.length) return [];

    const notifs: Notification[] = [];
    const now = new Date();

    tasks.forEach(task => {
      const taskId = task.id;
      
      const isAssignedToUser = task.assignees && task.assignees.includes(user.id);
      const isCreatedByUser = task.created_by === user.id;
      
      // Task assigned notifications - only if enabled
      if (notificationSettings.taskAssigned && isAssignedToUser && !isCreatedByUser) {
        notifs.push({
          id: `assigned-${taskId}`,
          title: 'New Task Assigned',
          message: `You have been assigned to "${task.title}"`,
          type: 'task_assigned',
          taskId: taskId,
          read: readNotifications.has(`assigned-${taskId}`),
          createdAt: task.created_at
        });
      }

      // Due soon notifications - only if enabled
      if (notificationSettings.dueSoon && task.due_date && task.status !== 'done' && (isAssignedToUser || isCreatedByUser)) {
        const dueDate = new Date(task.due_date);
        
        if (isToday(dueDate)) {
          notifs.push({
            id: `due-today-${taskId}`,
            title: 'Task Due Today',
            message: `"${task.title}" is due today`,
            type: 'due_soon',
            taskId: taskId,
            read: readNotifications.has(`due-today-${taskId}`),
            createdAt: task.due_date
          });
        } else if (isTomorrow(dueDate)) {
          notifs.push({
            id: `due-tomorrow-${taskId}`,
            title: 'Task Due Tomorrow',
            message: `"${task.title}" is due tomorrow`,
            type: 'due_soon',
            taskId: taskId,
            read: readNotifications.has(`due-tomorrow-${taskId}`),
            createdAt: task.due_date
          });
        }
      }

      // Overdue notifications - always show if due soon is enabled (critical)
      if (notificationSettings.dueSoon && task.due_date && task.status !== 'done' && (isAssignedToUser || isCreatedByUser)) {
        const dueDate = new Date(task.due_date);
        
        if (isPast(dueDate) && !isToday(dueDate)) {
          notifs.push({
            id: `overdue-${taskId}`,
            title: 'Task Overdue',
            message: `"${task.title}" is overdue`,
            type: 'overdue',
            taskId: taskId,
            read: readNotifications.has(`overdue-${taskId}`),
            createdAt: task.due_date
          });
        }
      }

      // Task completed notifications - only if task updates are enabled
      if (notificationSettings.taskUpdated && task.status === 'done' && isCreatedByUser && !isAssignedToUser) {
        notifs.push({
          id: `completed-${taskId}`,
          title: 'Task Completed',
          message: `"${task.title}" has been completed`,
          type: 'completed',
          taskId: taskId,
          read: readNotifications.has(`completed-${taskId}`),
          createdAt: task.updated_at || task.created_at
        });
      }

      // Comment notifications - only if comments are enabled
      if (notificationSettings.comments && task.comments && task.comments.length > 0 && (isAssignedToUser || isCreatedByUser)) {
        const latestComment = task.comments[task.comments.length - 1];
        if (latestComment.author !== user.id) {
          notifs.push({
            id: `comment-${taskId}-${latestComment.id}`,
            title: 'New Comment',
            message: `New comment on "${task.title}"`,
            type: 'comment_added',
            taskId: taskId,
            read: readNotifications.has(`comment-${taskId}-${latestComment.id}`),
            createdAt: latestComment.created_at
          });
        }
      }

      // Task updated notifications - only if task updates are enabled
      if (notificationSettings.taskUpdated && task.updated_at && task.updated_at !== task.created_at && (isAssignedToUser && !isCreatedByUser)) {
        notifs.push({
          id: `updated-${taskId}`,
          title: 'Task Updated',
          message: `"${task.title}" has been updated`,
          type: 'task_updated',
          taskId: taskId,
          read: readNotifications.has(`updated-${taskId}`),
          createdAt: task.updated_at
        });
      }
    });

    console.log('📧 Generated notifications:', notifs.length, 'notifications');
    console.log('📧 Notification details:', notifs);

    // Filter out dismissed notifications and sort by date
    return notifs
      .filter(notif => !dismissedNotifications.has(notif.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20); // Limit to 20 most recent
  }, [tasks, user, readNotifications, dismissedNotifications, notificationSettings]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    const newReadSet = new Set(readNotifications);
    newReadSet.add(id);
    setReadNotifications(newReadSet);
    console.log('📧 Marked notification as read:', id);
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const newReadSet = new Set([...readNotifications, ...allIds]);
    setReadNotifications(newReadSet);
    console.log('📧 Marked all notifications as read:', allIds.length);
  };

  const removeNotification = (id: string) => {
    const newDismissedSet = new Set(dismissedNotifications);
    newDismissedSet.add(id);
    setDismissedNotifications(newDismissedSet);
    console.log('📧 Dismissed notification:', id);
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
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'task_updated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        return 'just now';
      } else if (diffInHours < 24) {
        return format(date, 'h:mm a');
      } else {
        return format(date, 'MMM d');
      }
    } catch (error) {
      console.warn('Error parsing date:', dateString);
      return 'recently';
    }
  };

  // Desktop notification function (respects settings)
  const showDesktopNotification = (notification: Notification) => {
    if (!notificationSettings.desktop) return;
    
    // Request permission if not granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico', // Use your app icon
          tag: notification.id // Prevents duplicate notifications
        });
      } catch (error) {
        console.warn('Failed to show desktop notification:', error);
      }
    }
  };

  // Show desktop notification for new unread notifications
  useEffect(() => {
    const newUnreadNotifications = notifications.filter(n => !n.read && !readNotifications.has(n.id));
    
    newUnreadNotifications.forEach(notification => {
      // Only show desktop notification for high-priority types
      if (['overdue', 'due_soon', 'task_assigned'].includes(notification.type)) {
        showDesktopNotification(notification);
      }
    });
  }, [notifications, notificationSettings.desktop]);

  // Show notification count in document title (if notifications are enabled)
  useEffect(() => {
    const originalTitle = document.title.replace(/^\(\d+\) /, ''); // Remove existing count
    
    if (unreadCount > 0 && (notificationSettings.desktop || notificationSettings.taskAssigned || notificationSettings.comments || notificationSettings.dueSoon)) {
      document.title = `(${unreadCount}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [unreadCount, notificationSettings]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Notifications
                {Object.values(notificationSettings).every(v => !v) && (
                  <span className="text-xs text-gray-500 font-normal ml-2">(All disabled)</span>
                )}
              </CardTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {Object.values(notificationSettings).every(v => !v) ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium">Notifications Disabled</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Enable notifications in Settings to see updates here
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No notifications</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You'll see updates about your tasks here
                  </p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={`text-xs ${getNotificationColor(notification.type)}`}>
                            {notification.type.replace('_', ' ')}
                          </Badge>
                          <p className="text-xs text-gray-500">
                            {getRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNotification(notification.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-2 border-t bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                {notifications.length > 0 ? (
                  `${notifications.length} recent notifications`
                ) : Object.values(notificationSettings).some(v => v) ? (
                  'No notifications to show'
                ) : (
                  'Notifications disabled in settings'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};
