-- ============================================================
-- Video Projects Table
-- Chef shoot pipeline: Scheduled → Shoot Done → Editing → Publish → Done
-- Created during Homebase Video Pipeline feature (2026-03-03)
-- ============================================================

-- Status type
create type video_status as enum (
  'scheduled',
  'shoot_done',
  'editing',
  'publish',
  'done'
);

-- Main table
create table if not exists public.video_projects (
  id                  uuid primary key default gen_random_uuid(),

  -- Chef info (mirrored from lovable onboarding platform)
  chef_id             text not null,
  chef_name           text not null,
  chef_hyperzod_id    text,

  -- Shoot scheduling
  shoot_date          date not null,
  location            text,
  notes               text,

  -- Pipeline status
  status              video_status not null default 'scheduled',

  -- Proof links (Google Drive) — required to advance pipeline
  shoot_proof_url     text,
  edit_proof_url      text,

  -- Auto-assigned team members
  -- These are looked up by email at runtime; stored here for display
  assigned_editor_id  uuid references auth.users(id),
  assigned_editor_name text,
  assigned_publisher_id uuid references auth.users(id),
  assigned_publisher_name text,

  -- Audit
  created_by          uuid references auth.users(id),
  triggered_from      text default 'manual', -- 'manual' | 'lovable'
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.update_video_projects_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger video_projects_updated_at
  before update on public.video_projects
  for each row execute procedure public.update_video_projects_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================
alter table public.video_projects enable row level security;

-- Authenticated users can read all video projects (team-wide visibility)
create policy "video_projects_select"
  on public.video_projects for select
  to authenticated
  using (true);

-- Authenticated users can insert (manual adds from UI)
create policy "video_projects_insert"
  on public.video_projects for insert
  to authenticated
  with check (true);

-- Authenticated users can update (advancing pipeline stages)
create policy "video_projects_update"
  on public.video_projects for update
  to authenticated
  using (true)
  with check (true);

-- Service role (Edge Function) can do everything
create policy "video_projects_service_role"
  on public.video_projects for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- Index for fast workspace queries
-- ============================================================
-- ============================================================

create index if not exists idx_video_projects_status
  on public.video_projects(status);

create index if not exists idx_video_projects_shoot_date
  on public.video_projects(shoot_date);
