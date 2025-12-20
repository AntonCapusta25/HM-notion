import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Calendar, Trash2, Check, X, Users, Edit2, MoreHorizontal, Clock, ArrowRight } from 'lucide-react';
import { Task, User as UserType } from '../../types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ListViewProps {
    tasks: Task[];
    users: UserType[];
    onCreateTask: (taskData: any) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onDeleteTask: (taskId: string) => void;
    onAssignTask: (taskId: string, userIds: string[]) => void;
    onTaskClick?: (task: Task) => void;
}

const safeFormatDate = (dateInput: string | null | undefined, formatStr: string = 'MMM d'): string => {
    if (!dateInput) return 'No date';
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'Invalid date';
        return format(date, formatStr);
    } catch (error) {
        return 'Invalid date';
    }
};

const AssigneeManager = ({
    taskId,
    currentAssignees,
    users,
    onAssign
}: {
    taskId: string;
    currentAssignees: string[];
    users: UserType[];
    onAssign: (taskId: string, userIds: string[]) => void;
}) => {
    const [open, setOpen] = useState(false);
    const assignedUsers = users.filter(u => currentAssignees?.includes(u.id));
    const unassignedUsers = users.filter(u => !currentAssignees?.includes(u.id));

    const handleAssignUser = (userId: string) => {
        onAssign(taskId, [...(currentAssignees || []), userId]);
    };

    const handleUnassignUser = (userId: string) => {
        onAssign(taskId, (currentAssignees || []).filter(id => id !== userId));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full">
                    {assignedUsers.length > 0 ? (
                        <div className="flex -space-x-2">
                            {assignedUsers.slice(0, 3).map(u => (
                                <Avatar key={u.id} className="h-6 w-6 border-2 border-transparent">
                                    <AvatarFallback className="text-[10px] bg-blue-500/20 text-blue-200">{u.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            ))}
                            {assignedUsers.length > 3 && (
                                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white">+{assignedUsers.length - 3}</div>
                            )}
                        </div>
                    ) : (
                        <span className="flex items-center gap-1.5 text-xs"><Users className="h-3 w-3" /> Assign</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-[#1c1c1e]/90 backdrop-blur-xl border-white/10 text-white" align="start">
                <Command className="bg-transparent">
                    <CommandInput placeholder="Search users..." className="text-white placeholder:text-white/40 border-white/10" />
                    <CommandEmpty>No users found.</CommandEmpty>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {assignedUsers.length > 0 && (
                            <CommandGroup heading={<span className="text-white/40 text-xs font-medium">Assigned</span>}>
                                {assignedUsers.map(user => (
                                    <CommandItem key={user.id} onSelect={() => handleUnassignUser(user.id)} className="aria-selected:bg-white/10 cursor-pointer text-white">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5 bg-white/10"><AvatarFallback className="text-[10px]">{user.name.charAt(0)}</AvatarFallback></Avatar>
                                                <span className="text-sm">{user.name}</span>
                                            </div>
                                            <Check className="h-3 w-3 text-blue-400" />
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                        {unassignedUsers.length > 0 && (
                            <CommandGroup heading={<span className="text-white/40 text-xs font-medium">Suggested</span>}>
                                {unassignedUsers.map(user => (
                                    <CommandItem key={user.id} onSelect={() => handleAssignUser(user.id)} className="aria-selected:bg-white/10 cursor-pointer text-white">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5 bg-white/10"><AvatarFallback className="text-[10px]">{user.name.charAt(0)}</AvatarFallback></Avatar>
                                                <span className="text-sm">{user.name}</span>
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

// Simplified inline date editor matching glass aesthetic
const PremiumDateEditor = ({ taskId, currentDate, onUpdate }: { taskId: string, currentDate: string | null, onUpdate: (taskId: string, updates: Partial<Task>) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [dateValue, setDateValue] = useState(currentDate || '');

    const handleSave = () => {
        onUpdate(taskId, { due_date: dateValue || null });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 animate-in fade-in zoom-in-95 duration-200">
                <input
                    type="date"
                    value={dateValue}
                    onChange={e => setDateValue(e.target.value)}
                    className="bg-transparent text-white text-xs border-none focus:ring-0 p-0 h-6 w-[100px]"
                    autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleSave} className="h-6 w-6 text-green-400 hover:text-green-300 hover:bg-white/5 rounded-md"><Check className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/5 rounded-md"><X className="h-3 w-3" /></Button>
            </div>
        )
    }

    return (
        <div onClick={() => setIsEditing(true)} className="flex items-center gap-2 cursor-pointer group px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <Calendar className={`h-3.5 w-3.5 ${currentDate ? 'text-white/80' : 'text-white/20'}`} />
            <span className={`text-sm ${currentDate ? 'text-white/90' : 'text-white/30 group-hover:text-white/60'}`}>
                {currentDate ? safeFormatDate(currentDate) : 'Set date'}
            </span>
        </div>
    )
}

export const PremiumListView = ({ tasks, users, onCreateTask, onUpdateTask, onDeleteTask, onAssignTask }: ListViewProps) => {
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);
    const [isPending, startTransition] = useTransition();

    if (tasks !== optimisticTasks && !isPending) {
        setOptimisticTasks(tasks);
    }

    const handleCreateTask = () => {
        if (!newTaskTitle.trim()) return;
        const tempId = `temp-${Date.now()}`;
        const taskData = {
            id: tempId, title: newTaskTitle.trim(), description: '', priority: 'medium', status: 'todo', due_date: null, assignees: [], created_at: new Date().toISOString(),
            subtasks: [], comments: [], tags: []
        } as unknown as Task;

        startTransition(() => {
            setOptimisticTasks(prev => [taskData, ...prev]); // Add to top for premium feel
            onCreateTask({ title: newTaskTitle.trim(), priority: 'medium', status: 'todo' });
        });
        setNewTaskTitle('');
        setIsAddingTask(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'in_progress': return 'bg-blue-500/20 text-blue-200 border-blue-500/20';
            case 'done': return 'bg-green-500/20 text-green-200 border-green-500/20';
            default: return 'bg-white/10 text-white/60 border-white/5';
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-300';
            case 'low': return 'text-green-300';
            default: return 'text-yellow-300';
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {/* Header Row */}
            <div className="grid grid-cols-[1fr,120px,120px,150px,150px,40px] gap-4 px-6 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                <div>Task Name</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Assignees</div>
                <div>Due Date</div>
                <div></div>
            </div>

            {/* Add Task Row */}
            {isAddingTask ? (
                <div className="bg-white/10 backdrop-blur-md border border-blue-500/30 rounded-xl p-3 flex items-center animate-in fade-in slide-in-from-top-2 mx-2">
                    <Input
                        autoFocus
                        placeholder="What needs to be done?"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateTask()}
                        className="bg-transparent border-none text-white placeholder:text-white/30 focus-visible:ring-0 text-base h-auto py-2"
                    />
                    <div className="flex items-center gap-2 pr-2">
                        <Button size="sm" onClick={handleCreateTask} className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg">Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsAddingTask(false)} className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg">Cancel</Button>
                    </div>
                </div>
            ) : (
                <Button
                    variant="ghost"
                    onClick={() => setIsAddingTask(true)}
                    className="w-full justify-start pl-6 py-6 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all group mx-1 border border-transparent hover:border-white/5 dashed-border"
                >
                    <Plus className="h-5 w-5 mr-3 group-hover:bg-blue-500 group-hover:text-white rounded-full p-0.5 transition-colors" />
                    Add new task...
                </Button>
            )}

            {/* Tasks Grid */}
            <div className="space-y-1">
                {optimisticTasks.map(task => (
                    <div key={task.id} className="group grid grid-cols-[1fr,120px,120px,150px,150px,40px] gap-4 items-center px-4 py-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200">
                        {/* Title & Icons */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${task.status === 'done' ? 'bg-green-500' : task.priority === 'high' ? 'bg-red-500' : 'bg-white/20'}`} />
                            <span className={`text-sm font-medium truncate ${task.status === 'done' ? 'text-white/40 line-through' : 'text-white/90'}`}>{task.title}</span>
                        </div>

                        {/* Status Dropdown */}
                        <div>
                            <Select value={task.status} onValueChange={v => onUpdateTask(task.id, { status: v as any })}>
                                <SelectTrigger className={`h-7 text-xs border border-white/5 rounded-lg ${getStatusColor(task.status)}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1c1c1e] border-white/10 text-white">
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Priority Dropdown */}
                        <div>
                            <Select value={task.priority} onValueChange={v => onUpdateTask(task.id, { priority: v as any })}>
                                <SelectTrigger className="h-7 text-xs bg-transparent border-transparent hover:bg-white/5 text-white/60">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1c1c1e] border-white/10 text-white">
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Assignees */}
                        <div><AssigneeManager taskId={task.id} currentAssignees={task.assignees || []} users={users} onAssign={onAssignTask} /></div>

                        {/* Date */}
                        <div><PremiumDateEditor taskId={task.id} currentDate={task.due_date} onUpdate={onUpdateTask} /></div>

                        {/* Actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-40 p-1 bg-[#1c1c1e]/90 backdrop-blur-xl border-white/10">
                                    <Button variant="ghost" size="sm" onClick={() => onDeleteTask(task.id)} className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-white/5 rounded-md">
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </Button>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                ))}
                {optimisticTasks.length === 0 && !isAddingTask && (
                    <div className="text-center py-12 text-white/20">No tasks in this view</div>
                )}
            </div>
        </div>
    );
};
