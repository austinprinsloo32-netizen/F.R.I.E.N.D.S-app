-- ============================================================================
-- OPTIONAL hardening. Right now the browser decides when a status expires.
-- This makes the database set it, so nobody can create a status that never ends.
-- Safe to run more than once.
-- ============================================================================
create or replace function public.force_status_expiry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.expires_at := now() + interval '24 hours';
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists statuses_force_expiry on public.statuses;
create trigger statuses_force_expiry
  before insert or update on public.statuses
  for each row execute function public.force_status_expiry();
