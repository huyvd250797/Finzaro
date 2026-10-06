-- Finzaro V0.0.4 — Transaction Core verification (read-only)

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('accounts', 'transactions', 'transaction_entries')
order by table_name;

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('transactions', 'transaction_entries')
order by table_name, ordinal_position;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('transactions', 'transaction_entries')
order by tablename, policyname;

select routine_name, data_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('create_financial_transaction_v004', 'delete_financial_transaction_v004')
order by routine_name;
