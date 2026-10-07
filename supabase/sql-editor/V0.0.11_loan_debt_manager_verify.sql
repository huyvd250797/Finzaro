-- Finzaro V0.0.11 read-only verification
select table_name
from information_schema.tables
where table_schema = 'public' and table_name in ('loans', 'loan_payments')
order by table_name;

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and ((table_name in ('categories','savings_goals','deposits') and column_name = 'icon_color')
       or table_name in ('loans','loan_payments'))
order by table_name, ordinal_position;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('loans','loan_payments')
order by tablename, policyname;
