-- Finzaro V0.0.3 — Account Core verification only (no writes)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'accounts'
order by ordinal_position;

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'accounts'
order by policyname;
