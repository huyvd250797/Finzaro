-- Finzaro V0.7.5 — Release Stabilization verification
select
  to_regclass('public.loan_payments_user_date_idx') is not null as loan_payments_index_ok,
  to_regclass('public.credit_card_payments_user_date_idx') is not null as credit_card_payments_index_ok,
  to_regclass('public.asset_valuations_user_date_idx') is not null as asset_valuations_index_ok,
  to_regprocedure('public.create_financial_transaction_v071(text,text,uuid,text,date,uuid,uuid,bigint,bigint,text,uuid,uuid,bigint,bigint,bigint,text,text,numeric,integer,date,text,text,bigint)') is not null as transaction_create_rpc_ok,
  to_regprocedure('public.delete_financial_transaction_v071(uuid)') is not null as transaction_delete_rpc_ok;
