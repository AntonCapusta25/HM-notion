// src/types.ts

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
  assignees: string[]; // From `task_assignees`
  tags: string[];      // From `task_tags`
  subtasks: Subtask[]; // From `subtasks`
  comments: Comment[]; // From `comments`
}
