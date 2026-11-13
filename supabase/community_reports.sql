-- F.R.I.E.N.D.S: reporting for Communities posts and plans.
-- Run AFTER communities.sql and admin.sql. Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again; it will not delete any data.
--
-- What it adds:
--  * Context columns on the existing "reports" table (which community, which post or plan, and a
--    copy of the reported text, so the evidence is still there if the author deletes it).
--  * report_community_content(): the only way the app files these reports. It checks that you
--    belong to that community, that you are not reporting your own content, that you have not
--    already reported it, and that you are not sending a flood of reports.
--  * admin_reports_full(): what the Admin page reads, now including community context.
--
-- The reported person is never told who reported them.

-- ---------------------------------------------------------------
-- 1. Context on reports
-- ---------------------------------------------------------------
alter table public.reports
  add column if not exists community_id uuid references public.communities (id) on delete set null;
alter table public.reports
  add column if not exists community_post_id uuid references public.community_posts (id) on delete set null;
alter table public.reports
  add column if not exists community_plan_id uuid references public.community_plans (id) on delete set null;
alter table public.reports
  add column if not exists content_snapshot text check (char_length(content_snapshot) <= 600);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reports_one_target') then
    alter table public.reports
      add constraint reports_one_target
      check (num_nonnulls(post_id, community_post_id, community_plan_id) <= 1);
  end if;
end
$$;

create index if not exists reports_community_idx
  on public.reports (community_id) where community_id is not null;
create index if not exists reports_reporter_created_idx
  on public.reports (reporter_id, created_at desc);

-- Members may only fill in the original columns when inserting a report directly.
-- The community columns can only be set by report_community_content() below, so nobody can
-- fake a report about a post or plan they cannot see.
revoke insert on public.reports from authenticated;
grant insert (reporter_id, reported_id, post_id, reason, details) on public.reports to authenticated;

-- ---------------------------------------------------------------
-- 2. File a report about a community post or plan
-- ---------------------------------------------------------------
create or replace function public.report_community_content(
  content_kind   text,
  content_id     uuid,
  report_reason  text,
  report_details text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me       uuid := auth.uid();
  cid      uuid;
  author   uuid;
  snapshot text;
  cleaned  text := btrim(coalesce(report_details, ''));
begin
  if me is null then
    raise exception 'Please sign in again.';
  end if;
  if report_reason is null
     or report_reason not in ('spam', 'harassment', 'fake', 'inappropriate', 'unsafe', 'other') then
    raise exception 'Please choose a reason.';
  end if;
  if char_length(cleaned) > 500 then
    raise exception 'Please keep the details under 500 characters.';
  end if;

  if content_kind = 'post' then
    select p.community_id, p.author_id, left(p.body, 600)
      into cid, author, snapshot
      from public.community_posts p
     where p.id = content_id;
  elsif content_kind = 'plan' then
    select p.community_id, p.host_id,
           left(p.title
                || case when p.place <> '' then ' at ' || p.place else '' end
                || case when p.details <> '' then E'\n' || p.details else '' end, 600)
      into cid, author, snapshot
      from public.community_plans p
     where p.id = content_id;
  else
    raise exception 'Unknown kind of content.';
  end if;

  -- Same message whether it does not exist or you cannot see it.
  if cid is null or not public.is_community_member(cid, me) then
    raise exception 'You can only report things in a community you belong to.';
  end if;
  if author = me then
    raise exception 'You cannot report your own content.';
  end if;

  if exists (
    select 1 from public.reports r
     where r.reporter_id = me
       and r.status <> 'resolved'
       and ((content_kind = 'post' and r.community_post_id = content_id)
         or (content_kind = 'plan' and r.community_plan_id = content_id))
  ) then
    raise exception 'You have already reported this. The team will review it.';
  end if;

  if (select count(*) from public.reports r
       where r.reporter_id = me and r.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'You have sent a lot of reports in the last hour. Please try again later.';
  end if;

  insert into public.reports
    (reporter_id, reported_id, reason, details,
     community_id, community_post_id, community_plan_id, content_snapshot)
  values
    (me, author, report_reason, cleaned,
     cid,
     case when content_kind = 'post' then content_id end,
     case when content_kind = 'plan' then content_id end,
     snapshot);
end;
$$;

revoke all on function public.report_community_content(text, uuid, text, text) from public;
grant execute on function public.report_community_content(text, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------
-- 3. The Admin page's list of reports, now with community context
--    (admin_reports() from admin.sql is left as it is.)
-- ---------------------------------------------------------------
create or replace function public.admin_reports_full()
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
  post_content text,
  kind text,
  community_name text,
  content_snapshot text
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
           po.content,
           case
             when r.community_post_id is not null then 'community_post'
             when r.community_plan_id is not null then 'community_plan'
             when r.community_id is not null then 'community_content'
             else 'member'
           end,
           c.name,
           r.content_snapshot
    from public.reports r
    left join public.profiles pr on pr.id = r.reporter_id
    left join public.profiles pd on pd.id = r.reported_id
    left join public.posts po on po.id = r.post_id
    left join public.communities c on c.id = r.community_id
    order by (r.status = 'resolved'), r.created_at desc
    limit 100;
end;
$$;

grant execute on function public.admin_reports_full() to authenticated;
