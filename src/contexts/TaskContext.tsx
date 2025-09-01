import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Task, User, Workspace, Comment } from '../types'; // Make sure your types are correctly imported

// Define the shape of the context's value
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

// Create the context
const TaskContext = createContext<TaskContextValue | null>(null);

// This is the provider component that will wrap your app
export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized fetch function to avoid re-creating it on every render
  const fetchAllData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch all data in parallel for better performance
      const [tasksRes, usersRes, workspacesRes] = await Promise.all([
        supabase
          .from('tasks')
          .select(`*, comments(*), task_assignees(user_id)`), // Fetch assignees and comments
        supabase.from('users').select('*'),
        supabase.from('workspaces').select('*')
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (usersRes.error) throw usersRes.error;
      if (workspacesRes.error) throw workspacesRes.error;

      // Transform tasks to have a simple `assignees` array of user IDs
      const formattedTasks = tasksRes.data.map(task => ({
        ...task,
        assignees: task.task_assignees.map((a: { user_id: string }) => a.user_id)
      }));

      setTasks(formattedTasks);
      setUsers(usersRes.data);
      setWorkspaces(workspacesRes.data);

    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect for the initial data load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Effect for setting up the real-time subscriptions
  useEffect(() => {
    // A change in any of these tables will trigger a full data refetch
    // This is the simplest and most robust way to ensure data consistency
    const subscriptions = [
      supabase.channel('tasks-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchAllData()).subscribe(),
      supabase.channel('comments-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchAllData()).subscribe(),
      supabase.channel('assignees-channel').on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => fetchAllData()).subscribe(),
    ];

    // Cleanup function to remove subscriptions when the component unmounts
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [fetchAllData]);

  // Action: Create a new task
  const createTask = async (taskData: Partial<Task>) => {
    if (!user) throw new Error("User not logged in");
    
    const { assignees, ...restOfTaskData } = taskData;
    
    // 1. Insert the main task data
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({ ...restOfTaskData, createdBy: user.id })
      .select()
      .single();

    if (error) throw error;
    if (!newTask) throw new Error("Task creation failed");

    // 2. If there are assignees, insert them into the join table
    if (assignees && assignees.length > 0) {
      const assigneeLinks = assignees.map((userId: string) => ({
        task_id: newTask.id,
        user_id: userId
      }));
      const { error: assigneeError } = await supabase.from('task_assignees').insert(assigneeLinks);
      if (assigneeError) throw assigneeError;
    }
  };
  
  // Action: Update a task
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
    if (error) throw error;
  };
  
  // Action: Delete a task
  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
  };

  // Action: Add a comment
  const addComment = async (taskId: string, content: string) => {
    if (!user) throw new Error("User not logged in");
    const { error } = await supabase
      .from('comments')
      .insert({ task_id: taskId, content, author: user.id }); // Using `author` column
    if (error) throw error;
  };

  // Action: Toggle a subtask's completion status
  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedSubtasks = (task.subtasks || []).map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    await updateTask(taskId, { subtasks: updatedSubtasks });
  };
  
  // Action: Update all assignees for a task
  const updateAssignees = async (taskId: string, assigneeIds: string[]) => {
    // 1. Delete all existing assignments for this task
    const { error: deleteError } = await supabase.from('task_assignees').delete().eq('task_id', taskId);
    if (deleteError) throw deleteError;

    // 2. Insert the new set of assignments
    if (assigneeIds.length > 0) {
      const newAssignments = assigneeIds.map(userId => ({ task_id: taskId, user_id: userId }));
      const { error: insertError } = await supabase.from('task_assignees').insert(newAssignments);
      if (insertError) throw insertError;
    }
  };

  // The value that will be provided to all consumer components
  const value = {
    tasks,
    users,
    workspaces,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    toggleSubtask,
    updateAssignees,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

// The consumer hook that components will use to access the context
export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
