import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create stable reference for fetchTasks
  const fetchTasksRef = useRef<() => Promise<void>>();

  // Track pending real-time fetches for batching
  const pendingRealtimeFetches = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Track tasks with optimistic assignee updates to prevent flicker
  const optimisticAssigneeUpdates = useRef<Set<string>>(new Set());

  // Track tasks with any optimistic update in-flight (status, title, etc.) to block real-time echo
  const optimisticTaskUpdates = useRef<Set<string>>(new Set());

  // Pagination state
  const [page, setPage] = useState(1); // 1-indexed for UI convenience
  const [totalTasks, setTotalTasks] = useState(0);
  const TASKS_PER_PAGE = 100;

  const fetchTasks = useCallback(async (pageNum = 1) => {
    console.log(`🔄 fetchTasks called for page ${pageNum}`);

    if (!user) {
      setLoading(false);
      setInitialLoading(false);
      return;
    }

    try {
      // Only block the full UI on the very first load (no tasks yet)
      // Background refreshes run silently without hiding existing data
      setLoading(true);

      // Calculate range for 0-indexed Supabase range
      const from = (pageNum - 1) * TASKS_PER_PAGE;
      const to = from + TASKS_PER_PAGE - 1;

      const { data, count, error } = await supabase
        .from('tasks')
        .select(`
          *,
          comments(id, content, author, created_at),
          subtasks(id, title, completed, created_at),
          task_tags(tag),
          task_assignees(user_id)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('❌ Task fetch error:', error);
        setError(error.message);
        return;
      }

      const formattedTasks = (data || []).map(supabaseTask => {
        const formatted = formatTaskFromSupabase(supabaseTask);
        formatted.task_assignees = supabaseTask.task_assignees || [];
        return formatted;
      });

      setTasks(formattedTasks);
      setTotalTasks(count || 0);
      setPage(pageNum);

      console.log(`✅ Loaded page ${pageNum}, ${formattedTasks.length} tasks (Total: ${count})`);
      setError(null);
    } catch (err: any) {
      console.error('❌ Failed to fetch tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [user?.id]);

  // Expose refreshTasks method for manual refresh (resets to page 1)
  const refreshTasks = useCallback(async () => {
    console.log('🔄 refreshTasks called - manual refresh');
    await fetchTasks(1);
  }, [fetchTasks]);

  const fetchUsers = useCallback(async () => {
    try {
      // OPTIMIZED: Only select columns we actually use
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, department, avatar, created_at')
        .order('name');

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
      // OPTIMIZED: Select specific columns and order by name
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, department, description, created_by, color, type, created_at, updated_at')
        .order('name');

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
            // ⚠️ payload.new ONLY has flat columns — no joined relations (assignees, tags, subtasks)
            // We must do a separate fetch to get the full task with all relations.
            // This also handles replacement of any optimistic temp task created in createTask.
            const insertedId = payload.new.id;
            supabase
              .from('tasks')
              .select(`
                *,
                comments(id, content, author, created_at),
                subtasks(id, title, completed, created_at),
                task_tags(tag),
                task_assignees(user_id)
              `)
              .eq('id', insertedId)
              .single()
              .then(({ data: fullTask }) => {
                if (!fullTask) return;
                const formatted = formatTaskFromSupabase(fullTask);
                formatted.task_assignees = fullTask.task_assignees || [];
                setTasks(prev => {
                  // Replace optimistic temp task if it exists (created by createTask)
                  const tempIndex = prev.findIndex(t => t.id.startsWith('temp-'));
                  if (tempIndex !== -1) {
                    const updated = [...prev];
                    updated[tempIndex] = formatted;
                    return updated;
                  }
                  // Otherwise deduplicate and prepend
                  return [formatted, ...prev.filter(t => t.id !== formatted.id)];
                });
                console.log('✅ Real-time INSERT: full task fetched and applied:', formatted.title);
              });
          } else if (payload.eventType === 'UPDATE') {
            const updatedId = payload.new.id;
            // Skip echo from our own optimistic update — we already have fresh state
            if (optimisticTaskUpdates.current.has(updatedId)) {
              console.log('⏭️ Skipping real-time echo for optimistically-updated task:', updatedId);
            } else {
              setTasks(prev => prev.map(task => {
                if (task.id !== updatedId) return task;
                // Merge only flat scalar DB fields, preserve nested relational arrays
                return {
                  ...task,
                  ...payload.new,
                  // These come from JOINs — payload.new won't have them, keep existing
                  comments: task.comments,
                  subtasks: task.subtasks,
                  task_assignees: task.task_assignees,
                  tags: task.tags,
                };
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        })
        .subscribe((status) => {
          console.log('📡 Tasks subscription status:', status);
        });

      // Subscribe to task_assignees changes with batching
      assigneesSubscription = supabase
        .channel('task-assignees-' + user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'task_assignees'
        }, (payload) => {
          console.log('🔥 REALTIME: Task assignees update!', payload.eventType);

          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          const taskId = newRecord?.task_id || oldRecord?.task_id;

          if (!taskId) return;

          // Skip real-time updates if we have an optimistic update pending
          if (optimisticAssigneeUpdates.current.has(taskId)) {
            console.log('⏭️ Skipping real-time update for task with optimistic changes:', taskId);
            return;
          }

          // Cancel any pending fetch for this task
          const existingTimeout = pendingRealtimeFetches.current.get(taskId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // OPTIMIZED: Batch multiple events with 200ms window for better grouping
          const timeoutId = setTimeout(() => {
            pendingRealtimeFetches.current.delete(taskId);

            // Double-check: skip if optimistic update is still pending
            if (optimisticAssigneeUpdates.current.has(taskId)) {
              console.log('⏭️ Skipping batched update for task with optimistic changes:', taskId);
              return;
            }

            // Fetch this task's assignments with optimized query
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
                console.log('✅ Batched assignee update applied for task:', taskId);
              });
          }, 200); // Increased from 50ms to 200ms for better batching

          pendingRealtimeFetches.current.set(taskId, timeoutId);
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

          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          const taskId = newRecord?.task_id || oldRecord?.task_id;

          if (!taskId) return;

          if (payload.eventType === 'INSERT') {
            // Add new comment to the task, but check for duplicates first
            setTasks(prev => prev.map(task => {
              if (task.id !== taskId) return task;

              const existingComments = task.comments || [];

              // Check if comment already exists (by ID or by temp ID pattern)
              const commentExists = existingComments.some(c =>
                c.id === newRecord.id ||
                // Check if this is replacing a temp comment (same content, author, and similar timestamp)
                (c.id.toString().startsWith('temp-') &&
                  c.content === newRecord.content &&
                  c.author === newRecord.author &&
                  newRecord.created_at &&
                  Math.abs(new Date(c.created_at).getTime() - new Date(newRecord.created_at).getTime()) < 2000)
              );

              if (commentExists) {
                console.log('⚠️ Comment already exists, skipping duplicate from realtime');
                // Replace temp comment with real one
                return {
                  ...task,
                  comments: existingComments.map(c =>
                    (c.id.toString().startsWith('temp-') &&
                      c.content === newRecord.content &&
                      c.author === newRecord.author &&
                      newRecord.created_at &&
                      Math.abs(new Date(c.created_at).getTime() - new Date(newRecord.created_at).getTime()) < 2000)
                      ? newRecord
                      : c
                  )
                };
              }

              // Add new comment
              return {
                ...task,
                comments: [...existingComments, newRecord]
              };
            }));
          } else if (payload.eventType === 'UPDATE') {
            // Update existing comment
            setTasks(prev => prev.map(task =>
              task.id === taskId
                ? {
                  ...task,
                  comments: (task.comments || []).map(c =>
                    c.id === newRecord.id ? newRecord : c
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
                  comments: (task.comments || []).filter(c => c.id !== oldRecord.id)
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

          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          const taskId = newRecord?.task_id || oldRecord?.task_id;

          if (!taskId) return;

          if (payload.eventType === 'INSERT') {
            setTasks(prev => prev.map(task =>
              task.id === taskId
                ? {
                  ...task,
                  subtasks: [...(task.subtasks || []), newRecord]
                }
                : task
            ));
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(task =>
              task.id === taskId
                ? {
                  ...task,
                  subtasks: (task.subtasks || []).map(st =>
                    st.id === newRecord.id ? newRecord : st
                  )
                }
                : task
            ));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.map(task =>
              task.id === taskId
                ? {
                  ...task,
                  subtasks: (task.subtasks || []).filter(st => st.id !== oldRecord.id)
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

    if (!user) throw new Error("User not authenticated");

    const userId = userProfile?.id || user.id;
    const { assignees, tags, subtasks, ...restOfTaskData } = taskData;

    // 🚀 STEP 1: INSTANT OPTIMISTIC UPDATE — task appears before any DB call
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      title: restOfTaskData.title || '',
      description: restOfTaskData.description || null,
      status: restOfTaskData.status || 'todo',
      priority: restOfTaskData.priority || 'medium',
      due_date: restOfTaskData.due_date || null,
      workspace_id: restOfTaskData.workspace_id || null,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assignees: assignees || [],
      tags: tags || [],
      subtasks: subtasks || [],
      comments: [],
      task_assignees: (assignees || []).map(uid => ({ user_id: uid })),
    };
    setTasks(prev => [optimisticTask, ...prev]);
    console.log('✨ Optimistically added task to UI:', optimisticTask.title);

    try {
      // 📡 STEP 2: Insert main task row
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
        // Roll back optimistic update
        setTasks(prev => prev.filter(t => t.id !== tempId));
        throw error;
      }

      console.log('✅ Task DB row created:', newTask.id);

      // 📡 STEP 3: Insert relations IN PARALLEL (not sequentially)
      const relationPromises: Promise<any>[] = [];

      if (assignees && assignees.length > 0) {
        const links = assignees.map(uid => ({ task_id: newTask.id, user_id: uid }));
        relationPromises.push(
          (async () => { const { error: e } = await supabase.from('task_assignees').insert(links); if (e) console.error('❌ Assignees error:', e); })()
        );
      }

      if (tags && tags.length > 0) {
        const links = tags.map(tag => ({ task_id: newTask.id, tag }));
        relationPromises.push(
          (async () => { const { error: e } = await supabase.from('task_tags').insert(links); if (e) console.error('❌ Tags error:', e); })()
        );
      }

      if (subtasks && subtasks.length > 0) {
        const links = subtasks.map(subtask => ({ ...subtask, id: undefined, task_id: newTask.id }));
        relationPromises.push(
          (async () => { const { error: e } = await supabase.from('subtasks').insert(links); if (e) console.error('❌ Subtasks error:', e); })()
        );
      }

      // Fire all relation inserts at the same time
      if (relationPromises.length > 0) {
        await Promise.all(relationPromises);
      }

      // FIRE NOTIFICATION FOR NEW ASSIGNEES ON CREATION
      if (assignees && assignees.length > 0) {
        try {
          const assigner = users.find(u => u.id === user?.id);
          const assignedByName = assigner?.name || user?.email || 'Someone';

          console.log('📧 Sending assignment notifications on creation...', { taskId: newTask.id, assignees });
          supabase.functions.invoke('notify-task-assigned', {
            body: {
              taskId: newTask.id,
              taskTitle: newTask.title,
              taskPriority: newTask.priority || 'Not set',
              dueDate: newTask.due_date || 'Not set',
              assignedByName,
              newAssigneeIds: assignees
            }
          }).catch(err => console.error('Failed to send assignment notification:', err));
        } catch (notifErr) {
          console.error('Error preparing assignment notification:', notifErr);
        }
      }

      console.log('✅ Task creation completed successfully — real-time will replace temp task');
      // Note: the real-time INSERT handler will fetch the full task and replace the temp ID.

    } catch (err) {
      // Roll back optimistic task on any error
      setTasks(prev => prev.filter(t => t.id !== tempId));
      throw err;
    }
  }, [user?.id, userProfile?.id]);

  const updateAssignees = useCallback(async (taskId: string, assigneeIds: string[]) => {
    console.log('👥 updateAssignees called:', { taskId, assigneeIds });

    // Mark this task as having an optimistic update to prevent REALTIME clashes
    optimisticAssigneeUpdates.current.add(taskId);

    try {
      // 1. Fetch current DB state to calculate deltas
      // We need to know who is ALREADY assigned in the DB to avoid unique constraint violations
      // and to know who to delete.
      const { data: currentLinks, error: fetchError } = await supabase
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', taskId);

      if (fetchError) throw fetchError;

      const currentAssigneeIds = currentLinks?.map(a => a.user_id) || [];

      // 2. Calculate Deltas
      // toAdd: IDs in the new list BUT NOT in the DB
      const toAdd = assigneeIds.filter(id => !currentAssigneeIds.includes(id));

      // toRemove: IDs in the DB BUT NOT in the new list
      const toRemove = currentAssigneeIds.filter(id => !assigneeIds.includes(id));

      console.log('📊 Delta calculation:', {
        current: currentAssigneeIds.length,
        target: assigneeIds.length,
        toAdd: toAdd.length,
        toRemove: toRemove.length
      });

      // 3. Execute Updates in Parallel
      const promises = [];

      // INSERT new assignments
      if (toAdd.length > 0) {
        const inserts = toAdd.map(userId => ({ task_id: taskId, user_id: userId }));
        promises.push(
          supabase
            .from('task_assignees')
            .insert(inserts)
            .then(({ error }) => {
              if (error) {
                console.error('❌ Error adding assignees:', error);
                throw error;
              }
            })
        );
      }

      // DELETE removed assignments
      if (toRemove.length > 0) {
        promises.push(
          supabase
            .from('task_assignees')
            .delete()
            .eq('task_id', taskId)
            .in('user_id', toRemove)
            .then(({ error }) => {
              if (error) {
                console.error('❌ Error removing assignees:', error);
                throw error;
              }
            })
        );
      }

      // Wait for both operations
      if (promises.length > 0) {
        await Promise.all(promises);
        console.log('✅ Delta updates committed successfully for assignees');
      } else {
        console.log('✨ No changes needed for assignees');
      }

      // 4. Notifications (Only for NEW assignees)
      if (toAdd.length > 0) {
        // Fetch fresh task details and the current user's name directly to avoid stale closures
        const [{ data: task }, { data: currentUserData }] = await Promise.all([
          supabase
            .from('tasks')
            .select('title, priority, due_date, created_by')
            .eq('id', taskId)
            .single(),
          user?.id ? supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single() : Promise.resolve({ data: null })
        ]);

        if (task) {
          // --- EDGE FUNCTION: Email Notifications ---
          const assignedByName = currentUserData?.name || user?.email || 'Someone';
          console.log('📧 Sending assignment notifications...', { taskId, toAdd });
          supabase.functions.invoke('notify-task-assigned', {
            body: {
              taskId,
              taskTitle: task.title,
              taskPriority: task.priority || 'Not set',
              dueDate: task.due_date || 'Not set',
              assignedByName,
              newAssigneeIds: toAdd
            }
          }).catch(err => console.error('Failed to send assignment notification:', err));

          // --- IN-APP NOTIFICATIONS ---
          const notificationsToCreate = toAdd
            .filter(userId => userId !== task.created_by) // Don't notify task creator
            .map(userId => ({
              user_id: userId,
              task_id: taskId,
              type: 'task_assigned',
              title: 'New Task Assigned',
              message: `You have been assigned to "${task.title}"`,
              read: false
            }));

          if (notificationsToCreate.length > 0) {
            // Check for existing notifications to avoid duplicates (idempotency)
            const { data: existingNotifs } = await supabase
              .from('notifications')
              .select('user_id')
              .eq('task_id', taskId)
              .eq('type', 'task_assigned')
              .in('user_id', toAdd);

            const existingUserIds = existingNotifs?.map(n => n.user_id) || [];
            const uniqueNotifications = notificationsToCreate.filter(
              n => !existingUserIds.includes(n.user_id)
            );

            if (uniqueNotifications.length > 0) {
              const { error: notifError } = await supabase
                .from('notifications')
                .insert(uniqueNotifications);

              if (notifError) {
                console.error('❌ Error creating in-app notifications:', notifError);
              } else {
                console.log(`✅ Created ${uniqueNotifications.length} task assignment in-app notifications`);
              }
            }
          }
        }
      }

      // 5. Release Lock
      // Wait a bit for real-time events to settle (echo from our own changes), then allow real-time updates again
      setTimeout(() => {
        optimisticAssigneeUpdates.current.delete(taskId);
        console.log('🔓 Unlocked real-time updates for task:', taskId);
      }, 500); // Increased wait time slightly to be safe

    } catch (error) {
      console.error('❌ Error in updateAssignees:', error);
      // Remove lock on error immediately
      optimisticAssigneeUpdates.current.delete(taskId);
      throw error;
    }
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

    // 🔒 Block realtime echo for this task while update is in-flight
    optimisticTaskUpdates.current.add(taskId);

    // 🚀 STEP 1: IMMEDIATE UI UPDATE (Optimistic)
    // Capture a rollback snapshot inside the setter to avoid stale closure
    let rollbackSnapshot: Task | undefined;

    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          // Capture current state for rollback (inside functional update = always fresh)
          rollbackSnapshot = task;

          const updatedTask = {
            ...task,
            ...updates,
            updated_at: new Date().toISOString()
          };

          // Also update task_assignees if assignees changed
          if (assignees !== undefined) {
            updatedTask.task_assignees = assignees.map(userId => ({ user_id: userId }));
          }

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
          if (error) {
            console.error('❌ Task update error:', error);
            throw error;
          }
        }

        // Update assignees (fire and forget)
        if (assignees !== undefined) {
          await updateAssignees(taskId, assignees);
        }

        // Update tags (fire and forget)
        if (tags !== undefined) {
          await updateTags(taskId, tags);
        }

        console.log('🔥 Background updates confirmed');

      } catch (error: any) {
        console.error('❌ Background update failed, rolling back:', error);

        // ↩️ ROLLBACK UI UPDATE using the snapshot captured in the setter
        if (rollbackSnapshot) {
          const snapshot = rollbackSnapshot;
          setTasks(prevTasks => prevTasks.map(t =>
            t.id === taskId ? snapshot : t
          ));
          console.log('Reverted task to original state due to error');
        }
      } finally {
        // 🔓 Release the optimistic lock after a short settling delay
        // so any remaining in-flight realtime echoes are still suppressed
        setTimeout(() => {
          optimisticTaskUpdates.current.delete(taskId);
          console.log('🔓 Released realtime lock for task:', taskId);
        }, 600);
      }
    })();

    // Return immediately without waiting
    console.log('✅ UI updated instantly, DB updating in background');

  }, [updateAssignees]);

  const deleteTask = useCallback(async (taskId: string) => {
    console.log('🗑️ Deleting task:', taskId);

    // Optimistic delete
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete task, rolling back:', error);
      setTasks(originalTasks);
      throw error;
    }
  }, [tasks]);

  const deleteTasks = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    console.log('🗑️ Deleting multiple tasks:', taskIds);

    // Optimistic delete
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => !taskIds.includes(t.id)));

    try {
      const { error } = await supabase.from('tasks').delete().in('id', taskIds);
      if (error) throw error;
      console.log(`✅ Successfully deleted ${taskIds.length} tasks`);
    } catch (error) {
      console.error('Failed to delete multiple tasks, rolling back:', error);
      setTasks(originalTasks);
      throw error;
    }
  }, [tasks]);

  // 🚀 OPTIMISTIC: Add comment with instant UI update
  const addComment = useCallback(async (taskId: string, content: string) => {
    // ... (existing implementation is fine, it has rollback)
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
      const { error } = await supabase
        .from('comments')
        .insert({
          task_id: taskId,
          content,
          author: user.id,
          created_at: timestamp
        });

      if (error) throw error;

      // ✅ Real-time subscription will replace temp comment with real one
      console.log('✅ Comment saved to database, real-time will sync');

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

    // Find task and subtask for rollback
    const task = tasks.find(t => t.id === taskId);
    const subtask = task?.subtasks.find(s => s.id === subtaskId);

    if (!task || !subtask) return;

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? {
          ...t,
          subtasks: (t.subtasks || []).map(s =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          )
        }
        : t
    ));

    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ completed: !subtask.completed })
        .eq('id', subtaskId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to toggle subtask, rolling back:', error);
      // Rollback
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? {
            ...t,
            subtasks: (t.subtasks || []).map(s =>
              s.id === subtaskId ? { ...s, completed: subtask.completed } : s
            )
          }
          : t
      ));
    }
  }, [tasks]);

  return useMemo(() => ({
    tasks,
    users,
    workspaces,
    loading,
    initialLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    deleteTasks,
    addComment,
    updateAssignees,
    updateTags,
    toggleSubtask,
    refreshTasks,
    page,
    totalTasks,
    TASKS_PER_PAGE,
    setPage: fetchTasks // Expose fetchTasks as setPage for direct page jumps
  }), [
    tasks, users, workspaces, loading, initialLoading, error,
    createTask, updateTask, deleteTask, deleteTasks, addComment, updateAssignees, updateTags, toggleSubtask, refreshTasks,
    page, totalTasks, fetchTasks
  ]);
};
