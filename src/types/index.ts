
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  avatar?: string;
  department: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  tags: string[];
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  comments: Comment[];
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  department: string;
  color: string;
}
// ADD these interfaces to your existing types file:

export interface DashboardStats {
  total_tasks: number
  todo_tasks: number
  in_progress_tasks: number
  done_tasks: number
  overdue_tasks: number
  due_today: number
  high_priority: number
  my_tasks: number
  my_created_tasks: number
}

export interface SupabaseTask {
  id: string
  title: string
  description: string
  due_date: string | null
  assigned_to: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in_progress' | 'done'
  created_by: string
  workspace_id: string | null
  created_at: string
  updated_at: string
  assigned_user?: User | null
  created_user?: User | null
  subtasks?: Subtask[]
  comments?: Comment[]
  task_tags?: { tag: string }[]
  workspace?: Workspace | null
}

// Helper function to convert Supabase format to your existing Task format
export const formatTaskFromSupabase = (supabaseTask: SupabaseTask): Task => ({
  id: supabaseTask.id,
  title: supabaseTask.title,
  description: supabaseTask.description,
  dueDate: supabaseTask.due_date || undefined,
  assignedTo: supabaseTask.assigned_to || '',
  priority: supabaseTask.priority,
  status: supabaseTask.status,
  tags: supabaseTask.task_tags?.map(tt => tt.tag) || [],
  subtasks: supabaseTask.subtasks || [],
  createdAt: supabaseTask.created_at,
  updatedAt: supabaseTask.updated_at,
  createdBy: supabaseTask.created_by,
  comments: supabaseTask.comments || []
})
