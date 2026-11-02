-- F.R.I.E.N.D.S: blocking and reporting
-- Run AFTER friends_feed.sql. Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again; it will not delete any data.

-- ---------------------------------------------------------------
-- 1. Blocks. You can only ever see your own blocks (nobody can tell they were blocked).
-- ---------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists "blocks: read own" on public.blocks;
create policy "blocks: read own" on public.blocks
  for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "blocks: insert own" on public.blocks;
create policy "blocks: insert own" on public.blocks
  for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "blocks: delete own" on public.blocks;
create policy "blocks: delete own" on public.blocks
  for delete to authenticated
  using (blocker_id = auth.uid());

-- Is there a block between two people, in either direction?
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- Friends now means: accepted request AND no block. This hides statuses and updates both ways.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.is_blocked(a, b)
    and exists (
      select 1
      from public.friend_requests fr
      where fr.status = 'accepted'
        and ((fr.sender_id = a and fr.receiver_id = b)
          or (fr.sender_id = b and fr.receiver_id = a))
    );
$$;

grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------
-- 2. block_user(): blocks someone and ends any friendship or pending request
-- ---------------------------------------------------------------
create or replace function public.block_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in again.';
  end if;
  if target = auth.uid() then
    raise exception 'You can''t block yourself.';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (auth.uid(), target)
  on conflict do nothing;

  update public.friend_requests
     set status = 'declined'
   where status in ('pending', 'accepted')
     and ((sender_id = auth.uid() and receiver_id = target)
       or (sender_id = target and receiver_id = auth.uid()));
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 3. Stop blocked people messaging or sending requests (enforced in the database)
-- ---------------------------------------------------------------
create or replace function public.guard_blocked_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other uuid;
begin
  select case when c.user_one = new.sender_id then c.user_two else c.user_one end
    into other
    from public.conversations c
   where c.id = new.conversation_id;

  if other is not null and public.is_blocked(new.sender_id, other) then
    raise exception 'This message can''t be sent.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_blocked_message on public.messages;
create trigger guard_blocked_message
  before insert on public.messages
  for each row execute function public.guard_blocked_message();

create or replace function public.guard_blocked_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_blocked(new.sender_id, new.receiver_id) then
    raise exception 'This request can''t be sent.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_blocked_request on public.friend_requests;
create trigger guard_blocked_request
  before insert on public.friend_requests
  for each row execute function public.guard_blocked_request();

-- ---------------------------------------------------------------
-- 4. Reports. People can file and see their own; you review them in
--    Supabase -> Table Editor -> reports.
-- ---------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reported_id uuid not null references auth.users (id) on delete cascade,
  post_id     uuid references public.posts (id) on delete set null,
  reason      text not null check (reason in ('spam', 'harassment', 'fake', 'inappropriate', 'unsafe', 'other')),
  details     text not null default '' check (char_length(details) <= 500),
  status      text not null default 'open' check (status in ('open', 'reviewing', 'resolved')),
  created_at  timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create index if not exists reports_status_created_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports: insert own" on public.reports;
create policy "reports: insert own" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "reports: read own" on public.reports;
create policy "reports: read own" on public.reports
  for select to authenticated
  using (reporter_id = auth.uid());
