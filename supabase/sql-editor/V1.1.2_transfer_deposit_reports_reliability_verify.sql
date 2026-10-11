-- Finzaro V1.1.2 read-only verification
select to_regclass('public.deposit_funding_events') as deposit_funding_events_table;
select to_regprocedure('public.create_deposit_transfer_v112(text,text,date,uuid,uuid,bigint,uuid)') as create_deposit_transfer_rpc;
select to_regprocedure('public.delete_financial_transaction_v112(uuid)') as delete_transaction_rpc;
select to_regprocedure('public.report_flow_rows_v112(date,date)') as report_flow_rows_rpc;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.transactions'::regclass
  and conname = 'transactions_purpose_allowed_v112';

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'deposit_funding_events'
order by indexname;
