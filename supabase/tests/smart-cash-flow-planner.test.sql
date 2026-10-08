begin;
select plan(4);

select has_table('public', 'cash_flow_plans', 'cash_flow_plans exists');
select col_is_pk('public', 'cash_flow_plans', 'id', 'cash_flow_plans.id is primary key');
select ok((select relrowsecurity from pg_class where oid = 'public.cash_flow_plans'::regclass), 'cash_flow_plans has RLS enabled');
select col_has_check('public', 'cash_flow_plans', 'month_start', 'cash_flow_plans validates month_start');

select * from finish();
rollback;
