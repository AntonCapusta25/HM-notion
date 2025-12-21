-- Performance Optimization: Add indexes for frequently queried columns
-- This migration adds indexes to improve query performance across the application

-- Tasks table indexes
-- Index on created_by for filtering tasks by creator
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- Index on workspace_id for workspace-specific task queries
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);

-- Index on status for filtering tasks by status (todo, in_progress, done)
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Index on priority for filtering high/medium/low priority tasks
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Index on due_date for finding overdue and upcoming tasks
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Index on created_at for sorting tasks by creation date (descending)
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Composite index for common query pattern: workspace + status
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status);

-- Task assignees indexes
-- Index on user_id for finding all tasks assigned to a user
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);

-- Index on task_id for finding all assignees of a task
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);

-- Composite index for checking if a specific user is assigned to a specific task
CREATE INDEX IF NOT EXISTS idx_task_assignees_composite ON task_assignees(task_id, user_id);

-- Comments indexes
-- Index on task_id for fetching all comments for a task
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);

-- Index on created_at for sorting comments chronologically
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Composite index for task comments ordered by date
CREATE INDEX IF NOT EXISTS idx_comments_task_date ON comments(task_id, created_at DESC);

-- Subtasks indexes
-- Index on task_id for fetching all subtasks of a task
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);

-- Index on completed status for filtering completed/incomplete subtasks
CREATE INDEX IF NOT EXISTS idx_subtasks_completed ON subtasks(completed);

-- Task tags indexes
-- Index on task_id for fetching all tags for a task
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);

-- Index on tag for finding all tasks with a specific tag
CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag);

-- Users table indexes
-- Index on email for login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Workspaces table indexes
-- Index on created_by for finding workspaces created by a user
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);

-- Index on type for filtering workspaces by type
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON workspaces(type);

-- Analyze tables to update statistics for query planner
ANALYZE tasks;
ANALYZE task_assignees;
ANALYZE comments;
ANALYZE subtasks;
ANALYZE task_tags;
ANALYZE users;
ANALYZE workspaces;
