-- F.R.I.E.N.D.S: statuses + friends-only updates
-- Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again; it will not delete any data.

-- ---------------------------------------------------------------
-- Helper: are two people friends? (accepted friend request, either direction)
-- security definer so it can read friend_requests whatever its own rules are.
-- ---------------------------------------------------------------
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friend_requests fr
    where fr.status = 'accepted'
      and ((fr.sender_id = a and fr.receiver_id = b)
        or (fr.sender_id = b and fr.receiver_id = a))
  );
$$;

grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------
-- 1. Statuses: one active status per person, lasts 24 hours
-- ---------------------------------------------------------------
create table if not exists public.statuses (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('free', 'plans', 'doing', 'busy')),
  text       text not null default '' check (char_length(text) <= 80),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.statuses enable row level security;

drop policy if exists "statuses: read own and friends" on public.statuses;
create policy "statuses: read own and friends" on public.statuses
  for select to authenticated
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

drop policy if exists "statuses: insert own" on public.statuses;
create policy "statuses: insert own" on public.statuses
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "statuses: update own" on public.statuses;
create policy "statuses: update own" on public.statuses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "statuses: delete own" on public.statuses;
create policy "statuses: delete own" on public.statuses
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- 2. Posts: short updates, visible to the author and their friends only
-- ---------------------------------------------------------------
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content    text not null check (char_length(btrim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists posts_author_created_idx
  on public.posts (author_id, created_at desc);
create index if not exists posts_created_idx
  on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "posts: read own and friends" on public.posts;
create policy "posts: read own and friends" on public.posts
  for select to authenticated
  using (author_id = auth.uid() or public.are_friends(auth.uid(), author_id));

drop policy if exists "posts: insert own" on public.posts;
create policy "posts: insert own" on public.posts
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "posts: delete own" on public.posts;
create policy "posts: delete own" on public.posts
  for delete to authenticated
  using (author_id = auth.uid());

-- ---------------------------------------------------------------
-- 3. Reactions: private. You see your own, and the post's author sees all
--    reactions on their post. Nobody sees public totals.
-- ---------------------------------------------------------------
create table if not exists public.post_reactions (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emoji      text not null check (emoji in ('heart', 'thumb', 'laugh', 'cheer')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_reactions enable row level security;

drop policy if exists "reactions: read own or on my posts" on public.post_reactions;
create policy "reactions: read own or on my posts" on public.post_reactions
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

-- You can only react to posts you are allowed to see (the posts rule above applies here).
drop policy if exists "reactions: insert own" on public.post_reactions;
create policy "reactions: insert own" on public.post_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy if exists "reactions: update own" on public.post_reactions;
create policy "reactions: update own" on public.post_reactions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "reactions: delete own" on public.post_reactions;
create policy "reactions: delete own" on public.post_reactions
  for delete to authenticated
  using (user_id = auth.uid());
