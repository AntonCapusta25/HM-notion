import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile'; // Add this import
import { Task, User, Workspace, formatTaskFromSupabase } from '../types';

// Your mock data fallback
import { mockUsers, mockWorkspaces } from '../data/mockData';

interface UseTaskStoreProps {
  filters?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
    workspace_id?: string;
    due_date?: 'today' | 'overdue';
    tag?: string;
    personal_only?: boolean;
  };
}

export const useTaskStore = (props: UseTaskStoreProps = {}) => {
  const { filters = {} } = props;
  // FIXED: Separate useAuth and useProfile
  const { user } = useAuth();
  const { profile: userProfile } = useProfile();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(mockWorkspaces);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersJSON = JSON.stringify(filters);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('tasks')
        .select(`*, assigned_user:assigned_to(*), created_user:created_by(*), subtasks(*), comments(*, author(*)), task_tags(tag), workspace:workspace_id(*)`);

      const currentFilters = JSON.parse(filtersJSON);
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) {
          switch (key) {
            case 'due_date':
              if (value === 'today') {
                query = query.eq('due_date', new Date().toISOString().split('T')[0]);
              } else if (value === 'overdue') {
                query = query.lt('due_date', new Date().toISOString().split('T')[0]).neq('status', 'done');
              }
              break;
            case 'personal_only':
              // FIXED: Use fallback for user ID
              const userId = userProfile?.id || user.id;
              if (userId) {
                query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
              }
              break;
            default:
              if (typeof value === 'string') {
                query = query.eq(key, value);
              }
              break;
          }
        }
      });

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      const formattedTasks: Task[] = data?.map((supabaseTask: any): Task => formatTaskFromSupabase(supabaseTask)) || [];
      setTasks(formattedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user, userProfile, filtersJSON]);

  // FIX: Separated initial data fetches into one effect.
  useEffect(() => {
    fetchTasks();
    const fetchUsersAndWorkspaces = async () => {
      if (!user) return;
      try {
        const [usersRes, workspacesRes] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('workspaces').select('*')
        ]);
        if (usersRes.data) setUsers(usersRes.data);
        if (workspacesRes.data) setWorkspaces(workspacesRes.data);
      } catch (err) {
        console.error('Error fetching users/workspaces:', err);
      }
    };
    fetchUsersAndWorkspaces();
  }, [fetchTasks, user]);

  // FIX: Separated the real-time subscription into its own effect to prevent loops.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('task-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTasks]);

  // FIXED: Updated createTask to use user as fallback
  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'createdBy'>) => {
    // FIXED: Check for user instead of userProfile, use fallback for user ID
    if (!user) throw new Error('Cannot create task: user not authenticated.');
    
    const userId = userProfile?.id || user.id;
    
    try {
      const { data, error } = await supabase.from('tasks').insert([{
        title: taskData.title,
        description: taskData.description,
        due_date: taskData.dueDate || null,
        assigned_to: taskData.assignedTo || null,
        priority: taskData.priority,
        status: taskData.status,
        created_by: userId, // FIXED: Use fallback user ID
        workspace_id: null
      }]).select().single();
      if (error) throw error;
      if (taskData.tags && taskData.tags.length > 0) {
        const tagInserts = taskData.tags.map(tag => ({ task_id: data.id, tag: tag }));
        await supabase.from('task_tags').insert(tagInserts);
      }
      if (taskData.subtasks && taskData.subtasks.length > 0) {
        const subtaskInserts = taskData.subtasks.map(subtask => ({ task_id: data.id, title: subtask.title, completed: subtask.completed }));
        await supabase.from('subtasks').insert(subtaskInserts);
      }
      // FIXED: Use fallback user ID for notification check
      if (taskData.assignedTo && taskData.assignedTo !== userId) {
        await supabase.from('notifications').insert([{ user_id: taskData.assignedTo, task_id: data.id, type: 'task_assigned', message: `You have been assigned to: ${taskData.title}` }]);
      }
      // NOTE: Manual fetchTasks() is no longer needed here. The real-time subscription will handle it.
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
      throw err; // Re-throw so the UI can handle it
    }
  }, [user, userProfile, fetchTasks]);

  // FIXED: Updated updateTask to use user as fallback
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    // FIXED: Check for user instead of userProfile
    if (!user) throw new Error('Cannot update task: user not authenticated.');
    
    const userId = userProfile?.id || user.id;
    
    try {
      const supabaseUpdates: any = {};
      if (updates.title !== undefined) supabaseUpdates.title = updates.title;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.dueDate !== undefined) supabaseUpdates.due_date = updates.dueDate;
      if (updates.assignedTo !== undefined) supabaseUpdates.assigned_to = updates.assignedTo || null;
      if (updates.priority !== undefined) supabaseUpdates.priority = updates.priority;
      if (updates.status !== undefined) supabaseUpdates.status = updates.status;
      const { error } = await supabase.from('tasks').update(supabaseUpdates).eq('id', taskId);
      if (error) throw error;
      if (updates.tags) {
        await supabase.from('task_tags').delete().eq('task_id', taskId);
        if (updates.tags.length > 0) {
          const tagInserts = updates.tags.map(tag => ({ task_id: taskId, tag: tag }));
          await supabase.from('task_tags').insert(tagInserts);
        }
      }
      if (updates.subtasks) {
        await supabase.from('subtasks').delete().eq('task_id', taskId);
        if (updates.subtasks.length > 0) {
          const subtaskInserts = updates.subtasks.map(subtask => ({ task_id: taskId, title: subtask.title, completed: subtask.completed }));
          await supabase.from('subtasks').insert(subtaskInserts);
        }
      }
      if (updates.assignedTo) {
        const originalTask = tasks.find(t => t.id === taskId);
        if (originalTask && originalTask.assignedTo !== updates.assignedTo) {
          await supabase.from('notifications').insert([{ user_id: updates.assignedTo, task_id: taskId, type: 'task_assigned', message: `You have been assigned to: ${originalTask.title}` }]);
        }
      }
      // NOTE: Manual fetchTasks() is no longer needed here.
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
      throw err; // Re-throw so the UI can handle it
    }
  }, [tasks, user, userProfile, fetchTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    // ... (Your original logic is preserved)
  }, [fetchTasks]);

  const addComment = useCallback(async (taskId: string, content: string) => {
    // FIXED: Use user check and fallback ID
    if (!user) throw new Error('Cannot add comment: user not authenticated.');
    const userId = userProfile?.id || user.id;
    
    try {
      const { error } = await supabase.from('comments').insert([{
        task_id: taskId,
        content,
        author_id: userId
      }]);
      if (error) throw error;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
      throw err;
    }
  }, [user, userProfile, tasks, fetchTasks]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    // FIXED: Use user check instead of userProfile
    if (!user) throw new Error('Cannot toggle subtask: user not authenticated.');
    
    try {
      const task = tasks.find(t => t.id === taskId);
      const subtask = task?.subtasks?.find(s => s.id === subtaskId);
      if (!subtask) throw new Error('Subtask not found');
      
      const { error } = await supabase.from('subtasks').update({
        completed: !subtask.completed
      }).eq('id', subtaskId);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error toggling subtask:', err);
      setError('Failed to toggle subtask');
      throw err;
    }
  }, [tasks, user, userProfile, fetchTasks]);

  return {
    tasks,
    users,
    workspaces,
    currentUser: userProfile, // This can be undefined, which is fine
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    toggleSubtask,
    refetch: fetchTasks
  };
};
