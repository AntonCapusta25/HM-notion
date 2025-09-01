import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Task, User, Workspace, formatTaskFromSupabase } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseTaskStoreOptions {
  userProfile?: { id: string } | null;
}

export const useTaskStore = (options: UseTaskStoreOptions = {}) => {
  const { user } = useAuth();
  const { userProfile } = options;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create stable reference for fetchTasks
  const fetchTasksRef = useRef<() => Promise<void>>();

  const fetchTasks = useCallback(async () => {
    console.log('🔄 fetchTasks called');
    console.log('  - user:', user?.id);
    console.log('  - userProfile:', userProfile?.id);

    if (!user) {
      console.log('❌ No user found, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('⏳ Starting task fetch...');

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          comments(*),
          subtasks(*),
          task_tags(tag),
          task_assignees(user_id)
        `);

      if (error) {
        console.error('❌ Task fetch error:', error);
        setError(error.message);
        return;
      }

      console.log('✅ Raw data from Supabase:', data?.length || 0, 'records');

      const formattedTasks = (data || []).map(supabaseTask => {
        // Convert to proper format
        const task = {
          id: supabaseTask.id,
          title: supabaseTask.title || '',
          description: supabaseTask.description || '',
          priority: supabaseTask.priority,
          status: supabaseTask.status,
          createdBy: supabaseTask.created_by,
          workspaceId: supabaseTask.workspace_id,
          created_at: supabaseTask.created_at,
          updated_at: supabaseTask.updated_at,
          due_date: supabaseTask.due_date,
          assigned_to: supabaseTask.assigned_to,
          assignees: (supabaseTask.task_assignees || []).map((a: { user_id: string }) => a.user_id),
          tags: (supabaseTask.task_tags || []).map((t: { tag: string }) => t.tag),
          subtasks: supabaseTask.subtasks || [],
          comments: (supabaseTask.comments || []).map((c: any) => ({
            ...c,
            createdAt: c.created_at || new Date().toISOString()
          })),
          task_tags: supabaseTask.task_tags,
          task_assignees: supabaseTask.task_assignees
        };

        return formatTaskFromSupabase(task);
      });

      console.log('📝 Formatted tasks:', formattedTasks.length, 'tasks');
      console.log('📋 Task titles:', formattedTasks.map(t => t.title));
      setTasks(formattedTasks);
      console.log('✅ Tasks state updated successfully');
      setError(null);
    } catch (err: any) {
      console.error('❌ Failed to fetch tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('⏹️ fetchTasks completed');
    }
  }, [user?.id, userProfile?.id]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      
      console.log('👥 Users response:', data?.length || 0, 'users');
      setUsers(data || []);
      console.log('✅ Users state updated');
    } catch (err: any) {
      console.error('❌ Failed to fetch users:', err);
    }
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('workspaces').select('*');
      if (error) throw error;
      
      console.log('🏢 Workspaces response:', data?.length || 0, 'workspaces');
      setWorkspaces(data || []);
      console.log('✅ Workspaces state updated');
    } catch (err: any) {
      console.error('❌ Failed to fetch workspaces:', err);
    }
  }, []);

  // Update the ref when fetchTasks changes
  fetchTasksRef.current = fetchTasks;

  useEffect(() => {
    console.log('📡 Initial data fetch useEffect triggered');
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    console.log('👥 Users and workspaces fetch useEffect triggered');
    if (user) {
      fetchUsers();
      fetchWorkspaces();
    }
  }, [user, fetchUsers, fetchWorkspaces]);

  // FIXED: Real-time subscriptions with proper cleanup
  useEffect(() => {
    let tasksSubscription: RealtimeChannel;
    let workspacesSubscription: RealtimeChannel;

    if (user?.id) {
      console.log('🔴 Setting up real-time subscriptions...');
      
      // Subscribe to tasks table changes
      tasksSubscription = supabase
        .channel('tasks-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tasks'
        }, (payload) => {
          console.log('🔥 REALTIME: Tasks update received!', payload);
          console.log('🔄 Triggering fetchTasks...');
          if (fetchTasksRef.current) {
            fetchTasksRef.current();
          }
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
          console.log('🔥 REALTIME: Workspaces update received!', payload);
          fetchWorkspaces();
        })
        .subscribe();
    }

    return () => {
      if (tasksSubscription) {
        console.log('🧹 Cleaning up tasks subscription');
        tasksSubscription.unsubscribe();
      }
      if (workspacesSubscription) {
        console.log('🧹 Cleaning up workspaces subscription');
        workspacesSubscription.unsubscribe();
      }
    };
  }, [user?.id]); // Only depend on user?.id

  const createTask = useCallback(async (taskData: Partial<Task>) => {
    console.log('📝 createTask called');
    console.log('  - taskData:', taskData);
    console.log('  - user:', user?.id);
    console.log('  - userProfile:', userProfile?.id);

    if (!user) throw new Error("User not authenticated");

    const userId = userProfile?.id || user.id;
    console.log('  - Using userId:', userId);

    const { assignees, tags, subtasks, ...restOfTaskData } = taskData;
    
    console.log('⏳ Inserting task to Supabase...');
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({ 
        ...restOfTaskData, 
        created_by: userId,
        workspace_id: taskData.workspaceId
      })
      .select()
      .single();
      
    if (error) {
      console.error('❌ Task creation error:', error);
      throw error;
    }

    console.log('✅ Task created:', newTask);

    // Handle many-to-many relationships
    if (assignees && assignees.length > 0) {
      const links = assignees.map(userId => ({ task_id: newTask.id, user_id: userId }));
      const { error: assigneesError } = await supabase.from('task_assignees').insert(links);
      if (assigneesError) console.error('❌ Assignees error:', assigneesError);
    }

    if (tags && tags.length > 0) {
      const links = tags.map(tag => ({ task_id: newTask.id, tag: tag }));
      const { error: tagsError } = await supabase.from('task_tags').insert(links);
      if (tagsError) console.error('❌ Tags error:', tagsError);
    }

    if (subtasks && subtasks.length > 0) {
      const links = subtasks.map(subtask => ({ ...subtask, id: undefined, task_id: newTask.id }));
      const { error: subtasksError } = await supabase.from('subtasks').insert(links);
      if (subtasksError) console.error('❌ Subtasks error:', subtasksError);
    }

    console.log('✅ Task creation completed successfully');
  }, [user?.id, userProfile?.id]);

  const updateAssignees = async (taskId: string, assigneeIds: string[]) => {
    await supabase.from('task_assignees').delete().eq('task_id', taskId);
    if (assigneeIds.length > 0) {
      const newAssignments = assigneeIds.map(userId => ({ task_id: taskId, user_id: userId }));
      await supabase.from('task_assignees').insert(newAssignments);
    }
  };

  const updateTags = async (taskId: string, tags: string[]) => {
    await supabase.from('task_tags').delete().eq('task_id', taskId);
    if (tags.length > 0) {
      const newTags = tags.map(tag => ({ task_id: taskId, tag: tag }));
      await supabase.from('task_tags').insert(newTags);
    }
  };

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const { assignees, tags, subtasks, ...restOfUpdates } = updates;
    await supabase.from('tasks').update(restOfUpdates).eq('id', taskId);
    
    if (assignees) await updateAssignees(taskId, assignees);
    if (tags) await updateTags(taskId, tags);
  }, []);
  
  const deleteTask = useCallback(async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
  }, []);

  const addComment = useCallback(async (taskId: string, content: string) => {
    if (!user) throw new Error("User not authenticated");
    
    const { error } = await supabase.from('comments').insert({ 
      task_id: taskId, 
      content, 
      author: user.id,
      created_at: new Date().toISOString()
    });
    
    if (error) throw error;
  }, [user?.id]);
  
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    // First get current subtask state
    const { data: subtask } = await supabase
      .from('subtasks')
      .select('completed')
      .eq('id', subtaskId)
      .single();
    
    if (subtask) {
      await supabase
        .from('subtasks')
        .update({ completed: !subtask.completed })
        .eq('id', subtaskId);
    }
  }, []);
  
  return { 
    tasks, 
    users, 
    workspaces, 
    loading, 
    error, 
    createTask, 
    updateTask, 
    deleteTask, 
    addComment, 
    updateAssignees, 
    updateTags, 
    toggleSubtask
  };
};
