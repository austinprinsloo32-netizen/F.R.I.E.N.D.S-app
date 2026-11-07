-- F.R.I.E.N.D.S: admin member list and plans overview
-- Run once in the Supabase SQL Editor (after admin.sql). Only admins can call these.

create or replace function public.admin_members()
returns table (
  member_id uuid,
  name text,
  email text,
  place text,
  bio text,
  interests jsonb,
  joined_at timestamptz,
  last_sign_in timestamptz,
  friends integer,
  messages_sent integer,
  plans_hosted integer,
  plans_joined integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Not allowed.';
  end if;

  return query
    select u.id,
           coalesce(p.display_name, '')::text,
           u.email::text,
           coalesce(p.location, '')::text,
           coalesce(p.bio, '')::text,
           to_jsonb(p.interests),
           u.created_at,
           u.last_sign_in_at,
           (select count(*)::int from public.friend_requests fr
             where fr.status = 'accepted' and (fr.sender_id = u.id or fr.receiver_id = u.id)),
           (select count(*)::int from public.messages m where m.sender_id = u.id),
           (select count(*)::int from public.plans pl where pl.host_id = u.id),
           (select count(*)::int from public.plan_members pm where pm.user_id = u.id)
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by u.created_at desc
    limit 500;
end;
$$;

grant execute on function public.admin_members() to authenticated;

create or replace function public.admin_plans()
returns table (
  plan_id uuid,
  title text,
  host_name text,
  place text,
  starts_at timestamptz,
  spots integer,
  joined integer,
  joined_names text,
  canceled boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Not allowed.';
  end if;

  return query
    select pl.id, pl.title, coalesce(h.display_name, 'Member')::text, pl.place,
           pl.starts_at, pl.spots,
           (select count(*)::int from public.plan_members pm where pm.plan_id = pl.id),
           coalesce((select string_agg(coalesce(jp.display_name, 'Member'), ', ')
                       from public.plan_members pm
                       left join public.profiles jp on jp.id = pm.user_id
                      where pm.plan_id = pl.id), '')::text,
           pl.canceled, pl.created_at
    from public.plans pl
    left join public.profiles h on h.id = pl.host_id
    order by pl.created_at desc
    limit 100;
end;
$$;

grant execute on function public.admin_plans() to authenticated;
