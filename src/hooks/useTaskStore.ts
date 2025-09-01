import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Task, User, Workspace } from '../types';

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
        supabase.from('tasks').select(`*, comments(*), task_assignees(user_id)`),
        supabase.from('users').select('*'),
        supabase.from('workspaces').select('*')
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (usersRes.error) throw usersRes.error;
      if (workspacesRes.error) throw workspacesRes.error;

      const formattedTasks = (tasksRes.data || []).map(task => ({
        ...task,
        assignees: (task.task_assignees || []).map((a: { user_id: string }) => a.user_id),
        subtasks: task.subtasks || [],
        comments: (task.comments || []).map(comment => ({
          ...comment,
          createdAt: comment.createdAt || null
        })),
        tags: task.tags || [],
        createdAt: task.createdAt || null,
        updatedAt: task.updatedAt || null,
        due_date: task.due_date || null
      }));

      setTasks(formattedTasks);
      setUsers(usersRes.data || []);
      setWorkspaces(workspacesRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [user, fetchAllData]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('realtime-all');
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => fetchAllData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchAllData]);

  const createTask = async (taskData: Partial<Task>) => {
    if (!user) throw new Error("User not authenticated");
    const { assignees, subtasks, ...restOfTaskData } = taskData;
    
    // FIX: Changed `createdBy` to `created_by` to match your database schema
    const { data: newTask, error } = await supabase.from('tasks').insert({ ...restOfTaskData, subtasks: subtasks || [], created_by: user.id }).select().single();
    
    if (error) throw error;

    if (assignees && assignees.length > 0) {
      const assigneeLinks = assignees.map((userId: string) => ({ task_id: newTask.id, user_id: userId }));
      const { error: assigneeError } = await supabase.from('task_assignees').insert(assigneeLinks);
      if (assigneeError) throw assigneeError;
    }
  };
  
  const updateAssignees = async (taskId: string, assigneeIds: string[]) => {
    await supabase.from('task_assignees').delete().eq('task_id', taskId);
    if (assigneeIds.length > 0) {
      const newAssignments = assigneeIds.map(userId => ({ task_id: taskId, user_id: userId }));
      await supabase.from('task_assignees').insert(newAssignments);
    }
  };
  
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const { assignees, ...restOfUpdates } = updates;
    const { error } = await supabase.from('tasks').update(restOfUpdates).eq('id', taskId);
    if (error) throw error;
    if (assignees) {
      await updateAssignees(taskId, assignees);
    }
  };
  
  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  };

  const addComment = async (taskId: string, content: string) => {
    if (!user) throw new Error("User not authenticated");
    const { error } = await supabase.from('comments').insert({ task_id: taskId, content, author: user.id });
    if (error) throw error;
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedSubtasks = (task.subtasks || []).map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
    await updateTask(taskId, { subtasks: updatedSubtasks });
  };
  
  return { tasks, users, workspaces, loading, error, createTask, updateTask, deleteTask, addComment, toggleSubtask, updateAssignees };
};
