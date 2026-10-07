begin;
select plan(5);
select has_table('public', 'financial_health_snapshots', 'financial_health_snapshots exists');
select has_column('public', 'financial_health_snapshots', 'overall_score', 'health snapshot stores overall score');
select has_column('public', 'financial_health_snapshots', 'metrics', 'health snapshot stores metrics json');
select ok((select relrowsecurity from pg_class where oid = 'public.financial_health_snapshots'::regclass), 'RLS enabled');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.financial_health_snapshots'::regclass and conname = 'financial_health_snapshots_unique'), 'daily currency uniqueness exists');
select * from finish();
rollback;
