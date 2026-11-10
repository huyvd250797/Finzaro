-- Finzaro V1.2.0: read-only release verification.
-- Do not run this as a migration; the statements below change no data.
select to_regclass('public.simple_transaction_ids_v120') as simple_marker_table;

-- Three allowed mutations should exist as SECURITY DEFINER functions,
-- executable by authenticated clients but not anonymous clients.
select p.proname as rpc_name,
       p.prosecdef as security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anonymous_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_simple_transaction_v120', 'update_simple_transaction_v120', 'delete_simple_transaction_v120')
order by p.proname;

-- Legacy mutation functions should no longer be callable by authenticated clients.
select p.proname as retired_rpc_name,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_financial_transaction_v071', 'update_financial_transaction_v012', 'delete_financial_transaction_v112', 'create_deposit_transfer_v112')
order by p.proname;

select relname, relrowsecurity as rls_enabled
from pg_class where oid = to_regclass('public.simple_transaction_ids_v120');

-- Compare these counts against your before-deploy snapshot. Historical
-- transactions and entries should be unchanged by running the migration.
select (select count(*) from public.accounts) as historical_accounts,
       (select count(*) from public.transactions) as historical_transactions,
       (select count(*) from public.transaction_entries) as historical_entries,
       (select count(*) from public.simple_transaction_ids_v120) as new_v120_transactions;

-- Account reconciliation is intentionally read-only; compare these per-account
-- values to an external backup, and avoid interpreting old savings balances as
-- new general-purpose cash/wallet balances.
select id, account_type, currency_code, opening_balance_minor, current_balance_minor, is_archived
from public.accounts order by user_id, id;
