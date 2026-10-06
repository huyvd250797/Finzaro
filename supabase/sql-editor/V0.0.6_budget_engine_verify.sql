-- Finzaro V0.0.6 — Budget Engine verification (read-only)
-- Safe to run after V0.0.6_budget_engine.sql.

select
  to_regclass('public.budgets') as budgets_table,
  (select relrowsecurity from pg_class where oid = 'public.budgets'::regclass) as rls_enabled;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'budgets'
order by ordinal_position;

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'budgets'
order by policyname;

select trigger_name, event_manipulation
from information_schema.triggers
where event_object_schema = 'public' and event_object_table = 'budgets'
order by trigger_name;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'budgets'
order by grantee, privilege_type;

select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in ('budgets_validate_v006', 'categories_validate_budget_hierarchy_v006')
order by trigger_name;
