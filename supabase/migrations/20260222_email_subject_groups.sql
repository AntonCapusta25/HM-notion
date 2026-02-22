-- email_subject_groups: stores user-defined subject line groups for stat tracking
create table if not exists email_subject_groups (
    id          uuid primary key default gen_random_uuid(),
    workspace_id uuid references workspaces(id) on delete cascade,
    name        text not null,
    prefix      text not null,
    color       text not null default '#3b82f6',
    created_at  timestamptz not null default now()
);

-- Index for fast workspace lookups
create index if not exists idx_email_subject_groups_workspace
    on email_subject_groups(workspace_id);

-- RLS
alter table email_subject_groups enable row level security;

create policy "workspace members can manage their groups"
    on email_subject_groups
    for all
    using (
        workspace_id in (
            select workspace_id from workspace_members where user_id = auth.uid()
        )
    );
