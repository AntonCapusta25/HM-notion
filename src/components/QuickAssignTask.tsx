import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { User, Users, Search, X, Check } from 'lucide-react';
import { User as UserType } from '../types';

interface QuickAssignTaskProps {
  currentAssigneeId?: string;
  users: UserType[];
  onAssign: (userId: string) => void;
  onUnassign?: () => void;
  size?: 'sm' | 'default';
  disabled?: boolean;
  showSearch?: boolean;
}

export const QuickAssignTask = ({ 
  currentAssigneeId, 
  users, 
  onAssign, 
  onUnassign,
  size = 'default',
  disabled = false,
  showSearch = true
}: QuickAssignTaskProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const currentAssignee = useMemo(
    () => users.find(u => u.id === currentAssigneeId),
    [users, currentAssigneeId]
  );
  
  // Filter and sort users
  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Sort: current assignee first, then alphabetically
    return filtered.sort((a, b) => {
      if (a.id === currentAssigneeId) return -1;
      if (b.id === currentAssigneeId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [users, searchQuery, currentAssigneeId]);
  
  const buttonSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  const handleAssign = (userId: string) => {
    onAssign(userId);
    setIsOpen(false);
    setSearchQuery('');
  };
  
  const handleUnassign = () => {
    if (onUnassign) {
      onUnassign();
      setIsOpen(false);
      setSearchQuery('');
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery('');
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`${buttonSize} p-0 rounded-full hover:bg-gray-100 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-homemade-orange focus-visible:ring-offset-2`}
          disabled={disabled}
          aria-label={currentAssignee ? `Assigned to ${currentAssignee.name}` : 'Assign task'}
        >
          {currentAssignee ? (
            <Avatar className={`${buttonSize} ring-2 ring-homemade-orange/20`}>
              <AvatarFallback className="bg-homemade-orange text-white text-xs font-semibold">
                {currentAssignee.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`${buttonSize} border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center hover:border-homemade-orange hover:bg-homemade-orange/5 transition-all duration-200`}>
              <User className={`${iconSize} text-gray-400 group-hover:text-homemade-orange`} />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-white border shadow-lg p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="p-3 border-b bg-gray-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">Assign Task</span>
            {currentAssignee && (
              <span className="ml-auto text-xs text-gray-500">
                {users.length} members
              </span>
            )}
          </div>
          
          {/* Search Input */}
          {showSearch && users.length > 5 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-8 text-sm border-gray-200 focus-visible:ring-homemade-orange"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 p-0.5 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Current Assignee Section */}
        {currentAssignee && (
          <>
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 py-1.5">
                Current Assignee
              </div>
              <div className="bg-homemade-orange/5 border border-homemade-orange/20 rounded-md p-2 mb-1">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 ring-2 ring-homemade-orange/30">
                    <AvatarFallback className="bg-homemade-orange text-white text-xs font-semibold">
                      {currentAssignee.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {currentAssignee.name}
                    </span>
                    <span className="text-xs text-gray-600 truncate">
                      {currentAssignee.department}
                    </span>
                  </div>
                  <Check className="h-4 w-4 text-homemade-orange flex-shrink-0" />
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* User List */}
        <div className="max-h-64 overflow-y-auto p-2">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center">
              <User className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No members found</p>
            </div>
          ) : (
            <>
              {!currentAssignee && (
                <div className="text-xs font-medium text-gray-500 px-2 py-1.5 mb-1">
                  Select Member
                </div>
              )}
              {filteredUsers.map(user => {
                const isCurrentAssignee = currentAssigneeId === user.id;
                
                return (
                  <DropdownMenuItem
                    key={user.id}
                    className={`
                      flex items-center gap-3 p-2 cursor-pointer rounded-md transition-colors
                      ${isCurrentAssignee 
                        ? 'bg-gray-50 opacity-60 cursor-default' 
                        : 'hover:bg-gray-50 focus:bg-gray-50'
                      }
                    `}
                    onClick={() => !isCurrentAssignee && handleAssign(user.id)}
                    disabled={isCurrentAssignee}
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback className="bg-homemade-orange text-white text-xs font-semibold">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </span>
                      {user.department && (
                        <span className="text-xs text-gray-500 truncate">
                          {user.department}
                        </span>
                      )}
                    </div>
                    {isCurrentAssignee && (
                      <Check className="h-4 w-4 text-homemade-orange flex-shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
        </div>

        {/* Unassign Option */}
        {currentAssignee && onUnassign && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <DropdownMenuItem
                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600 rounded-md transition-colors"
                onClick={handleUnassign}
              >
                <X className="h-4 w-4" />
                <span className="text-sm font-medium">Unassign Task</span>
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
