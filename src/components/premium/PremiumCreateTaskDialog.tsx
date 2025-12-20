import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X, UserPlus, Users, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask?: (taskData: any) => void;
}

export const PremiumCreateTaskDialog = ({ open, onOpenChange, onCreateTask }: CreateTaskDialogProps) => {
  const { users, workspaces, createTask } = useTaskContext();
  const { user } = useAuth();
  const { profile: userProfile } = useProfile();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [priority, setPriority] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('none');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to create tasks');
      return;
    }

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        assignees,
        priority: priority as 'low' | 'medium' | 'high',
        due_date: dueDate ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}` : undefined,
        workspace_id: selectedWorkspace === 'none' ? null : selectedWorkspace, // Handle 'none' value properly
        tags,
        status: 'todo' as const,
        subtasks: [],
        created_by: userProfile?.id || user.id
      };

      console.log('Creating task with workspace:', selectedWorkspace);

      if (onCreateTask) {
        await onCreateTask(taskData);
      } else {
        await createTask(taskData);
      }

      onOpenChange(false);
      resetForm();

    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssignees([]);
    setPriority('');
    setDueDate(undefined);
    setSelectedWorkspace('none');
    setTags([]);
    setNewTag('');
    setError(null);
  };

  const addAssignee = (userId: string) => {
    if (!assignees.includes(userId)) {
      setAssignees([...assignees, userId]);
    }
  };

  const removeAssignee = (userId: string) => {
    setAssignees(assignees.filter(id => id !== userId));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const assignedUsers = useMemo(() => users.filter(u => assignees.includes(u.id)), [users, assignees]);
  const unassignedUsers = useMemo(() => users.filter(u => !assignees.includes(u.id)), [users, assignees]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#1c1c1e]/95 backdrop-blur-xl border-white/10 text-white p-0 gap-0">
        <DialogHeader className="p-6 border-b border-white/10">
          <DialogTitle className="text-xl font-semibold text-white">Create New Task</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="px-6 pt-4">
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white/60">Task Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                required
                disabled={isSubmitting}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-0 focus-visible:border-white/20 text-lg py-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white/60">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this task..."
                rows={3}
                disabled={isSubmitting}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-0 focus-visible:border-white/20 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/60">Workspace</Label>
              <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace} disabled={isSubmitting}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent className="bg-[#1c1c1e] border-white/10 text-white">
                  <SelectItem value="none" className="focus:bg-white/10 focus:text-white">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-white/40" />
                      No workspace (Personal)
                    </div>
                  </SelectItem>
                  {workspaces.map(workspace => (
                    <SelectItem key={workspace.id} value={workspace.id} className="focus:bg-white/10 focus:text-white">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-white/40" />
                        {workspace.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/60">Assignees</Label>
              <div className="flex flex-wrap items-center gap-2 p-2 border border-white/10 rounded-lg min-h-[44px] bg-white/5">
                {assignedUsers.map(user => (
                  <Badge key={user.id} variant="secondary" className="gap-1.5 pl-1.5 bg-white/10 text-white hover:bg-white/20 border-white/5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-blue-500/20 text-blue-200">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {user.name}
                    <X
                      className="h-3 w-3 cursor-pointer text-white/40 hover:text-white"
                      onClick={() => removeAssignee(user.id)}
                    />
                  </Badge>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10 rounded-full" disabled={unassignedUsers.length === 0}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1 bg-[#1c1c1e] border-white/10 text-white">
                    {unassignedUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-md cursor-pointer transition-colors"
                        onClick={() => addAssignee(user.id)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-blue-500/20 text-blue-200">{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.name}</span>
                      </div>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/60">Priority</Label>
                <Select value={priority} onValueChange={setPriority} disabled={isSubmitting}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c1c1e] border-white/10 text-white">
                    <SelectItem value="low" className="focus:bg-white/10 focus:text-white text-green-400">Low</SelectItem>
                    <SelectItem value="medium" className="focus:bg-white/10 focus:text-white text-yellow-400">Medium</SelectItem>
                    <SelectItem value="high" className="focus:bg-white/10 focus:text-white text-red-400">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/60">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white",
                        !dueDate && "text-white/40"
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#1c1c1e] border-white/10 text-white" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      className="bg-[#1c1c1e] text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/60">Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white/5 border border-white/10 rounded-lg min-h-[44px]">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1 bg-white/10 text-white/80 border-white/5 hover:bg-white/20">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer text-white/40 hover:text-white"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
                <div className="flex-1 min-w-[100px]">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Type & Enter to add..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    disabled={isSubmitting}
                    className="bg-transparent border-none text-white placeholder:text-white/20 focus-visible:ring-0 p-0 h-auto text-sm"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-white/10 bg-[#1c1c1e]/50 flex gap-3">
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-white text-black hover:bg-white/90"
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? 'Creating Task...' : 'Create Task'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};
