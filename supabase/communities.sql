-- F.R.I.E.N.D.S: Communities MVP  (DRAFT - review before running anywhere)
--
-- DO NOT run this on the live Supabase project until Austin has reviewed it.
-- Safest way to test: create a second free Supabase project, run base_tables.sql,
-- friends_feed.sql and safety.sql first, then this file, and point apps/web/.env.local at it.
-- Safe to run again; it will not delete any data.
--
-- Design:
--   * Communities are created by an admin (SQL editor), not by members.
--   * You join with an invite code. Non-members cannot see that a community exists.
--   * Members see each other's name and photo only (through community_directory()).
--   * Hosts post announcements, remove members, and members host community plans.
--   * Separate tables from plans/plan_members, so existing Activities are untouched.
--
-- Existing FRIENDS schema used here:
--   * public.profiles has id, display_name and avatar_path; avatar_path is resolved to a
--     short-lived signed URL by the web app.
--   * public.blocks has blocker_id and blocked_id. Blocked pairs are omitted from the
--     community directory and cannot join each other's community plans.

-- ---------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------
create table if not exists public.communities (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 3 and 60),
  description  text not null default '' check (char_length(description) <= 400),
  guidelines   text not null default '' check (char_length(guidelines) <= 600),
  invite_code  text not null unique check (invite_code ~ '^[A-Z0-9-]{6,24}$'),
  max_members  integer not null default 150 check (max_members between 2 and 500),
  joining_open boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role         text not null default 'member' check (role in ('host', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index if not exists community_members_user_idx on public.community_members (user_id);
create unique index if not exists community_members_one_host_idx
  on public.community_members (community_id) where role = 'host';

-- Removed members. Nobody can read or write this directly; only the functions below use it.
create table if not exists public.community_bans (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  banned_by    uuid references auth.users (id) on delete set null,
  banned_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.community_posts (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  author_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body         text not null check (char_length(btrim(body)) between 1 and 500),
  created_at   timestamptz not null default now()
);
create index if not exists community_posts_idx on public.community_posts (community_id, created_at desc);

create table if not exists public.community_plans (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  host_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 3 and 80),
  details      text not null default '' check (char_length(details) <= 300),
  place        text not null default '' check (char_length(place) <= 80),
  starts_at    timestamptz not null,
  spots        integer not null default 4 check (spots between 1 and 20),
  canceled     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists community_plans_idx on public.community_plans (community_id, starts_at);

create table if not exists public.community_plan_members (
  plan_id   uuid not null references public.community_plans (id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

-- ---------------------------------------------------------------
-- 2. Helper functions
--    Policies call these instead of querying community_members directly.
--    A policy that queries its own table loops forever (the same problem the
--    gallery rules had), so these run as the table owner and skip RLS.
-- ---------------------------------------------------------------
create or replace function public.is_community_member(cid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and auth.uid() = uid
    and exists (
    select 1 from public.community_members where community_id = cid and user_id = uid
  );
$$;

create or replace function public.is_community_host(cid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and auth.uid() = uid
    and exists (
    select 1 from public.community_members
    where community_id = cid and user_id = uid and role = 'host'
  );
$$;

revoke all on function public.is_community_member(uuid, uuid) from public, anon;
revoke all on function public.is_community_host(uuid, uuid) from public, anon;
grant execute on function public.is_community_member(uuid, uuid) to authenticated;
grant execute on function public.is_community_host(uuid, uuid) to authenticated;

create or replace function public.community_summary(cid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  member_role text;
  total_members integer;
begin
  if auth.uid() is null or not public.is_community_member(cid, auth.uid()) then
    raise exception 'You are not a member of this community.';
  end if;

  select role into member_role
  from public.community_members
  where community_id = cid and user_id = auth.uid();

  select count(*)::integer into total_members
  from public.community_members
  where community_id = cid;

  return jsonb_build_object('my_role', member_role, 'member_count', total_members);
end;
$$;

revoke all on function public.community_summary(uuid) from public, anon;
grant execute on function public.community_summary(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 3. Row-level security
-- ---------------------------------------------------------------
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_bans enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_plans enable row level security;
alter table public.community_plan_members enable row level security;

-- communities: only members can see them. No insert/update/delete policy: an admin
-- creates communities in the SQL editor (which bypasses RLS).
drop policy if exists "communities: read as member" on public.communities;
create policy "communities: read as member" on public.communities
  for select to authenticated
  using (public.is_community_member(id, auth.uid()));

-- Members can read only their own membership row. The directory function returns
-- the limited member list, and community_summary() returns the caller's role/count.
drop policy if exists "community members: read as member" on public.community_members;
create policy "community members: read as member" on public.community_members
  for select to authenticated
  using (user_id = auth.uid() and public.is_community_member(community_id, auth.uid()));

drop policy if exists "community members: leave own" on public.community_members;
create policy "community members: leave own" on public.community_members
  for delete to authenticated
  using (user_id = auth.uid() and role <> 'host');

-- community_bans: RLS on, no policies = nobody can read or write it directly.

-- posts: members read, only hosts write.
drop policy if exists "community posts: read as member" on public.community_posts;
create policy "community posts: read as member" on public.community_posts
  for select to authenticated
  using (public.is_community_member(community_id, auth.uid()));

drop policy if exists "community posts: host writes" on public.community_posts;
create policy "community posts: host writes" on public.community_posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_community_host(community_id, auth.uid()));

drop policy if exists "community posts: host deletes" on public.community_posts;
create policy "community posts: host deletes" on public.community_posts
  for delete to authenticated
  using (public.is_community_host(community_id, auth.uid()));

-- plans: members read; any member can host one; hosts of a plan (or the community host) can cancel.
drop policy if exists "community plans: read as member" on public.community_plans;
create policy "community plans: read as member" on public.community_plans
  for select to authenticated
  using (public.is_community_member(community_id, auth.uid()));

drop policy if exists "community plans: insert as member" on public.community_plans;
create policy "community plans: insert as member" on public.community_plans
  for insert to authenticated
  with check (
    host_id = auth.uid()
    and starts_at > now()
    and public.is_community_member(community_id, auth.uid())
  );

drop policy if exists "community plans: update own or as community host" on public.community_plans;
revoke update on public.community_plans from public, anon, authenticated;

-- plan members: you can see them when you can see the plan; leave by yourself; join via function.
drop policy if exists "community plan members: read when plan visible" on public.community_plan_members;
create policy "community plan members: read when plan visible" on public.community_plan_members
  for select to authenticated
  using (exists (select 1 from public.community_plans p where p.id = plan_id));

drop policy if exists "community plan members: leave own" on public.community_plan_members;
create policy "community plan members: leave own" on public.community_plan_members
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- 4. Functions the app calls
-- ---------------------------------------------------------------

-- Join with an invite code. Returns the community id.
create or replace function public.join_community(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.communities%rowtype;
  taken integer;
begin
  if auth.uid() is null then
    raise exception 'Please sign in again.';
  end if;

  select * into c from public.communities
  where invite_code = upper(btrim(code))
  for update;

  if not found then
    raise exception 'That invite code was not recognised. Check it and try again.';
  end if;
  if exists (select 1 from public.community_members where community_id = c.id and user_id = auth.uid()) then
    return c.id;
  end if;
  if exists (select 1 from public.community_bans where community_id = c.id and user_id = auth.uid()) then
    raise exception 'You can''t join this community.';
  end if;
  if not c.joining_open then
    raise exception 'This community is not accepting new members right now.';
  end if;

  select count(*) into taken from public.community_members where community_id = c.id;
  if taken >= c.max_members then
    raise exception 'This community is full.';
  end if;

  insert into public.community_members (community_id, user_id, role) values (c.id, auth.uid(), 'member');
  return c.id;
end;
$$;

-- Name and photo of members, for members only. Pass only_ids to look up specific people
-- (plan hosts, post authors). Otherwise it returns one page of the member list.
drop function if exists public.community_directory(uuid, uuid[], integer, integer);
create function public.community_directory(
  cid uuid,
  only_ids uuid[] default null,
  page_limit integer default 30,
  page_offset integer default 0
)
returns table (user_id uuid, display_name text, avatar_path text, role text, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_community_member(cid, auth.uid()) then
    raise exception 'You are not a member of this community.';
  end if;

  return query
    select m.user_id,
           p.display_name::text,
           p.avatar_path::text,
           m.role,
           m.joined_at
    from public.community_members m
    left join public.profiles p on p.id = m.user_id
    where m.community_id = cid
      and (only_ids is null or m.user_id = any (only_ids))
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = m.user_id)
           or (b.blocker_id = m.user_id and b.blocked_id = auth.uid())
      )
    order by (m.role = 'host') desc, m.joined_at asc
    limit least(greatest(page_limit, 1), 200)
    offset greatest(page_offset, 0);
end;
$$;

-- Host removes a member. They are also barred from joining again with the code.
create or replace function public.remove_community_member(cid uuid, target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_community_host(cid, auth.uid()) then
    raise exception 'Only the host can remove members.';
  end if;
  if target = auth.uid() then
    raise exception 'You can''t remove yourself.';
  end if;
  if not exists (
    select 1 from public.community_members
    where community_id = cid and user_id = target
  ) then
    raise exception 'That person is not a member of this community.';
  end if;
  if exists (
    select 1 from public.community_members
    where community_id = cid and user_id = target and role = 'host'
  ) then
    raise exception 'You can''t remove another host.';
  end if;

  insert into public.community_bans (community_id, user_id, banned_by)
  values (cid, target, auth.uid())
  on conflict do nothing;

  delete from public.community_members where community_id = cid and user_id = target;
end;
$$;

-- Join a community plan: must be a member, plan open, not full.
create or replace function public.join_community_plan(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_row public.community_plans%rowtype;
  taken integer;
begin
  if auth.uid() is null then
    raise exception 'Please sign in again.';
  end if;

  select * into plan_row from public.community_plans where id = target for update;

  if not found then
    raise exception 'This plan could not be found.';
  end if;
  if not public.is_community_member(plan_row.community_id, auth.uid()) then
    raise exception 'Only members of this community can join this plan.';
  end if;
  if plan_row.canceled then
    raise exception 'This plan was canceled.';
  end if;
  if plan_row.starts_at <= now() then
    raise exception 'This plan has already started.';
  end if;
  if plan_row.host_id = auth.uid() then
    raise exception 'You are hosting this plan.';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = plan_row.host_id)
       or (b.blocker_id = plan_row.host_id and b.blocked_id = auth.uid())
  ) then
    raise exception 'You can''t join this plan.';
  end if;

  if exists (select 1 from public.community_plan_members where plan_id = target and user_id = auth.uid()) then
    return;
  end if;

  select count(*) into taken from public.community_plan_members where plan_id = target;
  if taken >= plan_row.spots then
    raise exception 'This plan is full.';
  end if;

  insert into public.community_plan_members (plan_id, user_id) values (target, auth.uid());
end;
$$;

-- Only the plan host or community host can cancel; other plan fields are not client-editable.
create or replace function public.cancel_community_plan(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_row public.community_plans%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Please sign in again.';
  end if;

  select * into plan_row from public.community_plans where id = target for update;
  if not found then
    raise exception 'This plan could not be found.';
  end if;
  if not public.is_community_member(plan_row.community_id, auth.uid()) then
    raise exception 'You are not a member of this community.';
  end if;
  if plan_row.host_id <> auth.uid()
     and not public.is_community_host(plan_row.community_id, auth.uid()) then
    raise exception 'Only the plan host or community host can cancel it.';
  end if;

  update public.community_plans set canceled = true where id = target;
end;
$$;

-- Clean up a member's plan spots if they leave or are removed from the community.
create or replace function public.cleanup_community_plan_memberships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_plans
  set canceled = true
  where community_id = old.community_id
    and host_id = old.user_id
    and not canceled
    and starts_at > now() - interval '3 hours';

  delete from public.community_plan_members pm
  using public.community_plans p
  where p.id = pm.plan_id
    and p.community_id = old.community_id
    and pm.user_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists cleanup_community_plan_memberships on public.community_members;
create trigger cleanup_community_plan_memberships
  after delete on public.community_members
  for each row execute function public.cleanup_community_plan_memberships();

revoke all on function public.join_community(text) from public, anon;
revoke all on function public.community_directory(uuid, uuid[], integer, integer) from public, anon;
revoke all on function public.remove_community_member(uuid, uuid) from public, anon;
revoke all on function public.join_community_plan(uuid) from public, anon;
revoke all on function public.cancel_community_plan(uuid) from public, anon;
revoke all on function public.cleanup_community_plan_memberships() from public, anon, authenticated;
grant execute on function public.join_community(text) to authenticated;
grant execute on function public.community_directory(uuid, uuid[], integer, integer) to authenticated;
grant execute on function public.remove_community_member(uuid, uuid) to authenticated;
grant execute on function public.join_community_plan(uuid) to authenticated;
grant execute on function public.cancel_community_plan(uuid) to authenticated;

-- ---------------------------------------------------------------
-- 5. How an admin creates a community (run by hand in the SQL editor; NOT part of the app)
--    Make the invite code long and random-looking, because it is the only door in.
-- ---------------------------------------------------------------
-- with c as (
--   insert into public.communities (name, description, guidelines, invite_code)
--   values (
--     'Your community name',
--     'One or two sentences about who this is for.',
--     'Be kind. Meet in public places. No selling. Hosts can remove anyone.',
--     'CHOOSE-A-CODE-7K2Q'
--   )
--   returning id
-- )
-- insert into public.community_members (community_id, user_id, role)
-- select id, 'PASTE-THE-HOST-USER-UUID-HERE', 'host' from c;
