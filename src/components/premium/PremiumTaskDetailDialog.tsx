import { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Calendar as CalendarIcon,
    UserPlus,
    X,
    CheckSquare,
    Square,
    Plus,
    Flag,
    Edit3,
    Send,
    User,
    Clock,
    Tag,
    Trash2,
    RefreshCw,
    Paperclip,
    Upload,
    Download,
    Eye,
    File,
    Image,
    FileText,
    AlertCircle
} from 'lucide-react';
import { Task, User as UserType } from '../../types';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Add TaskAttachment interface
interface TaskAttachment {
    id: string;
    task_id: string;
    file_name: string;
    file_size?: number;
    file_type?: string;
    file_url: string;
    uploaded_by?: string;
    created_at: string;
}

// Update Task interface to include attachments
interface TaskWithAttachments extends Task {
    attachments?: TaskAttachment[];
}

interface TaskDetailDialogProps {
    task: Task | null;
    users: UserType[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onAddComment: (taskId: string, content: string) => void;
    onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

const safeFormatDate = (dateInput: string | null | undefined, formatStr: string = 'MMM d, yyyy'): string => {
    if (!dateInput) return 'No date';
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'Invalid date';
        return format(date, formatStr);
    } catch (error) {
        return 'Invalid date';
    }
};

const isValidDate = (dateInput: string | null | undefined): boolean => {
    if (!dateInput) return false;
    try {
        const date = new Date(dateInput);
        return !isNaN(date.getTime());
    } catch {
        return false;
    }
};

const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const getFileIcon = (fileType?: string) => {
    if (!fileType) return File;
    if (fileType.startsWith('image/')) return Image;
    if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText;
    return File;
};

const isImageFile = (fileType?: string): boolean => {
    return fileType?.startsWith('image/') || false;
};

export const PremiumTaskDetailDialog = ({
    task: initialTask,
    users,
    open,
    onOpenChange,
    onUpdateTask,
    onAddComment,
    onToggleSubtask
}: TaskDetailDialogProps) => {
    const { user } = useAuth();
    const { tasks } = useTaskContext();
    const [currentTaskData, setCurrentTaskData] = useState<TaskWithAttachments | null>(null);
    const [newComment, setNewComment] = useState('');
    const [newSubtask, setNewSubtask] = useState('');
    const [editingTitle, setEditingTitle] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [tempTitle, setTempTitle] = useState('');
    const [tempDescription, setTempDescription] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAddingSubtask, setIsAddingSubtask] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
    const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isRefreshingRef = useRef(false);

    const task = useMemo(() => {
        return (initialTask ? tasks.find(t => t.id === initialTask.id) : null) || currentTaskData || initialTask;
    }, [initialTask?.id, tasks, currentTaskData]);

    const assignedUsers = useMemo(() => {
        if (!task) return [];
        return users.filter(u => task.assignees?.includes(u.id));
    }, [users, task?.assignees]);

    const unassignedUsers = useMemo(() => {
        if (!task) return [];
        return users.filter(u => !task.assignees?.includes(u.id));
    }, [users, task?.assignees]);

    const debouncedRefresh = async () => {
        if (!initialTask?.id || isRefreshingRef.current) return;

        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }

        refreshTimeoutRef.current = setTimeout(async () => {
            if (isRefreshingRef.current) return;

            isRefreshingRef.current = true;
            setIsRefreshing(true);

            try {
                const { data, error } = await supabase
                    .from('tasks')
                    .select(`
            *,
            comments(*),
            subtasks(*),
            task_tags(tag),
            task_assignees(user_id),
            task_attachments(*)
          `)
                    .eq('id', initialTask.id)
                    .single();

                if (error) {
                    console.error('Refresh error:', error);
                    return;
                }

                if (data) {
                    const formattedTask: TaskWithAttachments = {
                        id: data.id,
                        title: data.title,
                        description: data.description,
                        status: data.status,
                        priority: data.priority,
                        due_date: data.due_date,
                        workspace_id: data.workspace_id,
                        created_by: data.created_by,
                        created_at: data.created_at,
                        updated_at: data.updated_at,
                        assignees: data.task_assignees?.map((ta: any) => ta.user_id) || [],
                        tags: data.task_tags?.map((tt: any) => tt.tag) || [],
                        comments: data.comments || [],
                        subtasks: data.subtasks || [],
                        attachments: data.task_attachments || []
                    };

                    setCurrentTaskData(formattedTask);
                }
            } catch (err) {
                console.error('Refresh failed:', err);
            } finally {
                setIsRefreshing(false);
                isRefreshingRef.current = false;
            }
        }, 300);
    };

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0 || !task || !user) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            for (const file of Array.from(files)) {
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `task-attachments/${task.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(filePath);

                const { error: dbError } = await supabase
                    .from('task_attachments')
                    .insert({
                        task_id: task.id,
                        file_name: file.name,
                        file_size: file.size,
                        file_type: file.type,
                        file_url: publicUrl,
                        uploaded_by: user.id
                    });

                if (dbError) throw dbError;
            }

            await debouncedRefresh();

        } catch (err: any) {
            console.error('File upload failed:', err);
            setUploadError(err.message || 'Failed to upload files');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAttachment = async (attachment: TaskAttachment) => {
        try {
            const urlParts = attachment.file_url.split('/');
            const filePath = urlParts.slice(-3).join('/');

            const { error: storageError } = await supabase.storage
                .from('attachments')
                .remove([filePath]);

            if (storageError) {
                console.warn('Storage deletion failed:', storageError);
            }

            const { error: dbError } = await supabase
                .from('task_attachments')
                .delete()
                .eq('id', attachment.id);

            if (dbError) throw dbError;

            await debouncedRefresh();

        } catch (err) {
            console.error('Failed to delete attachment:', err);
        }
    };

    const handleDownloadAttachment = (attachment: TaskAttachment) => {
        const link = document.createElement('a');
        link.href = attachment.file_url;
        link.download = attachment.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRefreshDialog = async () => {
        await debouncedRefresh();
    };

    useEffect(() => {
        if (open && initialTask?.id) {
            debouncedRefresh();
        }

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, [open, initialTask?.id]);

    useEffect(() => {
        if (task) {
            setTempTitle(task.title);
            setTempDescription(task.description || '');
        }
    }, [task?.title, task?.description]);

    if (!task) return null;

    const createdByUser = users.find(u => u.id === task.created_by);
    const attachments = (currentTaskData?.attachments) || (task as TaskWithAttachments).attachments || [];

    const priorityConfig = {
        low: { color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: 'text-green-400', label: 'Low' },
        medium: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: 'text-yellow-400', label: 'Medium' },
        high: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: 'text-red-400', label: 'High' }
    };

    const statusConfig = {
        todo: { color: 'bg-white/5 text-white/60 border-white/10', label: 'To Do' },
        in_progress: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'In Progress' },
        done: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Done' }
    };

    const getDueDateDisplay = () => {
        if (!task.due_date || !isValidDate(task.due_date)) return null;

        const dueDate = new Date(task.due_date);
        if (task.status === 'done') return { text: safeFormatDate(task.due_date, 'MMM d'), color: 'text-green-400', bg: 'bg-green-500/10' };
        if (isPast(dueDate) && !isToday(dueDate)) return { text: `${safeFormatDate(task.due_date, 'MMM d')} (Overdue)`, color: 'text-red-400', bg: 'bg-red-500/10' };
        if (isToday(dueDate)) return { text: `${safeFormatDate(task.due_date, 'MMM d')} (Today)`, color: 'text-orange-400', bg: 'bg-orange-500/10' };
        if (isTomorrow(dueDate)) return { text: `${safeFormatDate(task.due_date, 'MMM d')} (Tomorrow)`, color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
        return { text: safeFormatDate(task.due_date, 'MMM d'), color: 'text-white/60', bg: 'bg-white/5' };
    };

    const dueDateDisplay = getDueDateDisplay();

    const handleTitleEdit = () => {
        setEditingTitle(true);
        setTimeout(() => titleInputRef.current?.focus(), 0);
    };

    const saveTitleEdit = () => {
        if (tempTitle.trim() && tempTitle !== task.title) {
            onUpdateTask(task.id, { title: tempTitle.trim() });
        }
        setEditingTitle(false);
    };

    const handleDescriptionEdit = () => {
        setEditingDescription(true);
        setTimeout(() => descriptionRef.current?.focus(), 0);
    };

    const saveDescriptionEdit = () => {
        if (tempDescription !== task.description) {
            onUpdateTask(task.id, { description: tempDescription });
        }
        setEditingDescription(false);
    };

    const handleAddComment = () => {
        if (newComment.trim()) {
            onAddComment(task.id, newComment.trim());
            setNewComment('');
        }
    };

    const handleAddSubtask = async () => {
        if (!newSubtask.trim() || isAddingSubtask) return;
        setIsAddingSubtask(true);
        try {
            const { error } = await supabase
                .from('subtasks')
                .insert({
                    task_id: task.id,
                    title: newSubtask.trim(),
                    completed: false,
                    created_at: new Date().toISOString()
                });
            if (error) throw error;
            setNewSubtask('');
            await debouncedRefresh();
        } catch (err) {
            console.error('Error adding subtask:', err);
        } finally {
            setIsAddingSubtask(false);
        }
    };

    const handleToggleSubtask = async (subtaskId: string) => {
        try {
            const subtask = task.subtasks?.find((st: any) => st.id === subtaskId);
            if (!subtask) return;

            const { error } = await supabase
                .from('subtasks')
                .update({ completed: !subtask.completed })
                .eq('id', subtaskId);

            if (error) throw error;

            await debouncedRefresh();
        } catch (err) {
            console.error('Error toggling subtask:', err);
        }
    };

    const handleDeleteSubtask = async (subtaskId: string) => {
        try {
            const { error } = await supabase
                .from('subtasks')
                .delete()
                .eq('id', subtaskId);
            if (error) throw error;
            await debouncedRefresh();
        } catch (err) {
            console.error('Error deleting subtask:', err);
        }
    };

    const handleAddAssignee = (userId: string) => {
        const newAssignees = [...(task.assignees || []), userId];
        onUpdateTask(task.id, { assignees: newAssignees });
        setAssigneePopoverOpen(false);
    };

    const handleRemoveAssignee = (userId: string) => {
        const newAssignees = (task.assignees || []).filter((id: string) => id !== userId);
        onUpdateTask(task.id, { assignees: newAssignees });
    };

    const updateDueDate = (date: Date | undefined) => {
        let dueDateString: string | null = null;
        if (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dueDateString = `${year}-${month}-${day}`;
        }
        onUpdateTask(task.id, { due_date: dueDateString });
        setDatePickerOpen(false);
    };

    const updatePriority = (priority: string) => {
        onUpdateTask(task.id, { priority: priority as 'low' | 'medium' | 'high' });
        setPriorityPopoverOpen(false);
    };

    const updateStatus = (status: string) => {
        onUpdateTask(task.id, { status: status as 'todo' | 'in_progress' | 'done' });
        setStatusPopoverOpen(false);
    };

    const subtasks = task.subtasks || [];
    const comments = task.comments || [];
    const completedSubtasks = subtasks.filter((st: any) => st.completed).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 bg-[#1c1c1e]/95 backdrop-blur-xl border-white/10 text-white gap-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>{task.title}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${task.status === 'todo' ? 'bg-white/20' :
                                    task.status === 'in_progress' ? 'bg-blue-500' : 'bg-green-500'
                                }`} />

                            <div className="flex-1">
                                {editingTitle ? (
                                    <input
                                        ref={titleInputRef}
                                        value={tempTitle}
                                        onChange={(e) => setTempTitle(e.target.value)}
                                        onBlur={saveTitleEdit}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveTitleEdit();
                                            if (e.key === 'Escape') setEditingTitle(false);
                                        }}
                                        className="text-xl font-semibold bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-blue-500 rounded w-full p-1 text-white"
                                    />
                                ) : (
                                    <h2
                                        className="text-xl font-semibold hover:text-blue-400 cursor-pointer transition-colors text-white"
                                        onClick={handleTitleEdit}
                                        title="Click to edit title"
                                    >
                                        {task.title}
                                    </h2>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRefreshDialog}
                                    disabled={isRefreshing}
                                    className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                                    title="Refresh task data"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </Button>
                                <Badge variant="outline" className="text-xs font-mono text-white/40 border-white/10">
                                    #{task.id.slice(-6)}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                            {/* Main Content */}
                            <div className="lg:col-span-2 p-6 space-y-6">
                                {/* Description */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-white/90">Description</h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleDescriptionEdit}
                                            className="h-6 w-6 p-0 text-white/40 hover:text-white"
                                        >
                                            <Edit3 className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {editingDescription ? (
                                        <div className="space-y-2">
                                            <Textarea
                                                ref={descriptionRef}
                                                value={tempDescription}
                                                onChange={(e) => setTempDescription(e.target.value)}
                                                placeholder="Add a description..."
                                                rows={4}
                                                className="resize-none bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-0"
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={saveDescriptionEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
                                                    Save
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setEditingDescription(false)} className="border-white/10 text-white hover:bg-white/10">
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="min-h-[80px] p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors border border-transparent hover:border-white/5"
                                            onClick={handleDescriptionEdit}
                                        >
                                            {task.description ? (
                                                <p className="text-white/80 whitespace-pre-wrap">{task.description}</p>
                                            ) : (
                                                <p className="text-white/20 italic">Click to add description...</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Attachments */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-white/90">
                                            Attachments ({attachments.length})
                                        </h3>
                                        <div className="flex gap-2">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e.target.files)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="text-xs text-white/60 hover:text-white hover:bg-white/10 border border-white/5"
                                            >
                                                {isUploading ? (
                                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                ) : (
                                                    <Paperclip className="h-3 w-3 mr-1" />
                                                )}
                                                {isUploading ? 'Uploading...' : 'Add Files'}
                                            </Button>
                                        </div>
                                    </div>

                                    {uploadError && (
                                        <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/20 text-red-200">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{uploadError}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="space-y-2">
                                        {attachments.map((attachment: TaskAttachment) => {
                                            const FileIcon = getFileIcon(attachment.file_type);
                                            const uploader = users.find(u => u.id === attachment.uploaded_by);

                                            return (
                                                <div key={attachment.id} className="group flex items-center gap-3 p-3 border border-white/5 rounded-lg hover:bg-white/5 bg-white/5 pb-3">
                                                    <FileIcon className="h-8 w-8 text-white/40 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm text-white truncate">
                                                            {attachment.file_name}
                                                        </div>
                                                        <div className="text-xs text-white/40">
                                                            {formatFileSize(attachment.file_size)} •
                                                            Uploaded by {uploader?.name || 'Unknown'} •
                                                            {safeFormatDate(attachment.created_at, 'MMM d, h:mm a')}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isImageFile(attachment.file_type) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-white/60 hover:text-white"
                                                                onClick={() => window.open(attachment.file_url, '_blank')}
                                                                title="Preview image"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-white/60 hover:text-white"
                                                            onClick={() => handleDownloadAttachment(attachment)}
                                                            title="Download file"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-white/40 hover:text-red-400"
                                                            onClick={() => handleDeleteAttachment(attachment)}
                                                            title="Delete attachment"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {attachments.length === 0 && (
                                            <div
                                                className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center cursor-pointer hover:border-white/20 hover:bg-white/5 transition-colors"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Upload className="h-8 w-8 text-white/20 mx-auto mb-2" />
                                                <p className="text-sm text-white/40 mb-1">Click to upload files</p>
                                                <p className="text-xs text-white/20">or drag and drop</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Subtasks */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium text-white/90">
                                            Subtasks ({completedSubtasks}/{subtasks.length})
                                        </h3>
                                        {subtasks.length > 0 && (
                                            <div className="text-xs text-white/40">
                                                {Math.round((completedSubtasks / subtasks.length) * 100)}% complete
                                            </div>
                                        )}
                                    </div>

                                    {subtasks.length > 0 && (
                                        <div className="w-full bg-white/10 rounded-full h-2 mb-4">
                                            <div
                                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {subtasks.map((subtask: any) => (
                                            <div key={subtask.id} className="group flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5">
                                                <button
                                                    onClick={() => handleToggleSubtask(subtask.id)}
                                                    className="flex-shrink-0 hover:scale-110 transition-transform"
                                                >
                                                    {subtask.completed ? (
                                                        <CheckSquare className="h-5 w-5 text-green-500" />
                                                    ) : (
                                                        <Square className="h-5 w-5 text-white/40 hover:text-white/60" />
                                                    )}
                                                </button>
                                                <span className={`flex-1 ${subtask.completed ? 'line-through text-white/40' : 'text-white/80'}`}>
                                                    {subtask.title}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-red-400"
                                                    onClick={() => handleDeleteSubtask(subtask.id)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}

                                        <div className="flex gap-2 mt-3">
                                            <Input
                                                placeholder="Add a subtask..."
                                                value={newSubtask}
                                                onChange={(e) => setNewSubtask(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-0"
                                                disabled={isAddingSubtask}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleAddSubtask}
                                                disabled={!newSubtask.trim() || isAddingSubtask}
                                                className="bg-white text-black hover:bg-white/90"
                                            >
                                                {isAddingSubtask ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Plus className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments */}
                                <div>
                                    <h3 className="font-medium text-white/90 mb-3">
                                        Comments ({comments.length})
                                    </h3>

                                    <div className="space-y-4">
                                        {comments.map((comment: any) => {
                                            const author = users.find(u => u.id === comment.author);
                                            return (
                                                <div key={comment.id} className="flex gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                                        <AvatarFallback className="bg-blue-500/20 text-blue-200 text-xs border border-blue-500/30">
                                                            {author ? author.name.charAt(0).toUpperCase() : '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-sm text-white/90">
                                                                {author?.name || 'Unknown User'}
                                                            </span>
                                                            <span className="text-xs text-white/40">
                                                                {isValidDate(comment.created_at)
                                                                    ? safeFormatDate(comment.created_at, 'MMM d, h:mm a')
                                                                    : 'No date'
                                                                }
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-white/70 whitespace-pre-wrap">{comment.content}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div className="flex gap-2">
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarFallback className="bg-white/10 text-white/40 text-xs">
                                                    You
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-2">
                                                <Textarea
                                                    placeholder="Add a comment..."
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    rows={2}
                                                    className="resize-none bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-0"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={handleAddComment}
                                                    disabled={!newComment.trim()}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    <Send className="h-4 w-4 mr-2" />
                                                    Comment
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Properties Sidebar */}
                            <div className="lg:col-span-1 bg-white/5 p-6 space-y-6 border-l border-white/10">
                                {/* Status */}
                                <div>
                                    <Label className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2 block">
                                        Status
                                    </Label>
                                    <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white font-normal">
                                                <div className={`w-2 h-2 rounded-full mr-2 ${statusConfig[task.status as keyof typeof statusConfig]?.color.split(' ')[0] || 'bg-white/20'}`} />
                                                {statusConfig[task.status as keyof typeof statusConfig]?.label || task.status}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-48 p-1 bg-[#1c1c1e] border-white/10 text-white" align="start">
                                            {Object.entries(statusConfig).map(([status, config]) => (
                                                <Button
                                                    key={status}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-start text-white hover:bg-white/10"
                                                    onClick={() => updateStatus(status)}
                                                >
                                                    <div className={`w-2 h-2 rounded-full mr-2 ${config.color.split(' ')[0]}`} />
                                                    {config.label}
                                                </Button>
                                            ))}
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Priority */}
                                <div>
                                    <Label className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2 block">
                                        Priority
                                    </Label>
                                    <Popover open={priorityPopoverOpen} onOpenChange={setPriorityPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white font-normal">
                                                <Flag className={`h-4 w-4 mr-2 ${task.priority === 'high' ? 'text-red-400' :
                                                        task.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                                                    }`} />
                                                {priorityConfig[task.priority as keyof typeof priorityConfig]?.label || task.priority}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-40 p-1 bg-[#1c1c1e] border-white/10 text-white" align="start">
                                            {Object.entries(priorityConfig).map(([priority, config]) => (
                                                <Button
                                                    key={priority}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-start text-white hover:bg-white/10"
                                                    onClick={() => updatePriority(priority)}
                                                >
                                                    <Flag className={`h-4 w-4 mr-2 ${config.icon}`} />
                                                    {config.label}
                                                </Button>
                                            ))}
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Due Date */}
                                <div>
                                    <Label className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2 block">
                                        Due Date
                                    </Label>
                                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white font-normal">
                                                <CalendarIcon className="h-4 w-4 mr-2 text-white/40" />
                                                {dueDateDisplay ? (
                                                    <span className={dueDateDisplay.color}>{dueDateDisplay.text}</span>
                                                ) : (
                                                    <span className="text-white/40">Set due date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-[#1c1c1e] border-white/10 text-white" align="start">
                                            <div className="p-3">
                                                <Calendar
                                                    mode="single"
                                                    selected={task.due_date ? new Date(task.due_date) : undefined}
                                                    onSelect={updateDueDate}
                                                    initialFocus
                                                    className="bg-[#1c1c1e] text-white"
                                                />
                                                {task.due_date && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full mt-2 border-white/10 text-white hover:bg-white/10"
                                                        onClick={() => updateDueDate(undefined)}
                                                    >
                                                        Remove due date
                                                    </Button>
                                                )}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Assignees */}
                                <div>
                                    <Label className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2 block">
                                        Assignees
                                    </Label>
                                    <div className="space-y-2">
                                        {assignedUsers.map(user => (
                                            <div key={user.id} className="flex items-center justify-between group bg-white/5 rounded-lg p-2 border border-transparent hover:border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarFallback className="text-xs bg-blue-500/20 text-blue-200">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-medium text-white/90">{user.name}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-red-400"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleRemoveAssignee(user.id);
                                                    }}
                                                    type="button"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}

                                        <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full justify-start text-white/40 border-dashed border-white/10 bg-transparent hover:bg-white/5 hover:text-white"
                                                >
                                                    <UserPlus className="h-4 w-4 mr-2" />
                                                    Add assignee
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-56 p-1 bg-[#1c1c1e] border-white/10 text-white" align="start">
                                                {unassignedUsers.map(user => (
                                                    <div
                                                        key={user.id}
                                                        className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-md cursor-pointer"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleAddAssignee(user.id);
                                                        }}
                                                    >
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-xs bg-blue-500/20 text-blue-200">
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">{user.name}</span>
                                                    </div>
                                                ))}
                                                {unassignedUsers.length === 0 && (
                                                    <p className="p-4 text-center text-sm text-white/40">All users assigned</p>
                                                )}
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Tags */}
                                {task.tags && task.tags.length > 0 && (
                                    <div>
                                        <Label className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2 block">
                                            Tags
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {task.tags.map((tag: string, index: number) => (
                                                <Badge key={index} variant="secondary" className="bg-white/10 text-white/80 border-white/5">
                                                    <Tag className="h-3 w-3 mr-1" />
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Meta Info */}
                                <div className="pt-4 border-t border-white/10">
                                    <div className="text-xs text-white/40 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <User className="h-3 w-3" />
                                            <span>Created by {createdByUser?.name || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                                Created {isValidDate(task.created_at)
                                                    ? safeFormatDate(task.created_at, 'MMM d, yyyy')
                                                    : 'unknown date'
                                                }
                                            </span>
                                        </div>
                                        {task.updated_at && task.updated_at !== task.created_at && (
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                    Updated {isValidDate(task.updated_at)
                                                        ? safeFormatDate(task.updated_at, 'MMM d, yyyy')
                                                        : 'unknown date'
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const Label = ({ children, className = '', ...props }: any) => (
    <label className={`text-sm font-medium ${className}`} {...props}>
        {children}
    </label>
);
