-- Add assigned_shooter_id and assigned_shooter_name to video_projects
ALTER TABLE public.video_projects
ADD COLUMN assigned_shooter_id uuid REFERENCES auth.users(id),
ADD COLUMN assigned_shooter_name text;
