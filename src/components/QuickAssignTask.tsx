
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, Users } from 'lucide-react';
import { User as UserType } from '../types';

interface QuickAssignTaskProps {
  currentAssigneeId?: string;
  users: UserType[];
  onAssign: (userId: string) => void;
  size?: 'sm' | 'default';
}

export const QuickAssignTask = ({ currentAssigneeId, users, onAssign, size = 'default' }: QuickAssignTaskProps) => {
  const currentAssignee = users.find(u => u.id === currentAssigneeId);
  
  const buttonSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`${buttonSize} p-0 rounded-full hover:bg-gray-100`}>
          {currentAssignee ? (
            <Avatar className={buttonSize}>
              <AvatarFallback className="bg-homemade-orange text-white text-xs">
                {currentAssignee.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`${buttonSize} border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center hover:border-homemade-orange transition-colors`}>
              <User className={`${iconSize} text-gray-400`} />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white border shadow-lg">
        <div className="p-2">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
            <Users className="h-4 w-4" />
            Assign to
          </div>
          {users.map(user => (
            <DropdownMenuItem
              key={user.id}
              className="flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-50 rounded-md"
              onClick={() => onAssign(user.id)}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-homemade-orange text-white text-xs">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-gray-500">{user.department}</span>
              </div>
              {currentAssigneeId === user.id && (
                <div className="ml-auto w-2 h-2 bg-homemade-orange rounded-full" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
