-- Finzaro V3.2.0 Batch Copy Migration - FIXED (2026-11-11).
-- Copy ALL lines to Supabase SQL Editor (including the closing end; $$;).
-- Safe to rerun if the prior attempt stopped before creating the function.
-- Atomic, authenticated and idempotent transaction copying.
-- Run AFTER 20261110130000_simple_expense_management_v120.sql.
-- Additive migration: existing transactions and balances are never rewritten.

create table if not exists public.simple_transaction_copy_receipts_v320 (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_transaction_id uuid not null references public.transactions(id) on delete cascade,
  destination_date date not null,
  target_transaction_id uuid not null references public.transactions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, source_transaction_id, destination_date)
);
create index if not exists simple_transaction_copy_receipts_v320_target_idx
  on public.simple_transaction_copy_receipts_v320(target_transaction_id);
alter table public.simple_transaction_copy_receipts_v320 enable row level security;
revoke all on public.simple_transaction_copy_receipts_v320 from public, anon, authenticated;

-- Each invocation is one DB transaction: if a later date fails, every earlier
-- created transaction, balance delta and receipt rolls back together.
create or replace function public.copy_simple_transaction_batch_v320(
  p_source_id uuid, p_destination_dates date[]
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_source public.transactions%rowtype;
  v_date date;
  v_target uuid;
  v_from_account uuid;
  v_to_account uuid;
  v_from_amount bigint;
  v_to_amount bigint;
  v_entries integer;
  v_expected_entries integer := 1;
  v_results jsonb := '[]'::jsonb;
  v_reused boolean;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_source_id is null then raise exception 'Missing source transaction' using errcode = '22023'; end if;
  if p_destination_dates is null or coalesce(array_length(p_destination_dates, 1), 0) not between 1 and 20 then
    raise exception 'Choose 1 to 20 dates' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_destination_dates) as d(date_value) where d.date_value is null) then
    raise exception 'Destination date must not be null' using errcode = '22023';
  end if;

  -- Serialize requests for the same user's source. Together with the unique
  -- receipt key this makes retries and concurrent double clicks idempotent.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text || ':' || p_source_id::text, 0));
  select * into v_source from public.transactions
  where id = p_source_id and user_id = v_uid for share;
  if not found then raise exception 'Transaction not found' using errcode = '42501'; end if;
  if v_source.transaction_type not in ('income', 'expense', 'transfer') or
     v_source.transaction_purpose is distinct from (case when v_source.transaction_type = 'transfer' then 'transfer' else 'standard' end) then
    raise exception 'Historical specialized transaction cannot be copied' using errcode = '22023';
  end if;
  if v_source.transaction_type = 'transfer' and not exists (
      select 1 from public.simple_transaction_ids_v120
      where transaction_id = p_source_id and user_id = v_uid
  ) then raise exception 'Only simple transfers can be copied' using errcode = '22023'; end if;
  if v_source.title is null or pg_catalog.length(v_source.title) not between 1 and 140 or
     pg_catalog.length(coalesce(v_source.notes, '')) > 500 then
    raise exception 'Source transaction data is invalid' using errcode = '22023';
  end if;

  select count(*) into v_entries from public.transaction_entries
  where transaction_id = p_source_id and user_id = v_uid;
  -- Avoid CASE/THEN ambiguity in PL/pgSQL IF parser.
  if v_source.transaction_type = 'transfer' then
    v_expected_entries := 2;
  end if;
  if v_entries <> v_expected_entries then
    raise exception 'Source ledger is incomplete' using errcode = '22023';
  end if;
  if v_source.transaction_type in ('expense','transfer') then
    select account_id, abs(amount_minor) into v_from_account, v_from_amount
    from public.transaction_entries
    where user_id = v_uid and transaction_id = p_source_id
      and entry_role = case when v_source.transaction_type = 'expense' then 'expense' else 'transfer_out' end;
    if not found then raise exception 'Missing source debit entry' using errcode = '22023'; end if;
  end if;
  if v_source.transaction_type in ('income','transfer') then
    select account_id, abs(amount_minor) into v_to_account, v_to_amount
    from public.transaction_entries
    where user_id = v_uid and transaction_id = p_source_id
      and entry_role = case when v_source.transaction_type = 'income' then 'income' else 'transfer_in' end;
    if not found then raise exception 'Missing source credit entry' using errcode = '22023'; end if;
  end if;

  -- Deduplicate the incoming array before any write. Order is stable.
  for v_date in
    select distinct input_date.destination_date
    from unnest(p_destination_dates) as input_date(destination_date)
    order by input_date.destination_date
  loop
    select target_transaction_id into v_target
    from public.simple_transaction_copy_receipts_v320
    where user_id = v_uid and source_transaction_id = p_source_id and destination_date = v_date;
    v_reused := found;
    if not v_reused then
      -- Delegate all balance/category/account checks and ledger mutations to the
      -- existing audited atomic transaction RPC, inside this same transaction.
      v_target := public.create_simple_transaction_v120(
        v_source.transaction_type, v_source.title,
        case when v_source.transaction_type = 'transfer' then null else v_source.category_id end,
        v_source.notes, v_date, v_from_account, v_to_account, v_from_amount, v_to_amount
      );
      insert into public.simple_transaction_copy_receipts_v320
        (user_id, source_transaction_id, destination_date, target_transaction_id)
      values (v_uid, p_source_id, v_date, v_target);
    end if;
    v_results := v_results || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'date', v_date::text, 'transaction_id', v_target::text, 'reused', v_reused
    ));
  end loop;
  return v_results;
end; $$;
revoke execute on function public.copy_simple_transaction_batch_v320(uuid, date[]) from public, anon;
grant execute on function public.copy_simple_transaction_batch_v320(uuid, date[]) to authenticated;

-- Verification: returns copy_simple_transaction_batch_v320(uuid,date[]) when installed.
select pg_catalog.to_regprocedure('public.copy_simple_transaction_batch_v320(uuid,date[])') as installed_function;
-- END OF MIGRATION V3.2.0
