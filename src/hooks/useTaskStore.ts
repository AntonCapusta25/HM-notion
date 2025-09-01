import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Task, User, Workspace, Subtask } from '../types';

export const useTaskStore = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [tasksRes, usersRes, workspacesRes] = await Promise.all([
        supabase.from('tasks').select(`
          *,
          comments(*),
          subtasks(*),
          task_tags(tag),
          task_assignees(user_id)
        `),
        supabase.from('users').select('*'),
        supabase.from('workspaces').select('*')
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (usersRes.error) throw usersRes.error;
      if (workspacesRes.error) throw workspacesRes.error;

      // Assemble the final Task objects with all related data
      const formattedTasks = (tasksRes.data || []).map(task => ({
        ...task,
        assignees: (task.task_assignees || []).map((a: { user_id: string }) => a.user_id),
        tags: (task.task_tags || []).map((t: { tag: string }) => t.tag),
        subtasks: task.subtasks || [],
        comments: task.comments || [],
      }));

      setTasks(formattedTasks as unknown as Task[]);
      setUsers(usersRes.data || []);
      setWorkspaces(workspacesRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAllData();
    else setLoading(false);
  }, [user, fetchAllData]);

  useEffect(() => {
    if (!user) return;
    
    const channel = supabase.channel('realtime-all');
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_tags' }, fetchAllData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchAllData]);

  const createTask = async (taskData: Partial<Task>) => {
    if (!user) throw new Error("User not authenticated");

    const { assignees, tags, subtasks, ...restOfTaskData } = taskData;
    
    const { data: newTask, error } = await supabase.from('tasks').insert({ ...restOfTaskData, created_by: user.id }).select().single();
    if (error) throw error;

    if (assignees && assignees.length > 0) {
      const links = assignees.map(userId => ({ task_id: newTask.id, user_id: userId }));
      await supabase.from('task_assignees').insert(links);
    }
    if (tags && tags.length > 0) {
      const links = tags.map(tag => ({ task_id: newTask.id, tag: tag }));
      await supabase.from('task_tags').insert(links);
    }
    if (subtasks && subtasks.length > 0) {
      const links = subtasks.map(subtask => ({ ...subtask, task_id: newTask.id }));
      await supabase.from('subtasks').insert(links);
    }
  };
  
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const { assignees, tags, subtasks, ...restOfUpdates } = updates;
    await supabase.from('tasks').update(restOfUpdates).eq('id', taskId);
    // You can add logic here to update assignees, tags, etc. if needed
  };
  
  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
  };

  const addComment = async (taskId: string, content: string) => {
    if (!user) throw new Error("User not authenticated");
    await supabase.from('comments').insert({ task_id: taskId, content, author: user.id });
  };
  
  return { tasks, users, workspaces, loading, error, createTask, updateTask, deleteTask, addComment };
};
