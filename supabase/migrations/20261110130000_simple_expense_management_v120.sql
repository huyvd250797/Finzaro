-- Finzaro V1.2.0: expose only plain income/expense/transfer write operations.
-- Additive & non-destructive: preserve every historical ledger row and all obsolete module tables.
-- Run AFTER all previous production migrations, particularly V1.1.2.

create table if not exists public.simple_transaction_ids_v120 (
  transaction_id uuid primary key references public.transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists simple_transaction_ids_v120_user_idx on public.simple_transaction_ids_v120(user_id);
alter table public.simple_transaction_ids_v120 enable row level security;
drop policy if exists "simple transaction owner can read" on public.simple_transaction_ids_v120;
create policy "simple transaction owner can read" on public.simple_transaction_ids_v120
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.simple_transaction_ids_v120 from public, anon, authenticated;
grant select on public.simple_transaction_ids_v120 to authenticated;

create or replace function public.create_simple_transaction_v120(
 p_transaction_type text, p_title text, p_category_id uuid, p_notes text,
 p_transaction_date date, p_from_account_id uuid, p_to_account_id uuid,
 p_from_amount_minor bigint, p_to_amount_minor bigint
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 v_uid uuid := auth.uid();
 v_tx_id uuid;
 v_type text := lower(btrim(coalesce(p_transaction_type,'')));
 v_count integer;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if v_type not in ('income','expense','transfer') then raise exception 'Only normal Income/Expense/Transfer is supported' using errcode='22023'; end if;
 if v_type='transfer' and p_category_id is not null then raise exception 'Transfer has no category' using errcode='22023'; end if;
 if v_type<>'transfer' and p_category_id is null then raise exception 'Category is required' using errcode='22023'; end if;
 if v_type='income' and (p_to_account_id is null or p_from_account_id is not null) then raise exception 'Invalid income account selection' using errcode='22023'; end if;
 if v_type='expense' and (p_from_account_id is null or p_to_account_id is not null) then raise exception 'Invalid expense account selection' using errcode='22023'; end if;
 if v_type='transfer' and (p_from_account_id is null or p_to_account_id is null or p_from_account_id=p_to_account_id) then raise exception 'Invalid transfer accounts' using errcode='22023'; end if;
 select count(*) into v_count from public.accounts
 where user_id=v_uid and is_archived=false and account_type in ('cash','bank','ewallet')
 and id in (select a from (values(p_from_account_id),(p_to_account_id)) as selected(a) where a is not null);
 if v_count <> (case when v_type='transfer' then 2 else 1 end) then
   raise exception 'Only active cash/bank/e-wallet accounts are supported' using errcode='22023';
 end if;
 if v_type='transfer' and (select currency_code from public.accounts where id=p_from_account_id) =
 (select currency_code from public.accounts where id=p_to_account_id) and p_from_amount_minor is distinct from p_to_amount_minor then
   raise exception 'Transfer within the same currency must have equal amounts' using errcode='22023';
 end if;
 -- Legacy atomic ledger function: always fixed purpose, all lending parameters omitted.
 v_tx_id := public.create_financial_transaction_v071(
    p_transaction_type => v_type, p_title => p_title, p_category_id => p_category_id,
    p_notes => p_notes, p_transaction_date => p_transaction_date,
    p_from_account_id => p_from_account_id, p_to_account_id => p_to_account_id,
    p_from_amount_minor => p_from_amount_minor, p_to_amount_minor => p_to_amount_minor,
    p_transaction_purpose => case when v_type='transfer' then 'transfer' else 'standard' end
 );
 insert into public.simple_transaction_ids_v120(transaction_id,user_id) values(v_tx_id,v_uid);
 return v_tx_id;
end; $$;

create or replace function public.delete_simple_transaction_v120(p_transaction_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
 v_uid uuid := auth.uid();
 v_type text;
 v_purpose text;
 v_created_in_simple boolean;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select transaction_type, transaction_purpose into v_type, v_purpose
 from public.transactions where id=p_transaction_id and user_id=v_uid for update;
 if not found then raise exception 'Transaction not found' using errcode='42501'; end if;
 select exists(select 1 from public.simple_transaction_ids_v120 where transaction_id=p_transaction_id and user_id=v_uid)
 into v_created_in_simple;
 -- Allow historical ordinary income/expense; legacy transfers can have linked goals/deposit funding.
 if not v_created_in_simple and not (v_type in ('income','expense') and v_purpose='standard') then
   raise exception 'Historical specialized transaction is read-only in Simple Expense Management' using errcode='23503';
 end if;
 return public.delete_financial_transaction_v112(p_transaction_id);
end; $$;

-- Guard edits at the DB edge as well: old specialized ledger rows and legacy
-- savings accounts must not be rewritten into new ordinary transactions.
create or replace function public.update_simple_transaction_v120(
 p_transaction_id uuid, p_title text, p_category_id uuid, p_notes text,
 p_transaction_date date, p_account_id uuid, p_amount_minor bigint
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
 v_uid uuid := auth.uid();
 v_type text;
 v_purpose text;
 v_bad_old_entries integer;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select transaction_type, transaction_purpose into v_type, v_purpose
 from public.transactions where id=p_transaction_id and user_id=v_uid for update;
 if not found or v_type not in ('income', 'expense') or coalesce(v_purpose,'') <> 'standard' then
   raise exception 'Only historical ordinary Income/Expense may be edited' using errcode='22023';
 end if;
 if not exists (select 1 from public.accounts where id=p_account_id and user_id=v_uid
   and is_archived=false and account_type in ('cash','bank','ewallet')) then
   raise exception 'Only active cash/bank/e-wallet accounts are editable' using errcode='22023';
 end if;
 select count(*) into v_bad_old_entries from public.transaction_entries e
 join public.accounts a on a.id=e.account_id
 where e.user_id=v_uid and e.transaction_id=p_transaction_id
 and (a.account_type not in ('cash','bank','ewallet') or a.user_id<>v_uid);
 if v_bad_old_entries<>0 then
   raise exception 'Historical transactions using removed account types are read-only' using errcode='23503';
 end if;
 return public.update_financial_transaction_v012(
   p_transaction_id,p_title,p_category_id,p_notes,p_transaction_date,p_account_id,p_amount_minor);
end; $$;

revoke execute on function public.create_simple_transaction_v120(text,text,uuid,text,date,uuid,uuid,bigint,bigint) from public, anon;
revoke execute on function public.delete_simple_transaction_v120(uuid) from public, anon;
revoke execute on function public.update_simple_transaction_v120(uuid,text,uuid,text,date,uuid,bigint) from public, anon;
grant execute on function public.create_simple_transaction_v120(text,text,uuid,text,date,uuid,uuid,bigint,bigint) to authenticated;
grant execute on function public.delete_simple_transaction_v120(uuid) to authenticated;
grant execute on function public.update_simple_transaction_v120(uuid,text,uuid,text,date,uuid,bigint) to authenticated;

-- Disable direct use of old transaction-creation paths by authenticated clients.
-- The SECURITY DEFINER wrapper still calls legacy ledger logic internally as its owner.
do $$ declare f record; begin
 for f in select n.nspname as namespace, p.proname as function_name,
                   pg_get_function_identity_arguments(p.oid) as args
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (
   'create_financial_transaction_v004', 'create_financial_transaction_v005',
   'create_financial_transaction_v060', 'create_financial_transaction_v071',
   'update_financial_transaction_v012',
   'delete_financial_transaction_v004', 'delete_financial_transaction_v005',
   'delete_financial_transaction_v060', 'delete_financial_transaction_v071',
   'delete_financial_transaction_v112',
   'create_transfer_with_goal_v110','create_deposit_transfer_v112',
   'post_recurring_occurrence_v007','undo_recurring_occurrence_v007',
   'record_asset_valuation_v060','record_asset_valuation_v070',
   'apply_credit_card_payment_v0012','save_financial_goal_plan_v050'
 ) loop
   execute format('revoke execute on function %I.%I(%s) from public, anon, authenticated', f.namespace, f.function_name, f.args);
 end loop;
end $$;
