import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '../contexts/AuthContext';

interface SimpleNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export const SimpleNotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SimpleNotification[]>([]);
  const [open, setOpen] = useState(false);

  // Create some test notifications
  useEffect(() => {
    if (user) {
      const testNotifications: SimpleNotification[] = [
        {
          id: '1',
          title: 'Test Notification 1',
          message: 'This is a test notification to check if buttons work',
          type: 'task_assigned',
          read: false,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Test Notification 2',
          message: 'Another test notification',
          type: 'due_soon',
          read: true,
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        }
      ];
      setNotifications(testNotifications);
    }
  }, [user]);

  const handleMarkAsRead = (id: string) => {
    console.log('Mark as read clicked for:', id);
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const handleRemove = (id: string) => {
    console.log('Remove clicked for:', id);
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const handleMarkAllRead = () => {
    console.log('Mark all read clicked');
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return 'bg-blue-100 text-blue-800';
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.abs(now.getTime() - date.getTime()) / (1000 * 60);
      
      if (diffInMinutes < 1) {
        return 'just now';
      } else if (diffInMinutes < 60) {
        return `${Math.floor(diffInMinutes)}m ago`;
      } else {
        return `${Math.floor(diffInMinutes / 60)}h ago`;
      }
    } catch {
      return 'recently';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative"
            onClick={() => {
              console.log('Bell clicked, current open state:', open);
              setOpen(!open);
            }}
          >
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
                <CardTitle className="text-base">
                  Test Notifications ({notifications.length})
                </CardTitle>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Mark all read button clicked');
                      handleMarkAllRead();
                    }}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No test notifications</p>
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
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`text-xs ${getNotificationColor(notification.type)}`}>
                              {notification.type.replace('_', ' ')}
                            </Badge>
                            <p className="text-xs text-gray-500">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-1 flex-shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Read button clicked for:', notification.id);
                                handleMarkAsRead(notification.id);
                              }}
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-200"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Remove button clicked for:', notification.id);
                              handleRemove(notification.id);
                            }}
                            title="Remove notification"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-2 border-t bg-gray-50">
                  <p className="text-xs text-gray-500 text-center">
                    {notifications.length} test notifications
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
      
      {/* Debug info */}
      <div className="fixed bottom-4 right-4 bg-black text-white text-xs p-2 rounded opacity-50 pointer-events-none">
        Open: {open ? 'true' : 'false'} | Unread: {unreadCount}
      </div>
    </div>
  );
};
