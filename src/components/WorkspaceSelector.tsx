
import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Workspace } from '../types';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  selectedWorkspace: string | null;
  onWorkspaceChange: (workspaceId: string | null) => void;
}

export const WorkspaceSelector = ({ workspaces, selectedWorkspace, onWorkspaceChange }: WorkspaceSelectorProps) => {
  const [open, setOpen] = useState(false);

  const selectedWorkspaceData = workspaces.find(w => w.id === selectedWorkspace);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          <div className="flex items-center gap-2">
            {selectedWorkspaceData && (
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedWorkspaceData.color }}
              />
            )}
            {selectedWorkspaceData ? selectedWorkspaceData.name : "All Workspaces"}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search workspaces..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onWorkspaceChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedWorkspace === null ? "opacity-100" : "opacity-0"
                  )}
                />
                All Workspaces
              </CommandItem>
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  onSelect={() => {
                    onWorkspaceChange(workspace.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedWorkspace === workspace.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: workspace.color }}
                    />
                    {workspace.name}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
