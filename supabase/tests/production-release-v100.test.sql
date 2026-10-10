-- Finzaro V1.0.0 Production Release schema smoke assertions.
begin;
select plan(8);

select has_table('public', 'transactions', 'production transaction ledger exists');
select has_table('public', 'transaction_entries', 'production transaction entries exist');
select ok((select relrowsecurity from pg_class where oid = 'public.transactions'::regclass), 'transactions RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.transaction_entries'::regclass), 'transaction entries RLS is enabled');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'create_financial_transaction_v071'), 'V0.7.1 atomic create transaction RPC exists');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'delete_financial_transaction_v071'), 'V0.7.1 rollback-aware delete transaction RPC exists');
select ok(to_regclass('public.transactions_user_category_date_idx') is not null, 'transaction category/date index exists');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.categories'::regclass and conname = 'categories_icon_allowed_v080'), 'expanded category icon constraint exists');

select * from finish();
rollback;
