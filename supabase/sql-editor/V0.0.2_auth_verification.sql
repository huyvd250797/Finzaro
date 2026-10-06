-- Finzaro V0.0.2 — optional SQL Editor verification only.
-- This script does NOT change schema or data.

select
  to_regclass('public.profiles') as profiles_table,
  to_regclass('public.user_preferences') as preferences_table,
  to_regclass('public.supported_currencies') as currencies_table;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'user_preferences', 'supported_currencies')
order by tablename, policyname;

select
  tgname as trigger_name,
  tgrelid::regclass as trigger_table
from pg_trigger
where tgname = 'on_auth_user_created'
  and not tgisinternal;
