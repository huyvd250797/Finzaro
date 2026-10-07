-- Finzaro V0.0.10 — read-only verification
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('deposits', 'deposit_interest_entries')
order by table_name;

select policyname, tablename, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('deposits', 'deposit_interest_entries')
order by tablename, policyname;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename in ('deposits', 'deposit_interest_entries')
order by indexname;
