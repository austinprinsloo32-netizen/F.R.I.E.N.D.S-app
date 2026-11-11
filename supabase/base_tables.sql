-- F.R.I.E.N.D.S: the base tables (profiles, friend requests, conversations, messages)
-- RUN THIS FIRST, before friends_feed.sql. Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again; it will not delete any data.
--
-- Everything else in this folder builds on these tables, so a brand-new Supabase
-- project needs this file before any other. It also creates the "profile-photos"
-- storage bucket that holds profile pictures (avatars).

-- ---------------------------------------------------------------
-- 1. Profiles: one row per person, created when they first save their profile.
--    Every signed-in member can read profiles (that is how Discover works).
--    Only you can create or change your own.
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  bio          text not null default '',
  location     text not null default '',
  interests    text[] not null default '{}',
  avatar_path  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- If an older version of this table already exists, bring it up to date.
alter table public.profiles add column if not exists display_name text not null default '';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists location text not null default '';
alter table public.profiles add column if not exists interests text[] not null default '{}';
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_display_name_idx on public.profiles (display_name);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read all members" on public.profiles;
create policy "profiles: read all members" on public.profiles
  for select to authenticated
  using (true);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------
-- 2. Friend requests. One row per pair of people, whichever way round it was sent.
--    status: pending -> accepted or declined. Only the receiver can answer.
-- ---------------------------------------------------------------
create table if not exists public.friend_requests (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

-- Only one active request or friendship per pair, in either direction.
-- Keep declined rows for history, but allow either person to send a fresh request.
drop index if exists public.friend_requests_pair_idx;
create unique index friend_requests_pair_idx
  on public.friend_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
  where status in ('pending', 'accepted');

create index if not exists friend_requests_receiver_idx on public.friend_requests (receiver_id, status);
create index if not exists friend_requests_sender_idx on public.friend_requests (sender_id, status);

alter table public.friend_requests enable row level security;

drop policy if exists "requests: read own" on public.friend_requests;
create policy "requests: read own" on public.friend_requests
  for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "requests: send as me" on public.friend_requests;
create policy "requests: send as me" on public.friend_requests
  for insert to authenticated
  with check (sender_id = auth.uid() and status = 'pending');

-- Only the person who received a pending request can answer it, and only by
-- accepting or declining. (block_user() in safety.sql runs with its own rights.)
drop policy if exists "requests: receiver answers" on public.friend_requests;
create policy "requests: receiver answers" on public.friend_requests
  for update to authenticated
  using (receiver_id = auth.uid() and status = 'pending')
  with check (receiver_id = auth.uid() and status in ('accepted', 'declined'));

-- Signed-in members may change the status column and nothing else on a request.
revoke update on public.friend_requests from authenticated;
grant update (status) on public.friend_requests to authenticated;

-- ---------------------------------------------------------------
-- 3. Conversations: one private chat per pair of friends.
--    user_one is always the smaller id, so a pair can only ever have one chat.
-- ---------------------------------------------------------------
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_one   uuid not null references auth.users (id) on delete cascade,
  user_two   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_one < user_two),
  unique (user_one, user_two)
);

create index if not exists conversations_user_two_idx on public.conversations (user_two);

alter table public.conversations enable row level security;

drop policy if exists "conversations: read own" on public.conversations;
create policy "conversations: read own" on public.conversations
  for select to authenticated
  using (user_one = auth.uid() or user_two = auth.uid());

-- You can start a chat only with someone you are friends with.
drop policy if exists "conversations: start with a friend" on public.conversations;
create policy "conversations: start with a friend" on public.conversations
  for insert to authenticated
  with check (
    (user_one = auth.uid() or user_two = auth.uid())
    and exists (
      select 1 from public.friend_requests fr
      where fr.status = 'accepted'
        and ((fr.sender_id = user_one and fr.receiver_id = user_two)
          or (fr.sender_id = user_two and fr.receiver_id = user_one))
    )
  );

-- ---------------------------------------------------------------
-- 4. Messages: only the two people in the conversation can read or send.
--    (safety.sql adds a check that stops blocked people sending.)
-- ---------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content         text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id);

alter table public.messages enable row level security;

drop policy if exists "messages: read my conversations" on public.messages;
create policy "messages: read my conversations" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_one = auth.uid() or c.user_two = auth.uid())
    )
  );

drop policy if exists "messages: send in my conversations" on public.messages;
create policy "messages: send in my conversations" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_one = auth.uid() or c.user_two = auth.uid())
    )
  );

-- Live message updates in the app. If this line errors, switch it on instead in
-- Supabase -> Database -> Replication -> supabase_realtime -> messages.
-- (The app also checks for new messages every 20 seconds, so chat still works without it.)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;

-- ---------------------------------------------------------------
-- 5. Private storage bucket for profile pictures (5 MB, JPG/PNG/WebP).
--    Files live in a folder named after the person's id. Any signed-in member
--    can see profile pictures (they appear in Discover); only you can add or remove yours.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "avatars: upload to own folder" on storage.objects;
create policy "avatars: upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: read all members" on storage.objects;
create policy "avatars: read all members" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos');

drop policy if exists "avatars: delete own" on storage.objects;
create policy "avatars: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
