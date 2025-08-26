
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Calendar, 
  Settings, 
  ChevronLeft,
  Bell,
  Search,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'My Tasks', href: '/my-tasks', icon: CheckSquare },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Search', href: '/search', icon: Search },
];

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-homemade-orange rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">H</span>
                </div>
                <span className="font-bold text-xl text-gray-900">Homebase</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            </Button>
          </div>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Search..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {!collapsed && (
          <div className="px-4 pb-4">
            <Button className="w-full bg-homemade-orange hover:bg-homemade-orange-dark">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 px-4">
          <nav className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-homemade-orange text-white" 
                      : "text-gray-700 hover:bg-gray-100",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Workspaces */}
        {!collapsed && (
          <div className="px-4 py-4 border-t border-gray-200">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Workspaces
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Marketing</span>
                <Badge variant="secondary" className="ml-auto">3</Badge>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Chef Onboarding</span>
                <Badge variant="secondary" className="ml-auto">7</Badge>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>Operations</span>
                <Badge variant="secondary" className="ml-auto">2</Badge>
              </div>
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center"
          )}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-homemade-orange text-white">AH</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">Ali Hassan</div>
                <div className="text-xs text-gray-500 truncate">Admin</div>
              </div>
            )}
            {!collapsed && (
              <Link to="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
