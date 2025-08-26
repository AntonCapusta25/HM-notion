import { Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search tasks, users, or workspaces..." className="pl-10" />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-homemade-orange text-white">AH</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};
