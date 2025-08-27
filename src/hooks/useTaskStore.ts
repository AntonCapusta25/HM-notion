import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  const { userProfile, user } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(mockWorkspaces);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FIX: Stabilize the filters object dependency to prevent re-renders
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
              if (userProfile) {
                query = query.or(`assigned_to.eq.${userProfile.id},created_by.eq.${userProfile.id}`);
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

  // FIX: Separated initial data fetches into one effect
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

  // FIX: Separated real-time subscription into its own effect to prevent loops
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

  // RESTORED: Your full, original logic for creating tasks
  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'createdBy'>) => {
    if (!userProfile) throw new Error('Cannot create task: no user profile.');
    try {
      const { data, error } = await supabase.from('tasks').insert([{
        title: taskData.title,
        description: taskData.description,
        due_date: taskData.dueDate || null,
        assigned_to: taskData.assignedTo || null,
        priority: taskData.priority,
        status: taskData.status,
        created_by: userProfile.id,
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
      if (taskData.assignedTo && taskData.assignedTo !== userProfile.id) {
        await supabase.from('notifications').insert([{ user_id: taskData.assignedTo, task_id: data.id, type: 'task_assigned', message: `You have been assigned to: ${taskData.title}` }]);
      }
      // NOTE: Manual fetchTasks() is no longer needed here. The real-time subscription will handle it.
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
    }
  }, [userProfile, fetchTasks]);

  // RESTORED: Your full, original logic for updating tasks
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!userProfile) throw new Error('Cannot update task: no user profile.');
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
    }
  }, [tasks, userProfile, fetchTasks]);

  // RESTORED: Your original logic
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      // NOTE: Manual fetchTasks() is no longer needed here.
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task');
    }
  }, [fetchTasks]);

  // RESTORED: Your full, original logic for adding comments
  const addComment = useCallback(async (taskId: string, content: string) => {
    if (!userProfile) return;
    try {
      const { error } = await supabase.from('comments').insert([{ task_id: taskId, content: content, author: userProfile.id }]);
      if (error) throw error;
      const task = tasks.find(t => t.id === taskId);
      if (task && task.assignedTo && task.assignedTo !== userProfile.id) {
        await supabase.from('notifications').insert([{ user_id: task.assignedTo, task_id: taskId, type: 'comment_added', message: `${userProfile.name} commented on: ${task.title}` }]);
      }
      // NOTE: Manual fetchTasks() is no longer needed here.
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    }
  }, [userProfile, tasks, fetchTasks]);

  // RESTORED: Your full, original logic for toggling subtasks
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    if (!userProfile) return;
    try {
      const task = tasks.find(t => t.id === taskId);
      const subtask = task?.subtasks.find(st => st.id === subtaskId);
      if (!subtask) return;
      const { error } = await supabase.from('subtasks').update({ completed: !subtask.completed }).eq('id', subtaskId);
      if (error) throw error;
      if (!subtask.completed && task) {
        await supabase.from('notifications').insert([{ user_id: task.assignedTo || task.createdBy, task_id: taskId, type: 'subtask_completed', message: `${userProfile.name} completed subtask: ${subtask.title}` }]);
      }
      // NOTE: Manual fetchTasks() is no longer needed here.
    } catch (err) {
      console.error('Error toggling subtask:', err);
      setError('Failed to toggle subtask');
    }
  }, [tasks, userProfile, fetchTasks]);

  return {
    tasks,
    users,
    workspaces,
    currentUser: userProfile,
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
