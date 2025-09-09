// From your `users` table
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string | null;
  created_at: string;
}

// From your `workspaces` table
export interface Workspace {
  id: string;
  name: string;
  department: string;
  created_at: string;
  description: string | null;
  created_by: string;
  color: string;
}

// From your `comments` table
export interface Comment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  created_at: string;
}

// From your `subtasks` table
export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

// Represents a fully assembled Task object in the application
export interface Task {
  // Columns from the `tasks` table
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  created_by: string;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
  
  // Data loaded from related tables
  assignees: string[]; // From `task_assignees` - formatted as array of user IDs
  tags: string[];      // From `task_tags`
  subtasks: Subtask[]; // From `subtasks`
  comments: Comment[]; // From `comments`
  
  // ADDED: Raw assignment data for filtering (preserve original Supabase structure)
  task_assignees?: Array<{ user_id: string }>; // Raw data from Supabase join
}

// Dashboard stats interface
export interface DashboardStats {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  due_today: number;
  high_priority: number;
  my_tasks: number;
  my_created_tasks: number;
}

// Safe date parsing utilities for your existing schema
const safeParseDate = (dateValue: any): string => {
  if (!dateValue) return new Date().toISOString();
  if (typeof dateValue === 'string') {
    if (dateValue.trim() === '' || dateValue === '0000-00-00' || dateValue === 'null') {
      return new Date().toISOString();
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date value: "${dateValue}", using current time`);
      return new Date().toISOString();
    }
    return dateValue;
  }
  return new Date().toISOString();
};

const safeParseDueDate = (dateValue: any): string | null => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    if (dateValue.trim() === '' || dateValue === '0000-00-00' || dateValue === 'null') {
      return null;
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid due date: "${dateValue}"`);
      return null;
    }
    return dateValue;
  }
  return null;
};

// Conversion function to ensure safe data handling
export const formatTaskFromSupabase = (supabaseTask: any): Task => {
  return {
    // Keep your existing field names
    id: supabaseTask.id,
    title: supabaseTask.title || '',
    description: supabaseTask.description || null,
    due_date: safeParseDueDate(supabaseTask.due_date),
    priority: supabaseTask.priority,
    status: supabaseTask.status,
    created_by: supabaseTask.created_by,
    workspace_id: supabaseTask.workspace_id || null,
    created_at: safeParseDate(supabaseTask.created_at),
    updated_at: safeParseDate(supabaseTask.updated_at),
    
    // Many-to-many relationships - formatted for easy use
    assignees: (supabaseTask.task_assignees || []).map((ta: any) => ta.user_id),
    tags: (supabaseTask.task_tags || []).map((tt: any) => tt.tag),
    subtasks: supabaseTask.subtasks || [],
    comments: (supabaseTask.comments || []).map((comment: any) => ({
      ...comment,
      created_at: safeParseDate(comment.created_at)
    })),
    
    // Raw assignment data will be added by useTaskStore - this ensures type safety
    task_assignees: undefined // Will be populated by useTaskStore.fetchTasks()
  };
};
