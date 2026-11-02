-- ============================================================================
-- F.R.I.E.N.D.S: profile photo gallery, trust signals and badges
-- Run once in Supabase > SQL Editor. Safe to run again.
-- Needs the tables you already have: profiles, friend_requests, messages, blocks.
-- ============================================================================

-- 1) Gallery table ------------------------------------------------------------
create table if not exists public.profile_photos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  path        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists profile_photos_user_idx
  on public.profile_photos (user_id, created_at);

alter table public.profile_photos enable row level security;

-- 2) At most 6 photos, and only inside your own storage folder -----------------
create or replace function public.limit_profile_photos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if split_part(new.path, '/', 1) <> new.user_id::text then
    raise exception 'Invalid photo path.';
  end if;
  if (select count(*) from public.profile_photos where user_id = new.user_id) >= 6 then
    raise exception 'You can add up to 6 photos.';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_photos_limit on public.profile_photos;
create trigger profile_photos_limit
  before insert on public.profile_photos
  for each row execute function public.limit_profile_photos();

-- 3) Who can see gallery rows: you, and your friends (never if either blocked) --
drop policy if exists "photos read own or friends" on public.profile_photos;
create policy "photos read own or friends"
  on public.profile_photos for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      exists (
        select 1 from public.friend_requests fr
        where fr.status = 'accepted'
          and ((fr.sender_id = (select auth.uid()) and fr.receiver_id = profile_photos.user_id)
            or (fr.receiver_id = (select auth.uid()) and fr.sender_id = profile_photos.user_id))
      )
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = (select auth.uid()) and b.blocked_id = profile_photos.user_id)
           or (b.blocker_id = profile_photos.user_id and b.blocked_id = (select auth.uid()))
      )
    )
  );

drop policy if exists "photos insert own" on public.profile_photos;
create policy "photos insert own"
  on public.profile_photos for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "photos delete own" on public.profile_photos;
create policy "photos delete own"
  on public.profile_photos for delete to authenticated
  using (user_id = (select auth.uid()));

-- 4) Trust signals + badges, worked out by the database so they can't be faked --
-- Returns null if you are not signed in or either of you has blocked the other.
-- Your own friend count is only returned to you.
create or replace function public.get_member_trust(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me         uuid := auth.uid();
  is_self    boolean;
  u          record;
  p          record;
  friends_n  int := 0;
  mutual_n   int := 0;
  photos_n   int := 0;
  sent_n     int := 0;
  rank_n     int := 0;
  badges     text[] := '{}';
begin
  if me is null then
    return null;
  end if;
  is_self := (me = target);

  if not is_self and exists (
    select 1 from public.blocks b
    where (b.blocker_id = me and b.blocked_id = target)
       or (b.blocker_id = target and b.blocked_id = me)
  ) then
    return null;
  end if;

  select created_at, email_confirmed_at into u from auth.users where id = target;
  if not found then
    return null;
  end if;

  select display_name, bio, location, interests, avatar_path
    into p from public.profiles where id = target;

  select count(*) into friends_n from public.friend_requests fr
   where fr.status = 'accepted' and (fr.sender_id = target or fr.receiver_id = target);

  select count(*) into photos_n from public.profile_photos where user_id = target;
  select count(*) into sent_n   from public.messages where sender_id = target;
  select count(*) into rank_n   from auth.users where created_at < u.created_at;

  if not is_self then
    select count(*) into mutual_n from (
      select case when sender_id = target then receiver_id else sender_id end
        from public.friend_requests
       where status = 'accepted' and (sender_id = target or receiver_id = target)
      intersect
      select case when sender_id = me then receiver_id else sender_id end
        from public.friend_requests
       where status = 'accepted' and (sender_id = me or receiver_id = me)
    ) m;
  end if;

  if rank_n < 100 then badges := array_append(badges, 'founding'); end if;
  if coalesce(trim(p.display_name), '') <> ''
     and coalesce(trim(p.bio), '') <> ''
     and coalesce(trim(p.location), '') <> ''
     and coalesce(array_length(p.interests, 1), 0) >= 3
     and p.avatar_path is not null then
    badges := array_append(badges, 'complete');
  end if;
  if friends_n >= 1 then badges := array_append(badges, 'first_friend'); end if;
  if friends_n >= 5 then badges := array_append(badges, 'connector'); end if;
  if sent_n >= 10   then badges := array_append(badges, 'conversationalist'); end if;
  if photos_n >= 3  then badges := array_append(badges, 'gallery'); end if;

  return jsonb_build_object(
    'member_since',     u.created_at,
    'email_confirmed',  u.email_confirmed_at is not null,
    'photos',           photos_n,
    'mutual_friends',   mutual_n,
    'friends',          case when is_self then friends_n else null end,
    'badges',           to_jsonb(badges)
  );
end;
$$;

revoke all on function public.get_member_trust(uuid) from public, anon;
grant execute on function public.get_member_trust(uuid) to authenticated;
