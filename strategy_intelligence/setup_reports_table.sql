-- Paste and run this in your Supabase SQL Editor

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.research_reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  topic text not null,
  status text default 'draft',
  strategy_data jsonb default '{}'::jsonb,
  pdf_url text
);

-- 2. Turn off Row Level Security (RLS) so your frontend and backend can access it easily without auth tokens
ALTER TABLE public.research_reports DISABLE ROW LEVEL SECURITY;

-- (Alternatively, if you strictly require RLS, run the following instead of DISABLE RLS):
/*
ALTER TABLE public.research_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read/Write" ON public.research_reports FOR ALL USING (true) WITH CHECK (true);
*/
