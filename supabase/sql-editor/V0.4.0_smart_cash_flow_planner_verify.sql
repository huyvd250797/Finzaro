-- Finzaro V0.4.0 — read-only verification
select c.relname as table_name, c.relrowsecurity as row_security
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'cash_flow_plans';

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'cash_flow_plans'
order by policyname;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'cash_flow_plans'
order by ordinal_position;
