
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
