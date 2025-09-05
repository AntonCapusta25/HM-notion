import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '../contexts/AuthContext';

interface TestNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<TestNotification[]>([
    {
      id: '1',
      title: 'Test Notification 1',
      message: 'This is a test notification',
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
      created_at: new Date(Date.now() - 60000).toISOString()
    }
  ]);

  const addLog = (message: string) => {
    console.log(`[NotificationCenter] ${message}`);
    setDebugLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('Component mounted');
  }, []);

  const handleMarkAsRead = (id: string) => {
    addLog(`handleMarkAsRead called with id: ${id}`);
    setNotifications(prev => 
      prev.map(notif => {
        if (notif.id === id) {
          addLog(`Marking notification ${id} as read`);
          return { ...notif, read: true };
        }
        return notif;
      })
    );
  };

  const handleRemove = (id: string) => {
    addLog(`handleRemove called with id: ${id}`);
    setNotifications(prev => {
      const filtered = prev.filter(notif => notif.id !== id);
      addLog(`Removed notification ${id}, ${filtered.length} remaining`);
      return filtered;
    });
  };

  const handleMarkAllRead = () => {
    addLog('handleMarkAllRead called');
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const handleBellClick = () => {
    addLog(`Bell clicked, current open state: ${open}`);
    setOpen(!open);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return 'bg-blue-100 text-blue-800';
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="relative">
      {/* Debug Panel */}
      <div className="fixed top-20 right-4 bg-black text-white text-xs p-2 rounded max-w-xs z-50 opacity-90">
        <div className="font-bold mb-1">Debug Logs:</div>
        {debugLogs.map((log, index) => (
          <div key={index} className="text-green-400">{log}</div>
        ))}
        <div className="mt-1 text-yellow-400">
          Open: {open ? 'true' : 'false'} | Unread: {unreadCount}
        </div>
      </div>

      <Popover open={open} onOpenChange={(newOpen) => {
        addLog(`Popover onOpenChange: ${newOpen}`);
        setOpen(newOpen);
      }}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative"
            onClick={handleBellClick}
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
                  Debug Notifications ({notifications.length})
                </CardTitle>
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      addLog('Mark all read button clicked (native)');
                      handleMarkAllRead();
                    }}
                    className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">All notifications cleared!</p>
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
                              {new Date(notification.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          {/* Native button approach */}
                          {!notification.read && (
                            <button
                              onClick={() => {
                                addLog(`Native read button clicked for ${notification.id}`);
                                handleMarkAsRead(notification.id);
                              }}
                              className="h-8 w-8 p-1 hover:bg-gray-200 rounded flex items-center justify-center"
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              addLog(`Native remove button clicked for ${notification.id}`);
                              handleRemove(notification.id);
                            }}
                            className="h-8 w-8 p-1 hover:bg-gray-200 rounded flex items-center justify-center"
                            title="Remove notification"
                          >
                            <X className="h-4 w-4" />
                          </button>

                          {/* Shadcn Button approach for comparison */}
                          <div className="ml-2 border-l pl-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  addLog(`Shadcn read button clicked for ${notification.id}`);
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                title="Mark as read (Shadcn)"
                              >
                                <Check className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                addLog(`Shadcn remove button clicked for ${notification.id}`);
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemove(notification.id);
                              }}
                              title="Remove (Shadcn)"
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  Debug mode: {notifications.length} notifications | Check console for logs
                </p>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
};
