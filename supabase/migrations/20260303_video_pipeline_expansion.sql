-- ============================================================
-- Video Projects Table Expansion (Persistent Pipeline)
-- ============================================================

-- Add new columns for enhanced tracking
alter table public.video_projects
  add column if not exists attendance_status text default 'pending',
  add column if not exists social_media_url text;

-- Add check constraint for attendance status
begin;
  alter table public.video_projects drop constraint if exists video_projects_attendance_check;
  alter table public.video_projects add constraint video_projects_attendance_check 
    check (attendance_status in ('pending', 'attended', 'not_attended'));
commit;
