-- F.R.I.E.N.D.S: open plans (Activities)
-- Run AFTER friends_feed.sql and safety.sql. Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again; it will not delete any data.

-- ---------------------------------------------------------------
-- 1. Plans: a member posts something to do; their friends can join.
--    Visible to the host and the host's friends only (blocks are respected).
-- ---------------------------------------------------------------
create table if not exists public.plans (
  id         uuid primary key default gen_random_uuid(),
  host_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 3 and 80),
  details    text not null default '' check (char_length(details) <= 300),
  place      text not null default '' check (char_length(place) <= 80),
  starts_at  timestamptz not null,
  spots      integer not null default 4 check (spots between 1 and 20),
  canceled   boolean not null default false,
  created_at timestamptz not null default now()
);

-- If an older version of this table already exists, bring it up to date.
alter table public.plans add column if not exists details text not null default '';
alter table public.plans add column if not exists place text not null default '';
alter table public.plans add column if not exists spots integer not null default 4;
alter table public.plans add column if not exists canceled boolean not null default false;
alter table public.plans add column if not exists created_at timestamptz not null default now();

create index if not exists plans_starts_idx on public.plans (starts_at);
create index if not exists plans_host_idx on public.plans (host_id, starts_at);

alter table public.plans enable row level security;

drop policy if exists "plans: read own and friends" on public.plans;
create policy "plans: read own and friends" on public.plans
  for select to authenticated
  using (host_id = auth.uid() or public.are_friends(auth.uid(), host_id));

drop policy if exists "plans: insert own" on public.plans;
create policy "plans: insert own" on public.plans
  for insert to authenticated
  with check (host_id = auth.uid() and starts_at > now());

drop policy if exists "plans: update own" on public.plans;
create policy "plans: update own" on public.plans
  for update to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

drop policy if exists "plans: delete own" on public.plans;
create policy "plans: delete own" on public.plans
  for delete to authenticated
  using (host_id = auth.uid());

-- ---------------------------------------------------------------
-- 2. Who has joined. People join through join_plan() below (it checks the
--    friendship and the number of free spots), and can leave by themselves.
-- ---------------------------------------------------------------
create table if not exists public.plan_members (
  plan_id   uuid not null references public.plans (id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

alter table public.plan_members enable row level security;

-- You can see who is in a plan when you are allowed to see the plan itself.
drop policy if exists "plan members: read when plan visible" on public.plan_members;
create policy "plan members: read when plan visible" on public.plan_members
  for select to authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id));

drop policy if exists "plan members: leave own" on public.plan_members;
create policy "plan members: leave own" on public.plan_members
  for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.join_plan(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_row public.plans%rowtype;
  taken integer;
begin
  if auth.uid() is null then
    raise exception 'Please sign in again.';
  end if;

  select * into plan_row from public.plans where id = target for update;

  if not found then
    raise exception 'This plan could not be found.';
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
  if not public.are_friends(auth.uid(), plan_row.host_id) then
    raise exception 'Only the host''s friends can join this plan.';
  end if;

  if exists (select 1 from public.plan_members where plan_id = target and user_id = auth.uid()) then
    return;
  end if;

  select count(*) into taken from public.plan_members where plan_id = target;
  if taken >= plan_row.spots then
    raise exception 'This plan is full.';
  end if;

  insert into public.plan_members (plan_id, user_id) values (target, auth.uid());
end;
$$;

grant execute on function public.join_plan(uuid) to authenticated;
