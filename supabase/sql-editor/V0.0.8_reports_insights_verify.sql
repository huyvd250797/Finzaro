-- Finzaro V0.0.8 — Reports & Financial Insights
-- READ ONLY verification. V0.0.8 does not require a schema migration.

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'accounts', 'transactions', 'transaction_entries', 'categories',
    'budgets', 'recurring_rules', 'recurring_occurrences', 'user_preferences'
  )
order by table_name;

select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and tablename in ('transactions', 'transaction_entries', 'budgets', 'recurring_rules', 'recurring_occurrences')
order by tablename, indexname;
