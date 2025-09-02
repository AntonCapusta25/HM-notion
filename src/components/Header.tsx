import { Search, Settings, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationCenter } from './NotificationCenter';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
// 1. Import useNavigate
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  // 2. Call the hook to get the navigate function
  const navigate = useNavigate();
  
  const getInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(' ')
        .map(name => name.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return (emailName.charAt(0) + (emailName.charAt(1) || '')).toUpperCase();
    }
    return 'U';
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User';

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-4 flex-1">
          {onToggleSidebar && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleSidebar}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Search tasks, users, or workspaces..." 
              className="pl-10 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-homemade-orange/20" 
            />
          </div>
        </div>
        
        {/* Right Side */}
        <div className="flex items-center gap-2">
          <NotificationCenter />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-auto">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-homemade-orange text-white text-sm font-medium">
                    {profileLoading ? '...' : getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:block text-gray-700">
                  {profileLoading ? 'Loading...' : displayName}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-homemade-orange text-white">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    {profile?.department && (<p className="text-xs text-gray-400 truncate">{profile.department}</p>)}
                  </div>
                </div>
              </div>
              
              <div className="p-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  // 3. Add the onClick handler to navigate
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-4 w-4 mr-3" />
                  Settings
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign out
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
};
