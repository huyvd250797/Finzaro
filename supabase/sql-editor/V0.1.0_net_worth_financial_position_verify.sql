-- Finzaro V0.1.0 read-only verification
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'net_worth_snapshots'
order by ordinal_position;

select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'net_worth_snapshots'
order by policyname;

select trigger_name, event_manipulation, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in ('categories_sync_transaction_label_v0100', 'net_worth_snapshots_set_updated_at')
order by trigger_name;

select conname
from pg_constraint
where conrelid = 'public.categories'::regclass
  and conname in ('categories_icon_allowed', 'categories_icon_allowed_v0100')
order by conname;
-- Expected: only categories_icon_allowed_v0100 remains.
