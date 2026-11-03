-- F.R.I.E.N.D.S: admin page (connection numbers, reports, photo checks)
-- Run AFTER friends_feed.sql, safety.sql, trust_gallery.sql and plans.sql.
-- Supabase dashboard -> SQL Editor -> New query -> paste -> Run. Safe to run again.

-- ---------------------------------------------------------------
-- 1. Who is an admin. Nobody can add themselves from the app: you add yourself below.
-- ---------------------------------------------------------------
create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "admins: read own row" on public.app_admins;
create policy "admins: read own row" on public.app_admins
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------
-- 2. Let admins (and only admins) grant the "Photo checked" badge from the app.
--    Everyone else still cannot change it.
-- ---------------------------------------------------------------
create or replace function public.protect_photo_check()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
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

-- ---------------------------------------------------------------
-- 3. Connection numbers. "Cohort" = people who joined at least 7 days ago,
--    so each one has had a full first week to do things.
-- ---------------------------------------------------------------
create or replace function public.admin_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed.';
  end if;

  return (
    with u as (
      select id, created_at from auth.users
    ),
    cohort as (
      select id, created_at from u where created_at <= now() - interval '7 days'
    ),
    sent as (
      select c.id from cohort c
      where exists (
        select 1 from public.friend_requests fr
        where fr.sender_id = c.id
          and fr.created_at <= c.created_at + interval '7 days'
      )
    ),
    friended as (
      select c.id from cohort c
      where exists (
        select 1 from public.friend_requests fr
        where fr.status = 'accepted'
          and (fr.sender_id = c.id or fr.receiver_id = c.id)
          and fr.created_at <= c.created_at + interval '7 days'
      )
    ),
    talked as (
      select c.id from cohort c
      where exists (
        select 1
        from public.messages m1
        join public.messages m2
          on m2.conversation_id = m1.conversation_id
         and m2.sender_id <> m1.sender_id
         and m2.created_at > m1.created_at
        where m1.sender_id = c.id
          and m1.created_at <= c.created_at + interval '7 days'
          and m2.created_at <= c.created_at + interval '7 days'
      )
    ),
    acts as (
      select sender_id as uid, created_at as at from public.messages
      union all select author_id, created_at from public.posts
      union all select host_id, created_at from public.plans
      union all select sender_id, created_at from public.friend_requests
      union all select user_id, updated_at from public.statuses
    ),
    active_now as (
      select count(distinct uid) as n from acts where at > now() - interval '7 days'
    ),
    active_before as (
      select count(distinct uid) as n from acts
      where at <= now() - interval '7 days' and at > now() - interval '14 days'
    )
    select jsonb_build_object(
      'members_total',      (select count(*) from u),
      'members_new_7d',     (select count(*) from u where created_at > now() - interval '7 days'),
      'cohort_size',        (select count(*) from cohort),
      'cohort_sent_request',(select count(*) from sent),
      'cohort_got_friend',  (select count(*) from friended),
      'cohort_conversation',(select count(*) from talked),
      'active_7d',          (select n from active_now),
      'active_prev_7d',     (select n from active_before),
      'friendships',        (select count(*) from public.friend_requests where status = 'accepted'),
      'messages_7d',        (select count(*) from public.messages where created_at > now() - interval '7 days'),
      'updates_7d',         (select count(*) from public.posts where created_at > now() - interval '7 days'),
      'plans_upcoming',     (select count(*) from public.plans where not canceled and starts_at > now()),
      'plan_joins_total',   (select count(*) from public.plan_members),
      'reports_open',       (select count(*) from public.reports where status = 'open'),
      'photo_checks_waiting',(select count(*) from public.profile_extras
                              where photo_check_requested_at is not null and not photo_checked)
    )
  );
end;
$$;

grant execute on function public.admin_metrics() to authenticated;

-- ---------------------------------------------------------------
-- 4. Reports and photo-check requests, for the admin page
-- ---------------------------------------------------------------
create or replace function public.admin_reports()
returns table (
  id uuid,
  created_at timestamptz,
  status text,
  reason text,
  details text,
  reporter_id uuid,
  reporter_name text,
  reported_id uuid,
  reported_name text,
  post_content text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed.';
  end if;

  return query
    select r.id, r.created_at, r.status, r.reason, r.details,
           r.reporter_id, coalesce(pr.display_name, 'Member'),
           r.reported_id, coalesce(pd.display_name, 'Member'),
           po.content
    from public.reports r
    left join public.profiles pr on pr.id = r.reporter_id
    left join public.profiles pd on pd.id = r.reported_id
    left join public.posts po on po.id = r.post_id
    order by (r.status = 'resolved'), r.created_at desc
    limit 100;
end;
$$;

grant execute on function public.admin_reports() to authenticated;

create or replace function public.admin_set_report_status(report_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed.';
  end if;
  if new_status not in ('open', 'reviewing', 'resolved') then
    raise exception 'Unknown status.';
  end if;
  update public.reports set status = new_status where id = report_id;
end;
$$;

grant execute on function public.admin_set_report_status(uuid, text) to authenticated;

create or replace function public.admin_photo_requests()
returns table (user_id uuid, display_name text, requested_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed.';
  end if;

  return query
    select e.user_id, coalesce(p.display_name, 'Member'), e.photo_check_requested_at
    from public.profile_extras e
    left join public.profiles p on p.id = e.user_id
    where e.photo_check_requested_at is not null and not e.photo_checked
    order by e.photo_check_requested_at;
end;
$$;

grant execute on function public.admin_photo_requests() to authenticated;

-- Approve or decline a photo check. Declining clears the request so the member can ask again.
create or replace function public.admin_review_photo(target uuid, approved boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed.';
  end if;

  update public.profile_extras
     set photo_checked = approved,
         photo_checked_at = case when approved then now() else null end,
         photo_check_requested_at = case when approved then photo_check_requested_at else null end,
         updated_at = now()
   where user_id = target;
end;
$$;

grant execute on function public.admin_review_photo(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------
-- 5. MAKE YOURSELF AN ADMIN (do this once).
--    Replace the email below with the email you log in to the app with, then run just this part.
-- ---------------------------------------------------------------
-- insert into public.app_admins (user_id)
-- select id from auth.users where email = 'austinprinsloo64@gmail.com'
-- on conflict do nothing;
