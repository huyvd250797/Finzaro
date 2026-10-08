begin;
select plan(5);
select has_table('public', 'forecast_scenarios', 'forecast_scenarios exists');
select has_column('public', 'forecast_scenarios', 'horizon_days', 'scenario stores horizon');
select has_column('public', 'forecast_scenarios', 'extra_debt_payment_minor', 'scenario stores extra debt payment');
select ok((select relrowsecurity from pg_class where oid = 'public.forecast_scenarios'::regclass), 'RLS enabled');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.forecast_scenarios'::regclass and conname = 'forecast_scenarios_horizon_check'), 'horizon constraint exists');
select * from finish();
rollback;
