-- Finzaro V0.6.0 verification (read-only)
select to_regclass('public.investment_assets') as investment_assets,
       to_regclass('public.asset_valuations') as asset_valuations;

select column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name='transactions'
  and column_name='transaction_purpose';

select column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name='net_worth_snapshots'
  and column_name='investment_assets_minor';

select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in ('create_financial_transaction_v060','delete_financial_transaction_v060','sync_linked_goal_transfer_v060')
order by routine_name;

select policyname, tablename
from pg_policies
where schemaname='public'
  and tablename in ('investment_assets','asset_valuations')
order by tablename, policyname;

select transaction_purpose, count(*) as transaction_count
from public.transactions
group by transaction_purpose
order by transaction_purpose;

-- Expected: zero rows. Only Savings accounts should be used for newly linked goals.
select g.id as goal_id, g.name as goal_name, a.name as linked_account, a.account_type
from public.savings_goals g
join public.accounts a on a.id = g.linked_account_id and a.user_id = g.user_id
where g.is_archived = false and a.account_type <> 'savings';
