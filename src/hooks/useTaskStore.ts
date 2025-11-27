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
  
  // Track pending assignee updates to prevent concurrent requests
  const pendingAssigneeUpdates = useRef<Map<string, NodeJS.Timeout>>(new Map());

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

      // ENHANCED: Ensure we get all assignment data properly
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          comments(
            id,
            content,
            author,
            created_at
          ),
          subtasks(
            id,
            title,
            completed,
            created_at
          ),
          task_tags(
            tag
          ),
          task_assignees(
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Task fetch error:', error);
        setError(error.message);
        return;
      }

      console.log('✅ Raw data from Supabase:', data?.length || 0, 'records');
      
      // Debug: Log raw assignment data for first task
      if (data && data.length > 0) {
        console.log('🔍 Raw Supabase task sample:', {
          task_title: data[0].title,
          raw_task_assignees: data[0].task_assignees,
          assignment_count: data[0].task_assignees?.length || 0
        });
      }

      // Format tasks with proper assignment data preserved
      const formattedTasks = (data || []).map(supabaseTask => {
        const formatted = formatTaskFromSupabase(supabaseTask);
        
        // CRITICAL: Preserve the raw task_assignees data for filtering
        formatted.task_assignees = supabaseTask.task_assignees || [];
        
        console.log(`📋 Task "${formatted.title}": assignees=${formatted.assignees}, task_assignees=${JSON.stringify(formatted.task_assignees)}`);
        
        return formatted;
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

  // OPTIMIZED: Real-time subscriptions without refresh
  useEffect(() => {
    let tasksSubscription: RealtimeChannel;
    let assigneesSubscription: RealtimeChannel;
    let commentsSubscription: RealtimeChannel;
    let subtasksSubscription: RealtimeChannel;
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
          console.log('🔥 REALTIME: Tasks update received!', payload.eventType);
          
          // Handle different event types with optimistic state updates
          if (payload.eventType === 'INSERT') {
            const newTask = formatTaskFromSupabase(payload.new);
            setTasks(prev => [...prev, newTask]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(task => 
              task.id === payload.new.id ? { ...task, ...payload.new } : task
            ));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        })
        .subscribe((status) => {
          console.log('📡 Tasks subscription status:', status);
        });

      // Subscribe to task_assignees changes
      assigneesSubscription = supabase
        .channel('task-assignees-' + user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'task_assignees'
        }, (payload) => {
          console.log('🔥 REALTIME: Task assignees update!', payload.eventType);
          
          // Refresh only the affected task
          const taskId = payload.new?.task_id || payload.old?.task_id;
          if (taskId) {
            // Fetch just this task's assignments
            supabase
              .from('task_assignees')
              .select('user_id')
              .eq('task_id', taskId)
              .then(({ data }) => {
                setTasks(prev => prev.map(task => 
                  task.id === taskId 
                    ? { 
                        ...task, 
                        assignees: (data || []).map(a => a.user_id),
                        task_assignees: data || []
                      }
                    : task
                ));
              });
          }
        })
        .subscribe((status) => {
          console.log('📡 Assignees subscription status:', status);
        });

      // ⚡ NEW: Subscribe to comments table changes
      commentsSubscription = supabase
        .channel('comments-realtime-' + user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'comments'
        }, (payload) => {
          console.log('🔥 REALTIME: Comments update!', payload.eventType);
          
          const taskId = payload.new?.task_id || payload.old?.task_id;
          if (!taskId) return;
          
          if (payload.eventType === 'INSERT') {
            // Add new comment to the task
            setTasks(prev => prev.map(task => 
              task.id === taskId
                ? { 
                    ...task, 
                    comments: [...(task.comments || []), payload.new]
                  }
                : task
            ));
          } else if (payload.eventType === 'UPDATE') {
            // Update existing comment
            setTasks(prev => prev.map(task => 
              task.id === taskId
                ? {
                    ...task,
                    comments: (task.comments || []).map(c => 
                      c.id === payload.new.id ? payload.new : c
                    )
                  }
                : task
            ));
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted comment
            setTasks(prev => prev.map(task => 
              task.id === taskId
                ? {
                    ...task,
                    comments: (task.comments || []).filter(c => c.id !== payload.old.id)
                  }
                : task
            ));
          }
        })
        .subscribe((status) => {
          console.log('📡 Comments subscription status:', status);
        });

      // ⚡ NEW: Subscribe to subtasks table changes
      subtasksSubscription = supabase
        .channel('subtasks-realtime-' + user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'subtasks'
        }, (payload) => {
          console.log('🔥 REALTIME: Subtasks update!', payload.eventType);
          
          const taskId = payload.new?.task_id || payload.old?.task_id;
          if (!taskId) return;
          
          if (payload.eventType === 'INSERT') {
            setTasks(prev => prev.map(task => 
              task.id === taskId
                ? { 
                    ...task, 
                    subtasks: [...(task.subtasks || []), payload.new]
                  }
                : task
            ));
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(task => 
              task.id === taskId
                ? {
                    ...task,
                    subtasks: (task.subtasks || []).map(st => 
                      st.id === payload.new.id ? payload.new : st
                    )
                  }
                : task
            ));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.map(task => 
              task.id === taskId
                ? {
                    ...task,
                    subtasks: (task.subtasks || []).filter(st => st.id !== payload.old.id)
                  }
                : task
            ));
          }
        })
        .subscribe((status) => {
          console.log('📡 Subtasks subscription status:', status);
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
      if (assigneesSubscription) {
        console.log('🧹 Cleaning up assignees subscription');
        assigneesSubscription.unsubscribe();
      }
      if (commentsSubscription) {
        console.log('🧹 Cleaning up comments subscription');
        commentsSubscription.unsubscribe();
      }
      if (subtasksSubscription) {
        console.log('🧹 Cleaning up subtasks subscription');
        subtasksSubscription.unsubscribe();
      }
      if (workspacesSubscription) {
        console.log('🧹 Cleaning up workspaces subscription');
        workspacesSubscription.unsubscribe();
      }
    };
  }, [user?.id, fetchWorkspaces]);

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
    
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({ 
        ...restOfTaskData, 
        created_by: userId,
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
    
    // ✅ No manual refresh needed - real-time subscription will update the UI
    
  }, [user?.id, userProfile?.id]);

  const updateAssignees = useCallback(async (taskId: string, assigneeIds: string[]) => {
    console.log('👥 updateAssignees called for task:', taskId, 'assignees:', assigneeIds);
    
    // Cancel any pending update for this task
    const pendingTimeout = pendingAssigneeUpdates.current.get(taskId);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      console.log('⏸️ Cancelled pending update for task:', taskId);
    }
    
    // Debounce: wait 300ms before actually updating
    return new Promise<void>((resolve) => {
      const timeoutId = setTimeout(async () => {
        pendingAssigneeUpdates.current.delete(taskId);
        
        try {
          console.log('🔄 Executing debounced assignee update:', { taskId, assigneeIds });
          
          // Delete all existing assignments for this task
          const { error: deleteError } = await supabase
            .from('task_assignees')
            .delete()
            .eq('task_id', taskId);
          
          if (deleteError) {
            console.error('❌ Error deleting assignments:', deleteError);
          }
          
          // Insert new assignments if any
          if (assigneeIds.length > 0) {
            const newAssignments = assigneeIds.map(userId => ({ 
              task_id: taskId, 
              user_id: userId 
            }));
            
            const { error: insertError } = await supabase
              .from('task_assignees')
              .insert(newAssignments);
            
            if (insertError) {
              console.error('❌ Error inserting assignments:', insertError);
            } else {
              console.log('✅ Task assignments updated successfully');
            }
          } else {
            console.log('✅ Task assignments cleared successfully');
          }
          
          resolve();
        } catch (error) {
          console.error('❌ Error in updateAssignees:', error);
          resolve(); // Resolve anyway to prevent hanging
        }
      }, 300); // 300ms debounce
      
      pendingAssigneeUpdates.current.set(taskId, timeoutId);
    });
    
  }, []);

  const updateTags = async (taskId: string, tags: string[]) => {
    console.log('🏷️ Updating tags for task:', taskId, 'tags:', tags);
    await supabase.from('task_tags').delete().eq('task_id', taskId);
    if (tags.length > 0) {
      const newTags = tags.map(tag => ({ task_id: taskId, tag: tag }));
      await supabase.from('task_tags').insert(newTags);
    }
  };

  // 🚀 FIRE-AND-FORGET OPTIMISTIC UPDATE
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    console.log('⚡ Fire-and-forget update for task:', taskId, 'updates:', updates);
    const { assignees, tags, subtasks, ...restOfUpdates } = updates;
    
    // Store original task for potential rollback
    const originalTask = tasks.find(t => t.id === taskId);
    
    // 🚀 STEP 1: IMMEDIATE UI UPDATE (Optimistic)
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          const updatedTask = { 
            ...task, 
            ...updates, 
            updated_at: new Date().toISOString() 
          };
          console.log('✨ Optimistically updated task in UI:', updatedTask.title);
          return updatedTask;
        }
        return task;
      });
    });
    
    // 📡 STEP 2: DATABASE UPDATE (Background - fire and forget)
    (async () => {
      try {
        // Update main task fields
        if (Object.keys(restOfUpdates).length > 0) {
          const { error } = await supabase.from('tasks').update(restOfUpdates).eq('id', taskId);
          if (error) console.error('❌ Task update error:', error);
        }
        
        // Update assignees (fire and forget)
        if (assignees !== undefined) {
          updateAssignees(taskId, assignees)
            .catch(err => console.error('❌ Assignee update failed:', err));
        }
        
        // Update tags (fire and forget)
        if (tags !== undefined) {
          updateTags(taskId, tags)
            .catch(err => console.error('❌ Tag update failed:', err));
        }
        
        console.log('🔥 Background updates fired');
        
      } catch (error: any) {
        console.error('❌ Background update failed:', error);
        // Real-time will sync the correct state
      }
    })();
    
    // Return immediately without waiting
    console.log('✅ UI updated instantly, DB updating in background');
    
  }, [tasks, updateAssignees]);
  
  const deleteTask = useCallback(async (taskId: string) => {
    console.log('🗑️ Deleting task:', taskId);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
    
    // ✅ No manual refresh needed - real-time subscription will update the UI
    
  }, []);

  // 🚀 OPTIMISTIC: Add comment with instant UI update
  const addComment = useCallback(async (taskId: string, content: string) => {
    if (!user) throw new Error("User not authenticated");
    
    console.log('💬 Adding comment to task:', taskId);
    
    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const timestamp = new Date().toISOString();
    
    const optimisticComment = {
      id: tempId,
      task_id: taskId,
      content,
      author: user.id,
      created_at: timestamp
    };
    
    // 🚀 STEP 1: IMMEDIATE UI UPDATE (Optimistic)
    setTasks(prev => prev.map(task => 
      task.id === taskId
        ? { 
            ...task, 
            comments: [...(task.comments || []), optimisticComment]
          }
        : task
    ));
    
    console.log('✨ Optimistically added comment to UI');
    
    // 📡 STEP 2: DATABASE INSERT (Background)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ 
          task_id: taskId, 
          content, 
          author: user.id,
          created_at: timestamp
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Replace temporary comment with real one from database
      if (data) {
        setTasks(prev => prev.map(task => 
          task.id === taskId
            ? {
                ...task,
                comments: (task.comments || []).map(c => 
                  c.id === tempId ? data : c
                )
              }
            : task
        ));
        console.log('✅ Comment saved to database, replaced temp ID');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to save comment:', error);
      
      // Rollback: Remove optimistic comment on error
      setTasks(prev => prev.map(task => 
        task.id === taskId
          ? {
              ...task,
              comments: (task.comments || []).filter(c => c.id !== tempId)
            }
          : task
      ));
      
      throw error;
    }
    
  }, [user?.id]);
  
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    console.log('☑️ Toggling subtask:', subtaskId);
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
    
    // ✅ No manual refresh needed - real-time subscription will update the UI
    
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
    toggleSubtask,
    refreshTasks
  };
};
