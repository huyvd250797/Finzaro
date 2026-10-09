-- Finzaro V0.5.0 — read-only verification
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('financial_goal_plans','financial_goal_allocations')
order by table_name;

select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name = 'save_financial_goal_plan_v050';

select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('financial_goal_plans','financial_goal_allocations')
order by tablename;
