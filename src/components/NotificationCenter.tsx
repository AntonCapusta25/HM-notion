import { useState, useEffect, useMemo } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useTaskContext } from '../contexts/TaskContext';
import { supabase } from '../lib/supabase';

export interface DBNotification {
  id: string;
  user_id: string;
  task_id?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
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
  const [dbNotifications, setDbNotifications] = useState<DBNotification[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [readRtIds, setReadRtIds] = useState<Set<string>>(new Set());
  const [dismissedRtIds, setDismissedRtIds] = useState<Set<string>>(new Set());

  // Set notification settings from the profile data
  const notificationSettings: NotificationSettings = useMemo(() => {
    return profile?.notification_preferences || {
      email: true,
      desktop: true,
      taskAssigned: true,
      taskUpdated: true,
      comments: true,
      dueSoon: true
    };
  }, [profile]);

  // Load user's tasks with assignees from the actual schema
  useEffect(() => {
    if (!user) return;

    const loadUserTasks = async () => {
      try {
        // Get tasks where user is assigned
        const { data: assignedTasks, error: assignedError } = await supabase
          .from('task_assignees')
          .select(`
            task_id,
            tasks!inner (
              id,
              title,
              due_date,
              status,
              created_by,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', user.id);

        if (assignedError) throw assignedError;

        // Get tasks created by user
        const { data: createdTasks, error: createdError } = await supabase
          .from('tasks')
          .select('*')
          .eq('created_by', user.id);

        if (createdError) throw createdError;

        // Combine and deduplicate tasks
        const allTasks = new Map();

        // Add assigned tasks
        assignedTasks?.forEach(assignment => {
          if (assignment.tasks) {
            allTasks.set(assignment.tasks.id, {
              ...assignment.tasks,
              isAssigned: true,
              isCreator: assignment.tasks.created_by === user.id
            });
          }
        });

        // Add created tasks
        createdTasks?.forEach(task => {
          const existing = allTasks.get(task.id);
          allTasks.set(task.id, {
            ...task,
            isAssigned: existing?.isAssigned || false,
            isCreator: true
          });
        });

        setUserTasks(Array.from(allTasks.values()));
      } catch (error) {
        console.error('Error loading user tasks:', error);
      }
    };

    loadUserTasks();
  }, [user]);

  // Load notifications from database
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error loading notifications:', error);
          return;
        }

        setDbNotifications(data || []);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setDbNotifications(prev => [payload.new as DBNotification, ...prev]);

          // Show desktop notification if enabled
          const newNotif = payload.new as DBNotification;
          if (notificationSettings.desktop &&
            ['overdue', 'due_soon', 'task_assigned'].includes(newNotif.type)) {
            showDesktopNotification(newNotif);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setDbNotifications(prev =>
            prev.map(notif =>
              notif.id === payload.new.id ? payload.new as DBNotification : notif
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, notificationSettings.desktop]);

  // Generate additional real-time notifications based on current tasks
  const combinedNotifications = useMemo(() => {
    if (!user || !userTasks.length) return dbNotifications;

    const realTimeNotifs: DBNotification[] = [];

    // Only generate real-time notifications if settings allow them
    if (notificationSettings.dueSoon || notificationSettings.taskAssigned) {
      userTasks.forEach(task => {
        // Task assigned notifications
        if (notificationSettings.taskAssigned && task.isAssigned && !task.isCreator) {
          const assignedNotifExists = dbNotifications.some(
            n => n.task_id === task.id && n.type === 'task_assigned'
          );

          if (!assignedNotifExists) {
            realTimeNotifs.push({
              id: `rt-assigned-${task.id}`,
              user_id: user.id,
              task_id: task.id,
              type: 'task_assigned',
              title: 'New Task Assigned',
              message: `You have been assigned to "${task.title}"`,
              read: false,
              created_at: task.created_at
            });
          }
        }

        // Due soon/overdue notifications
        if (notificationSettings.dueSoon && task.due_date && task.status !== 'done' &&
          (task.isAssigned || task.isCreator)) {
          const dueDate = new Date(task.due_date);

          if (isToday(dueDate)) {
            const dueTodayExists = dbNotifications.some(
              n => n.task_id === task.id && (n.type === 'due_soon' || n.type === 'task_due')
            );

            if (!dueTodayExists) {
              realTimeNotifs.push({
                id: `rt-due-today-${task.id}`,
                user_id: user.id,
                task_id: task.id,
                type: 'due_soon',
                title: 'Task Due Today',
                message: `"${task.title}" is due today`,
                read: false,
                created_at: task.due_date
              });
            }
          } else if (isTomorrow(dueDate)) {
            const dueTomorrowExists = dbNotifications.some(
              n => n.task_id === task.id && n.type === 'due_soon'
            );

            if (!dueTomorrowExists) {
              realTimeNotifs.push({
                id: `rt-due-tomorrow-${task.id}`,
                user_id: user.id,
                task_id: task.id,
                type: 'due_soon',
                title: 'Task Due Tomorrow',
                message: `"${task.title}" is due tomorrow`,
                read: false,
                created_at: task.due_date
              });
            }
          } else if (isPast(dueDate) && !isToday(dueDate)) {
            const overdueExists = dbNotifications.some(
              n => n.task_id === task.id && (n.type === 'overdue' || n.type === 'task_overdue')
            );

            if (!overdueExists) {
              realTimeNotifs.push({
                id: `rt-overdue-${task.id}`,
                user_id: user.id,
                task_id: task.id,
                type: 'overdue',
                title: 'Task Overdue',
                message: `"${task.title}" is overdue`,
                read: false,
                created_at: task.due_date
              });
            }
          }
        }
      });
    }

    // Filter out dismissed RT notifications and update read status
    const processedRtNotifs = realTimeNotifs
      .filter(n => !dismissedRtIds.has(n.id))
      .map(n => ({
        ...n,
        read: readRtIds.has(n.id)
      }));

    // Combine DB notifications with real-time ones, remove duplicates
    const combined = [...dbNotifications, ...processedRtNotifs];
    const uniqueNotifications = combined.filter((notif, index, self) =>
      index === self.findIndex(n =>
        (n.id === notif.id) ||
        (n.task_id === notif.task_id && n.type === notif.type)
      )
    );

    return uniqueNotifications
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  }, [dbNotifications, userTasks, user, notificationSettings, readRtIds, dismissedRtIds]);

  // Filter notifications based on user settings
  const filteredNotifications = useMemo(() => {
    return combinedNotifications.filter(notif => {
      switch (notif.type) {
        case 'task_assigned':
          return notificationSettings.taskAssigned;
        case 'task_updated':
        case 'completed': // Added 'completed' to taskUpdated
          return notificationSettings.taskUpdated;
        case 'comment_added':
          return notificationSettings.comments;
        case 'due_soon':
        case 'task_due':
        case 'overdue':
        case 'task_overdue':
          return notificationSettings.dueSoon;
        default:
          return true;
      }
    });
  }, [combinedNotifications, notificationSettings]);

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    // Handle RT notifications locally
    if (id.startsWith('rt-')) {
      setReadRtIds(prev => new Set(prev).add(id));
      return;
    }

    // ⚡ OPTIMISTIC: Update UI immediately
    setDbNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );

    // 📡 Update database in background
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        // Rollback on error
        setDbNotifications(prev =>
          prev.map(notif => notif.id === id ? { ...notif, read: false } : notif)
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Rollback on error
      setDbNotifications(prev =>
        prev.map(notif => notif.id === id ? { ...notif, read: false } : notif)
      );
    }
  };

  const markAllAsRead = async () => {
    // Mark RT notifications as read
    const rtIds = filteredNotifications
      .filter(n => !n.read && n.id.startsWith('rt-'))
      .map(n => n.id);

    if (rtIds.length > 0) {
      setReadRtIds(prev => {
        const next = new Set(prev);
        rtIds.forEach(id => next.add(id));
        return next;
      });
    }

    try {
      const unreadIds = filteredNotifications
        .filter(n => !n.read && !n.id.startsWith('rt-'))
        .map(n => n.id);

      if (unreadIds.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', unreadIds);

        if (error) {
          console.error('Error marking all notifications as read:', error);
        }
      }

      setDbNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const removeNotification = async (id: string) => {
    // Handle RT notifications locally
    if (id.startsWith('rt-')) {
      setDismissedRtIds(prev => new Set(prev).add(id));
      return;
    }

    // Store original notification for potential rollback
    const originalNotif = dbNotifications.find(n => n.id === id);

    // ⚡ OPTIMISTIC: Remove from UI immediately
    setDbNotifications(prev => prev.filter(notif => notif.id !== id));

    // 📡 Delete from database in background
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error removing notification:', error);
        // Rollback on error
        if (originalNotif) {
          setDbNotifications(prev => [...prev, originalNotif]);
        }
      }
    } catch (error) {
      console.error('Failed to remove notification:', error);
      // Rollback on error
      if (originalNotif) {
        setDbNotifications(prev => [...prev, originalNotif]);
      }
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return 'bg-blue-100 text-blue-800';
      case 'due_soon':
      case 'task_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
      case 'task_overdue':
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

  const showDesktopNotification = (notification: DBNotification) => {
    if (!notificationSettings.desktop) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id
        });
      } catch (error) {
        console.warn('Failed to show desktop notification:', error);
      }
    }
  };

  // Update document title with notification count
  useEffect(() => {
    const originalTitle = document.title.replace(/^\(\d+\) /, '');

    if (unreadCount > 0 && Object.values(notificationSettings).some(v => v)) {
      document.title = `(${unreadCount}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [unreadCount, notificationSettings]);

  if (loading) {
    return (
      <Button variant="ghost" size="sm" className="relative" disabled>
        <Bell className="h-5 w-5 animate-pulse" />
      </Button>
    );
  }

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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                >
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
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No notifications</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You'll see updates about your tasks here
                  </p>
                </div>
              ) : (
                filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
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
                          <Badge variant="outline" className={cn("text-xs", getNotificationColor(notification.type))}>
                            {notification.type.replace('_', ' ')}
                          </Badge>
                          <p className="text-xs text-gray-500">
                            {getRelativeTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-100 text-gray-400 hover:text-red-600"
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

            <div className="p-2 border-t bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                {filteredNotifications.length > 0 ? (
                  `${filteredNotifications.length} recent notifications`
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
