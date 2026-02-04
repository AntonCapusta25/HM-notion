create table public.launch_post_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null default auth.uid(),
  name text not null,
  description text,
  prompt jsonb not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.launch_post_templates enable row level security;

-- Policies (Universal Permissions)
create policy "Enable all access for authenticated users"
  on public.launch_post_templates for all
  to authenticated
  using (true)
  with check (true);
