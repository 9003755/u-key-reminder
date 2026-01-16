-- 1. Add images column to assets table
alter table assets add column if not exists images text[] default array[]::text[];

-- 2. Create storage bucket for asset images
insert into storage.buckets (id, name, public)
values ('asset-images', 'asset-images', true)
on conflict (id) do nothing;

-- 3. Set up RLS for storage.objects
-- Allow users to upload files to their own folder (defined by user_id)
create policy "Users can upload their own asset images"
on storage.objects for insert
with check (
  bucket_id = 'asset-images' and
  auth.uid() = owner
);

create policy "Users can update their own asset images"
on storage.objects for update
with check (
  bucket_id = 'asset-images' and
  auth.uid() = owner
);

create policy "Users can delete their own asset images"
on storage.objects for delete
using (
  bucket_id = 'asset-images' and
  auth.uid() = owner
);

create policy "Users can view their own asset images"
on storage.objects for select
using (
  bucket_id = 'asset-images' and
  auth.uid() = owner
);
