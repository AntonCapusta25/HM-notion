import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Task, User, Workspace, SupabaseTask, formatTaskFromSupabase } from '../types';

// Keep as fallback during migration
import { mockUsers, mockWorkspaces } from '../data/mockData';

interface UseTaskStoreProps {
  filters?: {
    status?: string
    priority?: string
    assigned_to?: string
    workspace_id?: string
    due_date?: 'today' | 'overdue'
    tag?: string
    personal_only?: boolean // For "My Tasks" tab
  }
}

export const useTaskStore = (props: UseTaskStoreProps = {}) => {
  const { filters = {} } = props
  const { userProfile, user } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(mockWorkspaces);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks from Supabase
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:assigned_to(id, name, email, avatar, role, department),
          created_user:created_by(id, name, email, avatar, role, department),
          subtasks(*),
          comments(*, author(id, name, avatar)),
          task_tags(tag),
          workspace:workspace_id(id, name, department)
        `)

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          switch (key) {
            case 'status':
              query = query.eq('status', value)
              break
            case 'priority':
              query = query.eq('priority', value)
              break
            case 'assigned_to':
              query = query.eq('assigned_to', value)
              break
            case 'workspace_id':
              query = query.eq('workspace_id', value)
              break
            case 'due_date':
              if (value === 'today') {
                query = query.eq('due_date', new Date().toISOString().split('T')[0])
              } else if (value === 'overdue') {
                query = query.lt('due_date', new Date().toISOString().split('T')[0])
                           .neq('status', 'done')
              }
              break
            case 'personal_only':
              // For "My Tasks" tab - only assigned to or created by current user
              if (value && userProfile) {
                query = query.or(`assigned_to.eq.${userProfile.id},created_by.eq.${userProfile.id}`)
              }
              break
          }
        }
      })

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Convert Supabase format to your existing Task format
      const formattedTasks: Task[] = data?.map((supabaseTask: any): Task => formatTaskFromSupabase(supabaseTask)) || [];

      setTasks(formattedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user, userProfile, JSON.stringify(filters)]);

  // Fetch users and workspaces
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
  }, [user]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchTasks();

    if (!user) return;

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('task-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks'
      }, () => {
        fetchTasks(); // Refetch when tasks change
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [fetchTasks, user]);

  // CRUD Operations - keeping exact same interface as your original!

  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'createdBy'>) => {
    if (!userProfile) {
      console.error('No user profile available');
      return;
    }

    try {
      // Insert task
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: taskData.title,
          description: taskData.description,
          due_date: taskData.dueDate || null,
          assigned_to: taskData.assignedTo || null,
          priority: taskData.priority,
          status: taskData.status,
          created_by: userProfile.id,
          workspace_id: null // Add workspace logic later if needed
        }])
        .select()
        .single();

      if (error) throw error;

      // Add tags
      if (taskData.tags && taskData.tags.length > 0) {
        const tagInserts = taskData.tags.map(tag => ({
          task_id: data.id,
          tag: tag
        }));
        const { error: tagsError } = await supabase.from('task_tags').insert(tagInserts);
        if (tagsError) console.error('Error adding tags:', tagsError);
      }

      // Add subtasks
      if (taskData.subtasks && taskData.subtasks.length > 0) {
        const subtaskInserts = taskData.subtasks.map(subtask => ({
          task_id: data.id,
          title: subtask.title,
          completed: subtask.completed
        }));
        const { error: subtasksError } = await supabase.from('subtasks').insert(subtaskInserts);
        if (subtasksError) console.error('Error adding subtasks:', subtasksError);
      }

      // Create notification if task is assigned to someone
      if (taskData.assignedTo && taskData.assignedTo !== userProfile.id) {
        await supabase.from('notifications').insert([{
          user_id: taskData.assignedTo,
          task_id: data.id,
          type: 'task_assigned',
          message: `You have been assigned to: ${taskData.title}`
        }]);
      }

      // Refresh tasks to get the complete data with relations
      await fetchTasks();
      
      // Return task in your format
      const newTask: Task = {
        id: data.id,
        title: data.title,
        description: data.description,
        dueDate: data.due_date,
        assignedTo: data.assigned_to || '',
        priority: data.priority,
        status: data.status,
        tags: taskData.tags || [],
        subtasks: taskData.subtasks || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by,
        comments: []
      };

      return newTask;

    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
      throw err;
    }
  }, [userProfile, fetchTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      // Convert your format to Supabase format
      const supabaseUpdates: any = {};
      if (updates.title !== undefined) supabaseUpdates.title = updates.title;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.dueDate !== undefined) supabaseUpdates.due_date = updates.dueDate;
      if (updates.assignedTo !== undefined) supabaseUpdates.assigned_to = updates.assignedTo || null;
      if (updates.priority !== undefined) supabaseUpdates.priority = updates.priority;
      if (updates.status !== undefined) supabaseUpdates.status = updates.status;

      const { error } = await supabase
        .from('tasks')
        .update(supabaseUpdates)
        .eq('id', taskId);

      if (error) throw error;

      // Handle tags update
      if (updates.tags) {
        await supabase.from('task_tags').delete().eq('task_id', taskId);
        if (updates.tags.length > 0) {
          const tagInserts = updates.tags.map(tag => ({
            task_id: taskId,
            tag: tag
          }));
          await supabase.from('task_tags').insert(tagInserts);
        }
      }

      // Handle subtasks update
      if (updates.subtasks) {
        // Delete existing subtasks and recreate
        await supabase.from('subtasks').delete().eq('task_id', taskId);
        if (updates.subtasks.length > 0) {
          const subtaskInserts = updates.subtasks.map(subtask => ({
            task_id: taskId,
            title: subtask.title,
            completed: subtask.completed
          }));
          await supabase.from('subtasks').insert(subtaskInserts);
        }
      }

      // Create notification for assignment changes
      if (updates.assignedTo && userProfile) {
        const originalTask = tasks.find(t => t.id === taskId);
        if (originalTask && originalTask.assignedTo !== updates.assignedTo) {
          await supabase.from('notifications').insert([{
            user_id: updates.assignedTo,
            task_id: taskId,
            type: 'task_assigned',
            message: `You have been assigned to: ${originalTask.title}`
          }]);
        }
      }

      // Update will be reflected via real-time subscription
      await fetchTasks();

    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
      throw err;
    }
  }, [tasks, userProfile, fetchTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Update will be reflected via real-time subscription
      await fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task');
      throw err;
    }
  }, [fetchTasks]);

  const addComment = useCallback(async (taskId: string, content: string) => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          task_id: taskId,
          content: content,
          author: userProfile.id
        }])
        .select('*, author(id, name, avatar)')
        .single();

      if (error) throw error;

      // Create notification for task assignee/creator
      const task = tasks.find(t => t.id === taskId);
      if (task && task.assignedTo && task.assignedTo !== userProfile.id) {
        await supabase.from('notifications').insert([{
          user_id: task.assignedTo,
          task_id: taskId,
          type: 'comment_added',
          message: `${userProfile.name} commented on: ${task.title}`
        }]);
      }

      // Update will be reflected via real-time subscription
      await fetchTasks();

    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
      throw err;
    }
  }, [userProfile, tasks, fetchTasks]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      // Find current subtask state
      const task = tasks.find(t => t.id === taskId);
      const subtask = task?.subtasks.find(st => st.id === subtaskId);
      
      if (!subtask) return;

      const { error } = await supabase
        .from('subtasks')
        .update({ completed: !subtask.completed })
        .eq('id', subtaskId);

      if (error) throw error;

      // Create notification when subtask completed
      if (!subtask.completed && userProfile && task) {
        await supabase.from('notifications').insert([{
          user_id: task.assignedTo || task.createdBy,
          task_id: taskId,
          type: 'subtask_completed',
          message: `${userProfile.name} completed subtask: ${subtask.title}`
        }]);
      }

      // Update will be reflected via real-time subscription
      await fetchTasks();

    } catch (err) {
      console.error('Error toggling subtask:', err);
      setError('Failed to toggle subtask');
      throw err;
    }
  }, [tasks, userProfile, fetchTasks]);

  // EXACT SAME RETURN INTERFACE - No component changes needed!
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

// USAGE EXAMPLES:

// Main Dashboard (Team View) - Shows ALL team tasks:
// const { tasks } = useTaskStore()

// My Tasks Tab (Personal View) - Shows only user's tasks:
// const { tasks: myTasks } = useTaskStore({ filters: { personal_only: true } })
