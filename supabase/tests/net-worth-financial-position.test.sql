begin;
select plan(6);

select has_table('public', 'net_worth_snapshots', 'net_worth_snapshots exists');
select has_column('public', 'net_worth_snapshots', 'net_worth_minor', 'snapshot stores net worth');
select has_column('public', 'net_worth_snapshots', 'total_assets_minor', 'snapshot stores assets');
select has_column('public', 'net_worth_snapshots', 'total_liabilities_minor', 'snapshot stores liabilities');
select ok((select relrowsecurity from pg_class where oid = 'public.net_worth_snapshots'::regclass), 'RLS enabled');
select ok(not exists(select 1 from pg_constraint where conrelid = 'public.categories'::regclass and conname = 'categories_icon_allowed'), 'legacy fixed category icon allowlist removed');

select * from finish();
rollback;
