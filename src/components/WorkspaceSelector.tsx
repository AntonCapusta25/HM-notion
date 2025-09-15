import { useState } from 'react';
import { Check, ChevronsUpDown, CheckSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Assuming the Workspace type is defined in a types file
export interface Workspace {
  id: string;
  name: string;
  color: string;
  type?: 'chef_outreach' | 'task_management';
}

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  selectedWorkspace: string | null;
  onWorkspaceChange: (workspaceId: string | null) => void;
}

const getWorkspaceTypeIcon = (type?: string) => {
  switch (type) {
    case 'chef_outreach':
      return Users;
    case 'task_management':
    default:
      return CheckSquare;
  }
};

export const WorkspaceSelector = ({
  workspaces,
  selectedWorkspace,
  onWorkspaceChange,
}: WorkspaceSelectorProps) => {
  const [open, setOpen] = useState(false);
  const selectedWorkspaceData = workspaces.find(
    (w) => w.id === selectedWorkspace
  );

  // ✅ SOLUTION: Determine the icon component before the return statement.
  const SelectedIcon = selectedWorkspaceData
    ? getWorkspaceTypeIcon(selectedWorkspaceData.type)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            {selectedWorkspaceData && SelectedIcon && (
              <>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedWorkspaceData.color }}
                />
                {/* ✅ Render the pre-calculated component variable */}
                <SelectedIcon className="w-3 h-3 text-gray-500" />
              </>
            )}
            {selectedWorkspaceData
              ? selectedWorkspaceData.name
              : 'All Workspaces'}
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
                    'mr-2 h-4 w-4',
                    selectedWorkspace === null ? 'opacity-100' : 'opacity-0'
                  )}
                />
                All Workspaces
              </CommandItem>
              {workspaces.map((workspace) => {
                const TypeIcon = getWorkspaceTypeIcon(workspace.type);
                return (
                  <CommandItem
                    key={workspace.id}
                    onSelect={() => {
                      onWorkspaceChange(workspace.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedWorkspace === workspace.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: workspace.color }}
                      />
                      <TypeIcon className="w-3 h-3 text-gray-500" />
                      {workspace.name}
                      <span className="ml-auto text-xs text-gray-400">
                        {workspace.type === 'chef_outreach'
                          ? 'Chef'
                          : 'Tasks'}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
