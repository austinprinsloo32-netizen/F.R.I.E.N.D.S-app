-- F.R.I.E.N.D.S: photo and song link on a status
-- Run this once in the Supabase SQL Editor BEFORE using the new status features.

alter table public.statuses add column if not exists image_path text;
alter table public.statuses add column if not exists music_url text;

-- Private bucket for status photos (5 MB, JPG/PNG/WebP)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('status-media', 'status-media', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "status files: upload to own folder" on storage.objects;
create policy "status files: upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'status-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "status files: read own and friends" on storage.objects;
create policy "status files: read own and friends" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'status-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "status files: delete own" on storage.objects;
create policy "status files: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'status-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
