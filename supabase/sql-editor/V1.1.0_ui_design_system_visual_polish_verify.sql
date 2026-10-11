-- Finzaro V1.1.0 — read-only verification
select
  to_regprocedure('public.create_transfer_with_goal_v110(text,text,date,uuid,uuid,bigint,bigint,uuid)') is not null as transfer_goal_rpc_ok,
  to_regprocedure('public.create_financial_transaction_v071(text,text,uuid,text,date,uuid,uuid,bigint,bigint,text,uuid,uuid,bigint,bigint,bigint,text,text,numeric,integer,date,text,text,bigint)') is not null as transaction_rpc_v071_ok,
  to_regprocedure('public.delete_financial_transaction_v071(uuid)') is not null as delete_rpc_v071_ok;

select
  count(*) filter (where indexname = 'transactions_user_date_idx') = 1 as report_date_index_ok,
  count(*) filter (where indexname = 'savings_goal_entries_transaction_goal_unique_idx') = 1 as goal_transaction_index_ok
from pg_indexes
where schemaname = 'public';
