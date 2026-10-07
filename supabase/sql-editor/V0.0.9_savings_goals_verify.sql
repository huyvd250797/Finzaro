-- Finzaro V0.0.9 — Savings Goals verification (read-only)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('savings_goals', 'savings_goal_entries')
order by table_name;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('savings_goals', 'savings_goal_entries')
order by tablename;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('savings_goals', 'savings_goal_entries')
order by indexname;
