-- Create the generated-launch-posts bucket
insert into storage.buckets (id, name, public)
values ('generated-launch-posts', 'generated-launch-posts', true)
on conflict (id) do nothing;

-- Set up RLS policies for the bucket
-- Allow public read access (so images can be displayed in the app)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'generated-launch-posts' );

-- Allow authenticated users to upload files
create policy "Authenticated Uploads"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'generated-launch-posts' );

-- Allow authenticated users to update their own files (optional, but good for managing)
create policy "Authenticated Updates"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'generated-launch-posts' );

-- Allow authenticated users to delete their own files
create policy "Authenticated Deletes"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'generated-launch-posts' );
