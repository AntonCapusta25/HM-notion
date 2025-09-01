import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Task, User, Workspace, formatTaskFromSupabase } from '../types';
// ADD THIS IMPORT:
import { RealtimeChannel } from '@supabase/supabase-js';

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
  // FIXED: Accept user profile data as parameters instead of calling useProfile internally
  userProfile?: { id: string } | null;
}

export const useTaskStore = (props: UseTaskStoreProps = {}) => {
  const { filters = {}, userProfile } = props;
  
  // FIXED: Only call useAuth, not useProfile (to avoid hook ordering issues)
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(mockWorkspaces);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FIXED: Use useMemo to prevent infinite re-renders
  const filtersJSON = useMemo(() => JSON.stringify(filters), [filters]);

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
              // FIXED: Use passed userProfile or fallback to user.id
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
  }, [user?.id, userProfile?.id, filtersJSON]); // FIXED: Use stable IDs

  // Separate function to fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('workspaces').select('*');
      if (error) throw error;
      if (data) setWorkspaces(data);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    }
  }, [user?.id]);

  // FIXED: Separated initial data fetches with stable dependencies
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
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
  }, [user?.id]); // FIXED: Use stable user ID

  // ENHANCED: Real-time subscriptions for both tasks and workspaces
  useEffect(() => {
    let tasksSubscription: RealtimeChannel;
    let workspacesSubscription: RealtimeChannel;

    if (user?.id) {
      console.log('Setting up real-time subscriptions...');
      
      // Subscribe to tasks table changes
      tasksSubscription = supabase
        .channel('tasks-realtime')
        .on('postgres_changes', {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'tasks'
        }, (payload) => {
          console.log('Tasks realtime update:', payload);
          // Refetch tasks when any change happens
          fetchTasks();
        })
        .subscribe();

      // Subscribe to workspaces table changes
      workspacesSubscription = supabase
        .channel('workspaces-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public', 
          table: 'workspaces'
        }, (payload) => {
          console.log('Workspaces realtime update:', payload);
          // Refetch workspaces when any change happens
          fetchWorkspaces();
        })
        .subscribe();
    }

    // Cleanup subscriptions when component unmounts or user changes
    return () => {
      if (tasksSubscription) {
        console.log('Cleaning up tasks subscription');
        tasksSubscription.unsubscribe();
      }
      if (workspacesSubscription) {
        console.log('Cleaning up workspaces subscription');
        workspacesSubscription.unsubscribe();
      }
    };
  }, [user?.id, fetchTasks, fetchWorkspaces]);

  // FIXED: Updated createTask to use passed userProfile or fallback
  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'createdBy'>) => {
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
        created_by: userId,
        workspace_id: taskData.workspace_id || null
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
      if (taskData.assignedTo && taskData.assignedTo !== userId) {
        await supabase.from('notifications').insert([{ user_id: taskData.assignedTo, task_id: data.id, type: 'task_assigned', message: `You have been assigned to: ${taskData.title}` }]);
      }
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
      throw err;
    }
  }, [user?.id, userProfile?.id]);

  // FIXED: Updated updateTask to use passed userProfile or fallback
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
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
      if (updates.workspace_id !== undefined) supabaseUpdates.workspace_id = updates.workspace_id;
      
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
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
      throw err;
    }
  }, [tasks, user?.id, userProfile?.id]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!user) throw new Error('Cannot delete task: user not authenticated.');
    
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task');
      throw err;
    }
  }, [user?.id]);

  const addComment = useCallback(async (taskId: string, content: string) => {
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
  }, [user?.id, userProfile?.id]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
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
  }, [tasks, user?.id]);

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
