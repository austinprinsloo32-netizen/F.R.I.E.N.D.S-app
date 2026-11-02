-- F.R.I.E.N.D.S: photo gallery, "Ask me about" prompts and photo-check badge
-- Run AFTER friends_feed.sql and safety.sql. Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again; it will not delete any data.

-- ---------------------------------------------------------------
-- 1. Profile extras: prompts + photo check (one row per person)
-- ---------------------------------------------------------------
create table if not exists public.profile_extras (
  user_id                  uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  prompts                  jsonb not null default '[]'::jsonb
                           check (jsonb_typeof(prompts) = 'array' and jsonb_array_length(prompts) <= 3),
  photo_checked            boolean not null default false,
  photo_checked_at         timestamptz,
  photo_check_requested_at timestamptz,
  updated_at               timestamptz not null default now()
);

-- If an older version of this table already exists, bring it up to date.
alter table public.profile_extras add column if not exists prompts jsonb not null default '[]'::jsonb;
alter table public.profile_extras add column if not exists photo_checked boolean not null default false;
alter table public.profile_extras add column if not exists photo_checked_at timestamptz;
alter table public.profile_extras add column if not exists photo_check_requested_at timestamptz;
alter table public.profile_extras add column if not exists updated_at timestamptz not null default now();

alter table public.profile_extras enable row level security;

-- Everyone signed in can see prompts and badges (like a bio).
drop policy if exists "extras: read all members" on public.profile_extras;
create policy "extras: read all members" on public.profile_extras
  for select to authenticated using (true);

drop policy if exists "extras: insert own" on public.profile_extras;
create policy "extras: insert own" on public.profile_extras
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "extras: update own" on public.profile_extras;
create policy "extras: update own" on public.profile_extras
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- People can never grant themselves the "photo checked" badge from the app.
-- You set it by hand in Table Editor (where there is no signed-in app user).
create or replace function public.protect_photo_check()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.photo_checked := false;
      new.photo_checked_at := null;
    else
      new.photo_checked := old.photo_checked;
      new.photo_checked_at := old.photo_checked_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_photo_check on public.profile_extras;
create trigger protect_photo_check
  before insert or update on public.profile_extras
  for each row execute function public.protect_photo_check();

-- ---------------------------------------------------------------
-- 2. Gallery photos: up to 6 per person, visible to the owner and their friends only
-- ---------------------------------------------------------------
create table if not exists public.profile_photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path       text not null unique,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

-- If an older version of this table already exists, bring it up to date.
alter table public.profile_photos add column if not exists position integer not null default 0;
alter table public.profile_photos add column if not exists created_at timestamptz not null default now();

create index if not exists profile_photos_user_idx on public.profile_photos (user_id, position, created_at);

alter table public.profile_photos enable row level security;

drop policy if exists "photos: read own and friends" on public.profile_photos;
create policy "photos: read own and friends" on public.profile_photos
  for select to authenticated
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

drop policy if exists "photos: insert own (max 6)" on public.profile_photos;
create policy "photos: insert own (max 6)" on public.profile_photos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and path like auth.uid()::text || '/%'
    and (select count(*) from public.profile_photos p where p.user_id = auth.uid()) < 6
  );

drop policy if exists "photos: delete own" on public.profile_photos;
create policy "photos: delete own" on public.profile_photos
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- 3. Private storage bucket for gallery images (5 MB, JPG/PNG/WebP)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-gallery', 'profile-gallery', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "gallery files: upload to own folder" on storage.objects;
create policy "gallery files: upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "gallery files: read own and friends" on storage.objects;
create policy "gallery files: read own and friends" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-gallery'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "gallery files: delete own" on storage.objects;
create policy "gallery files: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-gallery'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------
-- To approve a photo check (by hand, after you've checked the person):
--   Table Editor -> profile_extras -> find the row with photo_check_requested_at set
--   -> tick photo_checked and set photo_checked_at to now.
-- ---------------------------------------------------------------
