create table if not exists processed_documents (
  id uuid primary key default gen_random_uuid(),
  file_id text unique not null,
  file_name text not null,
  processed_at timestamptz default now(),
  task_count int default 0
);

-- Add RLS policies (optional, but good practice if exposed)
alter table processed_documents enable row level security;

create policy "Enable read access for authenticated users"
on processed_documents for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on processed_documents for insert
to authenticated
with check (true);
