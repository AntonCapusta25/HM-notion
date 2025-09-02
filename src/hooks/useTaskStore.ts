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

      // FIXED: Pass raw Supabase data directly to formatTaskFromSupabase
      const formattedTasks = (data || []).map(supabaseTask => {
        return formatTaskFromSupabase(supabaseTask);
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

  // ADDED: Expose refreshTasks method for manual refresh
  const refreshTasks = useCallback(async () => {
    console.log('🔄 refreshTasks called - manual refresh');
    await fetchTasks();
  }, [fetchTasks]);

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

  // ENHANCED: Real-time subscriptions with better logging and error handling
  useEffect(() => {
    let tasksSubscription: RealtimeChannel;
    let workspacesSubscription: RealtimeChannel;

    if (user?.id) {
      console.log('🔴 Setting up real-time subscriptions for user:', user.id);
      
      // Subscribe to tasks table changes
      tasksSubscription = supabase
        .channel('tasks-realtime-' + user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tasks'
        }, (payload) => {
          console.log('🔥 REALTIME: Tasks update received!', {
            eventType: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old
          });
          console.log('🔄 Triggering fetchTasks from real-time...');
          
          // Use a small delay to ensure database consistency
          setTimeout(() => {
            if (fetchTasksRef.current) {
              fetchTasksRef.current();
            }
          }, 100);
        })
        .subscribe((status) => {
          console.log('📡 Tasks subscription status:', status);
        });

      // Subscribe to related tables that affect tasks
      const relatedTablesChannel = supabase
        .channel('task-related-' + user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'task_assignees'
        }, (payload) => {
          console.log('🔥 REALTIME: Task assignees update!', payload);
          setTimeout(() => {
            if (fetchTasksRef.current) {
              fetchTasksRef.current();
            }
          }, 100);
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'task_tags'
        }, (payload) => {
          console.log('🔥 REALTIME: Task tags update!', payload);
          setTimeout(() => {
            if (fetchTasksRef.current) {
              fetchTasksRef.current();
            }
          }, 100);
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'comments'
        }, (payload) => {
          console.log('🔥 REALTIME: Comments update!', payload);
          setTimeout(() => {
            if (fetchTasksRef.current) {
              fetchTasksRef.current();
            }
          }, 100);
        })
        .subscribe((status) => {
          console.log('📡 Related tables subscription status:', status);
        });

      // Subscribe to workspaces table changes  
      workspacesSubscription = supabase
        .channel('workspaces-realtime-' + user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'workspaces'
        }, (payload) => {
          console.log('🔥 REALTIME: Workspaces update received!', payload);
          fetchWorkspaces();
        })
        .subscribe((status) => {
          console.log('📡 Workspaces subscription status:', status);
        });
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
    console.log('  - workspace_id from taskData:', taskData.workspace_id);
    console.log('  - workspaceId from taskData:', taskData.workspaceId);
    
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({ 
        ...restOfTaskData, 
        created_by: userId,
        // Fixed: Use workspace_id (snake_case) instead of workspaceId (camelCase)
        workspace_id: taskData.workspace_id || null
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
      console.log('Adding assignees:', assignees);
      const links = assignees.map(userId => ({ task_id: newTask.id, user_id: userId }));
      const { error: assigneesError } = await supabase.from('task_assignees').insert(links);
      if (assigneesError) console.error('❌ Assignees error:', assigneesError);
    }

    if (tags && tags.length > 0) {
      console.log('Adding tags:', tags);
      const links = tags.map(tag => ({ task_id: newTask.id, tag: tag }));
      const { error: tagsError } = await supabase.from('task_tags').insert(links);
      if (tagsError) console.error('❌ Tags error:', tagsError);
    }

    if (subtasks && subtasks.length > 0) {
      console.log('Adding subtasks:', subtasks);
      const links = subtasks.map(subtask => ({ ...subtask, id: undefined, task_id: newTask.id }));
      const { error: subtasksError } = await supabase.from('subtasks').insert(links);
      if (subtasksError) console.error('❌ Subtasks error:', subtasksError);
    }

    console.log('✅ Task creation completed successfully');
    
    // ADDED: Force refresh after task creation to ensure immediate UI update
    setTimeout(() => {
      console.log('🔄 Force refreshing tasks after creation...');
      refreshTasks();
    }, 200);
    
  }, [user?.id, userProfile?.id, refreshTasks]);

  const updateAssignees = async (taskId: string, assigneeIds: string[]) => {
    console.log('Updating assignees for task:', taskId, 'assignees:', assigneeIds);
    await supabase.from('task_assignees').delete().eq('task_id', taskId);
    if (assigneeIds.length > 0) {
      const newAssignments = assigneeIds.map(userId => ({ task_id: taskId, user_id: userId }));
      await supabase.from('task_assignees').insert(newAssignments);
    }
  };

  const updateTags = async (taskId: string, tags: string[]) => {
    console.log('Updating tags for task:', taskId, 'tags:', tags);
    await supabase.from('task_tags').delete().eq('task_id', taskId);
    if (tags.length > 0) {
      const newTags = tags.map(tag => ({ task_id: taskId, tag: tag }));
      await supabase.from('task_tags').insert(newTags);
    }
  };

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    console.log('Updating task:', taskId, 'updates:', updates);
    const { assignees, tags, subtasks, ...restOfUpdates } = updates;
    
    // Update main task fields
    const { error } = await supabase.from('tasks').update(restOfUpdates).eq('id', taskId);
    if (error) {
      console.error('Task update error:', error);
      throw error;
    }
    
    // Update related data
    if (assignees !== undefined) await updateAssignees(taskId, assignees);
    if (tags !== undefined) await updateTags(taskId, tags);
    
    // ADDED: Force refresh after task update
    setTimeout(() => {
      console.log('🔄 Force refreshing tasks after update...');
      refreshTasks();
    }, 200);
    
  }, [refreshTasks]);
  
  const deleteTask = useCallback(async (taskId: string) => {
    console.log('Deleting task:', taskId);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
    
    // ADDED: Force refresh after task deletion
    setTimeout(() => {
      console.log('🔄 Force refreshing tasks after deletion...');
      refreshTasks();
    }, 200);
    
  }, [refreshTasks]);

  const addComment = useCallback(async (taskId: string, content: string) => {
    if (!user) throw new Error("User not authenticated");
    
    console.log('Adding comment to task:', taskId);
    const { error } = await supabase.from('comments').insert({ 
      task_id: taskId, 
      content, 
      author: user.id,
      created_at: new Date().toISOString()
    });
    
    if (error) throw error;
    
    // ADDED: Force refresh after adding comment
    setTimeout(() => {
      console.log('🔄 Force refreshing tasks after comment...');
      refreshTasks();
    }, 200);
    
  }, [user?.id, refreshTasks]);
  
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    console.log('Toggling subtask:', subtaskId);
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
    
    // ADDED: Force refresh after toggling subtask
    setTimeout(() => {
      console.log('🔄 Force refreshing tasks after subtask toggle...');
      refreshTasks();
    }, 200);
    
  }, [refreshTasks]);
  
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
    toggleSubtask,
    refreshTasks // ADDED: Export the refresh method
  };
};
