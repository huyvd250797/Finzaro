-- Finzaro V0.2.0 verification (read-only)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'financial_health_snapshots';

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'financial_health_snapshots'
order by ordinal_position;

select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename = 'financial_health_snapshots'
order by policyname;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'financial_health_snapshots'
order by indexname;
