create table public.design_templates (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  thumbnail_url text,
  canvas_state jsonb not null default '[]'::jsonb,
  slots_config jsonb default '[]'::jsonb,
  category text default 'general',
  is_public boolean default true
);

-- Enable RLS
alter table public.design_templates enable row level security;

-- Policies
create policy "Enable read access for all authenticated users"
  on public.design_templates for select
  to authenticated
  using (true);

create policy "Enable insert for authenticated users"
  on public.design_templates for insert
  to authenticated
  with check (true);

create policy "Enable update for authenticated users"
  on public.design_templates for update
  to authenticated
  using (true);
