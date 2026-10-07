-- Finzaro V0.0.12 verification (read-only)
select table_name from information_schema.tables where table_schema='public' and table_name in ('credit_cards','credit_card_statements','credit_card_payments') order by table_name;
select routine_name from information_schema.routines where routine_schema='public' and routine_name='update_financial_transaction_v012';
select tablename, policyname from pg_policies where schemaname='public' and tablename in ('credit_cards','credit_card_statements','credit_card_payments') order by tablename, policyname;
