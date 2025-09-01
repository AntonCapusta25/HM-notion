import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Task, User, Workspace } from '../types';

interface TaskContextValue {
  tasks: Task[];
  users: User[];
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  createTask: (taskData: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  updateAssignees: (taskId: string, assigneeIds: string[]) => Promise<void>;
}

const TaskContext = createContext<TaskContextValue | null>(null);

// Helper function to safely parse dates
const safeParseDate = (dateValue: any): string | null => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return dateValue;
  }
  return null;
};

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      setError(null);
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
        comments: task.comments || [], 
        tags: task.tags || [],
        // FIXED: Use safe date parsing to prevent Invalid time value errors
        createdAt: safeParseDate(task.createdAt) || new Date().toISOString(),
        updatedAt: safeParseDate(task.updatedAt) || new Date().toISOString(),
        dueDate: safeParseDate(task.dueDate)
      }));

      setTasks(formattedTasks);
      setUsers(usersRes.data || []);
      setWorkspaces(workspacesRes.data || []);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  useEffect(() => {
    const channel = supabase.channel('realtime-all');
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => fetchAllData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAllData]);

  const createTask = async (taskData: Partial<Task>) => {
    if (!user) throw new Error("User not logged in");
    
    // FIX: Destructure out properties that are not columns in the 'tasks' table.
    const { assignees, subtasks, ...restOfTaskData } = taskData;
    
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({ 
        ...restOfTaskData, 
        subtasks: subtasks || [], 
        createdBy: user.id,
        // FIXED: Ensure dates are properly formatted
        dueDate: taskData.dueDate ? safeParseDate(taskData.dueDate) : null
      })
      .select()
      .single();

    if (error) throw error;

    if (assignees && assignees.length > 0) {
      const assigneeLinks = assignees.map((userId: string) => ({ task_id: newTask.id, user_id: userId }));
      const { error: assigneeError } = await supabase.from('task_assignees').insert(assigneeLinks);
      if (assigneeError) throw assigneeError;
    }
  };
  
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const { assignees, ...restOfUpdates } = updates;
    
    // FIXED: Safe date parsing for updates
    const safeUpdates = {
      ...restOfUpdates,
      ...(updates.dueDate !== undefined && { dueDate: safeParseDate(updates.dueDate) })
    };
    
    const { error } = await supabase.from('tasks').update(safeUpdates).eq('id', taskId);
    if (error) throw error;

    // If assignees are part of the update, handle them separately
    if (assignees) {
      await updateAssignees(taskId, assignees);
    }
  };
  
  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  };

  const addComment = async (taskId: string, content: string) => {
    if (!user) throw new Error("User not logged in");
    const { error } = await supabase.from('comments').insert({ task_id: taskId, content, author: user.id });
    if (error) throw error;
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedSubtasks = (task.subtasks || []).map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    await updateTask(taskId, { subtasks: updatedSubtasks });
  };
  
  const updateAssignees = async (taskId: string, assigneeIds: string[]) => {
    const { error: deleteError } = await supabase.from('task_assignees').delete().eq('task_id', taskId);
    if (deleteError) throw deleteError;

    if (assigneeIds.length > 0) {
      const newAssignments = assigneeIds.map(userId => ({ task_id: taskId, user_id: userId }));
      const { error: insertError } = await supabase.from('task_assignees').insert(newAssignments);
      if (insertError) throw insertError;
    }
  };
  
  const value = { tasks, users, workspaces, loading, error, createTask, updateTask, deleteTask, addComment, toggleSubtask, updateAssignees };

  return (<TaskContext.Provider value={value}>{children}</TaskContext.Provider>);
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
