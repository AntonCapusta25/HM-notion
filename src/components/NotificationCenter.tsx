import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const NotificationCenter = () => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="text-center text-gray-500">
          <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Notifications</p>
          <p className="text-xs text-gray-400 mt-1">
            Feature loading...
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
