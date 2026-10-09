-- Finzaro V0.7.1 verification
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.transactions'::regclass and conname='transactions_purpose_allowed_v071';
select to_regclass('public.liability_funding_events') as liability_funding_events;
select proname from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname in ('create_financial_transaction_v071','delete_financial_transaction_v071') order by proname;
