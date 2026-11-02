-- ============================================================================
-- READ-ONLY. Changes nothing. Run each query and paste the results to Claude
-- so your access rules (row-level security) can be reviewed.
-- ============================================================================

-- Query 1: which tables have row-level security switched on
select tablename, rowsecurity as rls_on
from pg_tables
where schemaname = 'public'
order by tablename;

-- Query 2: every access rule on your tables
select tablename, policyname, cmd, roles, qual as using_rule, with_check as check_rule
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Query 3: rules on file storage (photos)
select policyname, cmd, qual as using_rule, with_check as check_rule
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- Query 4: your database functions (block_user etc.)
select p.proname as name, p.prosecdef as security_definer,
       pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
