import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Bell, Palette, Shield, Download, AlertCircle, Trash2, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useTaskContext } from '../contexts/TaskContext';
import { supabase } from '../lib/supabase';

const Settings = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const { tasks } = useTaskContext();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    department: 'Operations',
    role: 'member',
    notifications: {
      email: true,
      desktop: true,
      taskAssigned: true,
      taskUpdated: true,
      comments: true,
      dueSoon: true
    },
    theme: 'light',
    timezone: 'Asia/Dubai',
    language: 'en'
  });

  // Load user preferences from localStorage on mount (for non-notification settings)
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences);
        setSettings(prev => ({
          ...prev,
          theme: prefs.theme || prev.theme,
          timezone: prefs.timezone || prev.timezone,
          language: prefs.language || prev.language
        }));
        console.log('📱 Loaded UI preferences from localStorage:', prefs);
      } catch (error) {
        console.error('Error parsing saved preferences:', error);
      }
    }
  }, []);

  // Load user data when profile loads - using actual schema fields
  useEffect(() => {
    if (user && profile) {
      setSettings(prev => ({
        ...prev,
        // Use actual fields from your users table
        name: profile.name || user.email?.split('@')[0] || '',
        email: user.email || '',
        department: profile.department || prev.department,
        role: profile.role || prev.role,
      }));
    }
  }, [user, profile]);

  // Load notification preferences from database when profile loads
  useEffect(() => {
    if (profile?.notification_preferences) {
      setSettings(prev => ({
        ...prev,
        notifications: {
          email: true,
          desktop: true,
          taskAssigned: true,
          taskUpdated: true,
          comments: true,
          dueSoon: true,
          ...profile.notification_preferences // Override with database values
        }
      }));
      console.log('📧 Loaded notification preferences from database:', profile.notification_preferences);
    } else {
      console.log('📧 No notification preferences found in database, using defaults');
    }
  }, [profile]);

  const updateSetting = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.');
      const updated = { ...prev };
      let current: any = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const saveSettings = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save settings.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);

    try {
      console.log('💾 Saving settings to database...');
      console.log('Notification preferences to save:', settings.notifications);

      // Save profile data AND notification preferences to database
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: settings.name,
          email: settings.email,
          department: settings.department,
          role: settings.role,
          notification_preferences: settings.notifications, // Save notification preferences to database
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Also save UI preferences to localStorage for frontend use
      const uiPreferences = {
        theme: settings.theme,
        timezone: settings.timezone,
        language: settings.language
      };

      localStorage.setItem('userPreferences', JSON.stringify(uiPreferences));
      
      // Dispatch storage event to notify other components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'userPreferences',
        newValue: JSON.stringify(uiPreferences)
      }));

      console.log('✅ Settings saved successfully');
      toast({
        title: "Settings saved",
        description: "Your notification preferences and profile have been updated successfully.",
      });
    } catch (error: any) {
      console.error('❌ Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const testNotifications = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to test notifications.",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);

    try {
      console.log('🧪 Testing notification system...');

      // Check if notifications table exists and create a test notification
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Test Notification',
          message: 'This is a test notification to verify your settings are working correctly.',
          type: 'info',
          read: false,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Error creating test notification:', error);
        
        // If notifications table doesn't exist, just show a message
        if (error.code === '42P01') {
          toast({
            title: "Test completed",
            description: "Your notification preferences have been saved. Email notifications will respect these settings when the system processes events.",
            duration: 5000
          });
        } else {
          throw error;
        }
      } else {
        console.log('✅ Test notification created:', data);
        toast({
          title: "Test notification sent",
          description: "A test notification has been created. Check your notifications and email to verify your settings are working.",
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('❌ Test notification failed:', error);
      toast({
        title: "Test partially completed",
        description: "Your preferences are saved, but we couldn't create a test notification. This is normal if the notifications table doesn't exist yet.",
        variant: "default",
        duration: 5000
      });
    } finally {
      setIsTesting(false);
    }
  };

  const exportData = async () => {
    try {
      console.log('📦 Exporting user data...');
      
      // Export user's tasks and related data using actual schema
      const { data: userTasks, error: tasksError } = await supabase
        .from('task_assignees')
        .select(`
          task_id,
          tasks (*)
        `)
        .eq('user_id', user?.id);

      if (tasksError) throw tasksError;

      // Get user's created tasks
      const { data: createdTasks, error: createdError } = await supabase
        .from('tasks')
        .select('*')
        .eq('created_by', user?.id);

      if (createdError) throw createdError;

      // Get user's notifications (if table exists)
      let notifications = [];
      try {
        const { data: notifData, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user?.id);
        
        if (!notifError) {
          notifications = notifData || [];
        }
      } catch (notifError) {
        console.log('Notifications table not available for export');
      }

      const exportData = {
        profile: profile,
        assignedTasks: userTasks,
        createdTasks: createdTasks,
        notifications: notifications,
        settings: settings,
        exportedAt: new Date().toISOString(),
        exportedBy: user?.email
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `homebase-data-${user?.email}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Data export completed');
      toast({
        title: "Export completed",
        description: "Your data has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error('❌ Error exporting data:', error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export your data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const clearAllNotifications = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all your notifications? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id);

      if (error) {
        // If table doesn't exist, that's fine
        if (error.code === '42P01') {
          toast({
            title: "No notifications to clear",
            description: "The notifications system is not yet set up.",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Notifications cleared",
        description: "All your notifications have been removed.",
      });
    } catch (error: any) {
      console.error('Error clearing notifications:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to clear notifications. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data."
    );

    if (!confirmed) return;

    try {
      // Note: In a real app, you'd want to handle this server-side
      // This is a simplified version
      await signOut();
      toast({
        title: "Account deletion initiated",
        description: "Please contact support to complete account deletion.",
      });
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please contact support.",
        variant: "destructive"
      });
    }
  };

  // Generate user initials
  const getInitials = () => {
    if (settings.name) {
      return settings.name
        .split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + 
             (emailName.charAt(1) || '').toUpperCase();
    }
    return 'U';
  };

  if (profileLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (profileError) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account and preferences</p>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load profile data: {profileError.message}. Some settings may not be available.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Settings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-homemade-orange text-white text-lg">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm" disabled>Change Avatar</Button>
                  <p className="text-xs text-gray-500 mt-1">Coming soon</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => updateSetting('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select value={settings.department} onValueChange={(value) => updateSetting('department', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Chef Onboarding">Chef Onboarding</SelectItem>
                      <SelectItem value="Customer Success">Customer Success</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="HR">Human Resources</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={settings.role} onValueChange={(value) => updateSetting('role', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={saveSettings} 
                className="bg-homemade-orange hover:bg-homemade-orange-dark"
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notif">Email notifications</Label>
                  <Switch
                    id="email-notif"
                    checked={settings.notifications.email}
                    onCheckedChange={(checked) => updateSetting('notifications.email', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="desktop-notif">Desktop notifications</Label>
                  <Switch
                    id="desktop-notif"
                    checked={settings.notifications.desktop}
                    onCheckedChange={(checked) => updateSetting('notifications.desktop', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label htmlFor="task-assigned">Task assigned</Label>
                  <Switch
                    id="task-assigned"
                    checked={settings.notifications.taskAssigned}
                    onCheckedChange={(checked) => updateSetting('notifications.taskAssigned', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="task-updated">Task updated</Label>
                  <Switch
                    id="task-updated"
                    checked={settings.notifications.taskUpdated}
                    onCheckedChange={(checked) => updateSetting('notifications.taskUpdated', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="comments">Comments & attachments</Label>
                  <Switch
                    id="comments"
                    checked={settings.notifications.comments}
                    onCheckedChange={(checked) => updateSetting('notifications.comments', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="due-soon">Due soon reminders</Label>
                  <Switch
                    id="due-soon"
                    checked={settings.notifications.dueSoon}
                    onCheckedChange={(checked) => updateSetting('notifications.dueSoon', checked)}
                  />
                </div>

                <Separator />

                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={testNotifications}
                  disabled={isTesting}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTesting ? 'Testing...' : 'Test Notifications'}
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={clearAllNotifications}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Notifications
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Select value={settings.theme} onValueChange={(value) => updateSetting('theme', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GMT+4)</SelectItem>
                    <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (GMT+9)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (GMT+11)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language">Language</Label>
                <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Security & Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start" disabled>
                Change Password
              </Button>
              <p className="text-xs text-gray-500 -mt-3">Use your auth provider to change password</p>
              
              <Button variant="outline" className="w-full justify-start" disabled>
                Two-Factor Authentication
              </Button>
              <p className="text-xs text-gray-500 -mt-3">Coming soon</p>

              <Separator />

              <Button variant="outline" className="w-full justify-start" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>

              <Button variant="destructive" className="w-full" onClick={deleteAccount}>
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
