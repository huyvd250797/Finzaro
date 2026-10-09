-- Finzaro V0.7.1 — Mobile Money UX + debt funding income

alter table public.transactions drop constraint if exists transactions_purpose_allowed_v060;
alter table public.transactions drop constraint if exists transactions_purpose_allowed_v071;
alter table public.transactions add constraint transactions_purpose_allowed_v071 check (
  transaction_purpose in ('standard','credit_card_payment','loan_payment','credit_card_borrow','loan_borrow','transfer')
);

create table if not exists public.liability_funding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  funding_type text not null,
  credit_card_id uuid references public.credit_cards(id) on delete restrict,
  loan_id uuid references public.loans(id) on delete restrict,
  amount_minor bigint not null,
  created_at timestamptz not null default now(),
  constraint liability_funding_type_check check (funding_type in ('credit_card','loan')),
  constraint liability_funding_amount_check check (amount_minor > 0 and amount_minor <= 9007199254740991),
  constraint liability_funding_reference_check check (
    (funding_type='credit_card' and credit_card_id is not null and loan_id is null)
    or (funding_type='loan' and loan_id is not null and credit_card_id is null)
  )
);
create unique index if not exists liability_funding_transaction_uidx on public.liability_funding_events(transaction_id);
create index if not exists liability_funding_user_idx on public.liability_funding_events(user_id, created_at desc);

alter table public.liability_funding_events enable row level security;
drop policy if exists "users can read own liability funding" on public.liability_funding_events;
create policy "users can read own liability funding" on public.liability_funding_events for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.liability_funding_events from anon, authenticated;
grant select on table public.liability_funding_events to authenticated;

create or replace function public.create_financial_transaction_v071(
  p_transaction_type text,
  p_title text,
  p_category_id uuid default null,
  p_notes text default null,
  p_transaction_date date default current_date,
  p_from_account_id uuid default null,
  p_to_account_id uuid default null,
  p_from_amount_minor bigint default null,
  p_to_amount_minor bigint default null,
  p_transaction_purpose text default 'standard',
  p_credit_card_id uuid default null,
  p_loan_id uuid default null,
  p_loan_principal_minor bigint default null,
  p_loan_interest_minor bigint default null,
  p_loan_fee_minor bigint default null,
  p_new_loan_name text default null,
  p_new_loan_lender_name text default null,
  p_new_loan_annual_rate_percent numeric default null,
  p_new_loan_term_months integer default null,
  p_new_loan_first_payment_date date default null,
  p_new_loan_interest_method text default 'annuity',
  p_new_loan_payment_frequency text default 'monthly',
  p_new_loan_upfront_fee_minor bigint default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_type text := lower(btrim(coalesce(p_transaction_type,'')));
  v_purpose text := lower(btrim(coalesce(p_transaction_purpose,'standard')));
  v_title text := btrim(coalesce(p_title,''));
  v_notes text := nullif(btrim(coalesce(p_notes,'')), '');
  v_account public.accounts%rowtype;
  v_card public.credit_cards%rowtype;
  v_tx_id uuid;
  v_new_loan_id uuid;
  v_loan_name text;
  v_lender text;
  v_method text := lower(btrim(coalesce(p_new_loan_interest_method,'annuity')));
  v_frequency text := lower(btrim(coalesce(p_new_loan_payment_frequency,'monthly')));
  v_limit bigint := 9007199254740991;
begin
  if v_purpose not in ('credit_card_borrow','loan_borrow') or v_type <> 'income' then
    return public.create_financial_transaction_v060(
      p_transaction_type, p_title, p_category_id, p_notes, p_transaction_date,
      p_from_account_id, p_to_account_id, p_from_amount_minor, p_to_amount_minor,
      p_transaction_purpose, p_credit_card_id, p_loan_id, p_loan_principal_minor,
      p_loan_interest_minor, p_loan_fee_minor
    );
  end if;

  if v_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if char_length(v_title) < 1 or char_length(v_title) > 140 then raise exception 'Transaction title must be between 1 and 140 characters.' using errcode='22023'; end if;
  if v_notes is not null and char_length(v_notes) > 500 then raise exception 'Notes are too long.' using errcode='22023'; end if;
  if p_transaction_date is null then raise exception 'Transaction date is required.' using errcode='22023'; end if;
  if p_to_account_id is null or p_to_amount_minor is null or p_to_amount_minor <= 0 or p_to_amount_minor > v_limit then raise exception 'A valid destination account and positive amount are required.' using errcode='22023'; end if;

  select * into v_account from public.accounts where id=p_to_account_id and user_id=v_user_id for update;
  if not found then raise exception 'Destination account was not found.' using errcode='42501'; end if;
  if v_account.is_archived then raise exception 'Archived accounts cannot receive new transactions.' using errcode='22023'; end if;

  if v_purpose='credit_card_borrow' then
    if p_credit_card_id is null then raise exception 'Please choose a credit card funding source.' using errcode='22023'; end if;
    select * into v_card from public.credit_cards where id=p_credit_card_id and user_id=v_user_id for update;
    if not found then raise exception 'Credit card was not found.' using errcode='42501'; end if;
    if v_card.is_archived then raise exception 'Archived credit card cannot create new borrowing.' using errcode='22023'; end if;
    if v_card.currency_code <> v_account.currency_code then raise exception 'Credit card currency must match the receiving account.' using errcode='22023'; end if;
    if v_card.current_balance_minor + p_to_amount_minor > v_limit then raise exception 'Credit card balance would exceed the supported limit.' using errcode='22023'; end if;

    insert into public.transactions(user_id,transaction_type,transaction_purpose,title,category_id,category_label,notes,transaction_date)
    values(v_user_id,'income','credit_card_borrow',v_title,null,'Vay từ thẻ tín dụng',v_notes,p_transaction_date)
    returning id into v_tx_id;
    insert into public.transaction_entries(transaction_id,user_id,account_id,currency_code,amount_minor,entry_role)
    values(v_tx_id,v_user_id,p_to_account_id,v_account.currency_code,p_to_amount_minor,'income');
    update public.accounts set current_balance_minor=current_balance_minor+p_to_amount_minor,updated_at=now() where id=p_to_account_id and user_id=v_user_id;
    update public.credit_cards set current_balance_minor=current_balance_minor+p_to_amount_minor,updated_at=now() where id=p_credit_card_id and user_id=v_user_id;
    insert into public.liability_funding_events(user_id,transaction_id,funding_type,credit_card_id,amount_minor)
    values(v_user_id,v_tx_id,'credit_card',p_credit_card_id,p_to_amount_minor);
    return v_tx_id;
  end if;

  v_loan_name := btrim(coalesce(p_new_loan_name,''));
  v_lender := nullif(btrim(coalesce(p_new_loan_lender_name,'')), '');
  if char_length(v_loan_name) < 1 or char_length(v_loan_name) > 120 then raise exception 'Loan name must be between 1 and 120 characters.' using errcode='22023'; end if;
  if v_lender is not null and char_length(v_lender) > 120 then raise exception 'Loan lender name is too long.' using errcode='22023'; end if;
  if p_new_loan_annual_rate_percent is null or p_new_loan_annual_rate_percent < 0 or p_new_loan_annual_rate_percent > 100 then raise exception 'Loan annual rate must be between 0 and 100.' using errcode='22023'; end if;
  if p_new_loan_term_months is null or p_new_loan_term_months < 1 or p_new_loan_term_months > 600 then raise exception 'Loan term must be between 1 and 600 months.' using errcode='22023'; end if;
  if p_new_loan_first_payment_date is null or p_new_loan_first_payment_date < p_transaction_date then raise exception 'Loan first payment date must be on or after the funding date.' using errcode='22023'; end if;
  if v_method not in ('annuity','equal_principal','interest_only') then raise exception 'Invalid loan interest method.' using errcode='22023'; end if;
  if v_frequency not in ('monthly','biweekly','weekly') then raise exception 'Invalid loan payment frequency.' using errcode='22023'; end if;
  if coalesce(p_new_loan_upfront_fee_minor,0) < 0 or coalesce(p_new_loan_upfront_fee_minor,0) > v_limit then raise exception 'Loan upfront fee is invalid.' using errcode='22023'; end if;

  insert into public.loans(
    user_id,name,lender_name,currency_code,original_principal_minor,annual_rate_percent,term_months,
    start_date,first_payment_date,interest_method,payment_frequency,upfront_fee_minor,linked_account_id,
    icon_name,icon_color,notes
  ) values (
    v_user_id,v_loan_name,v_lender,v_account.currency_code,p_to_amount_minor,p_new_loan_annual_rate_percent,p_new_loan_term_months,
    p_transaction_date,p_new_loan_first_payment_date,v_method,v_frequency,coalesce(p_new_loan_upfront_fee_minor,0),p_to_account_id,
    'Landmark','#2563eb',coalesce(v_notes,'Tạo tự động từ giao dịch giải ngân khoản vay')
  ) returning id into v_new_loan_id;

  insert into public.transactions(user_id,transaction_type,transaction_purpose,title,category_id,category_label,notes,transaction_date)
  values(v_user_id,'income','loan_borrow',v_title,null,'Giải ngân khoản vay',v_notes,p_transaction_date)
  returning id into v_tx_id;
  insert into public.transaction_entries(transaction_id,user_id,account_id,currency_code,amount_minor,entry_role)
  values(v_tx_id,v_user_id,p_to_account_id,v_account.currency_code,p_to_amount_minor,'income');
  update public.accounts set current_balance_minor=current_balance_minor+p_to_amount_minor,updated_at=now() where id=p_to_account_id and user_id=v_user_id;
  insert into public.liability_funding_events(user_id,transaction_id,funding_type,loan_id,amount_minor)
  values(v_user_id,v_tx_id,'loan',v_new_loan_id,p_to_amount_minor);
  return v_tx_id;
end;
$$;

create or replace function public.delete_financial_transaction_v071(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.liability_funding_events%rowtype;
  v_entry record;
  v_card_balance bigint;
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  select * into v_event from public.liability_funding_events where transaction_id=p_transaction_id and user_id=v_user_id for update;
  if not found then return public.delete_financial_transaction_v060(p_transaction_id); end if;

  if v_event.funding_type='credit_card' then
    select current_balance_minor into v_card_balance from public.credit_cards where id=v_event.credit_card_id and user_id=v_user_id for update;
    if not found then raise exception 'Credit card was not found.' using errcode='42501'; end if;
    if v_card_balance < v_event.amount_minor then raise exception 'Cannot delete this credit-card funding after repayments reduced the balance below the funded amount.' using errcode='23503'; end if;
    update public.credit_cards set current_balance_minor=current_balance_minor-v_event.amount_minor,updated_at=now() where id=v_event.credit_card_id and user_id=v_user_id;
  else
    if exists(select 1 from public.loan_payments where loan_id=v_event.loan_id and user_id=v_user_id) then
      raise exception 'Cannot delete a funded loan transaction after loan payments exist. Remove the loan payments first.' using errcode='23503';
    end if;
  end if;

  perform 1 from public.accounts where id in (select account_id from public.transaction_entries where transaction_id=p_transaction_id and user_id=v_user_id) order by id for update;
  for v_entry in select account_id,amount_minor from public.transaction_entries where transaction_id=p_transaction_id and user_id=v_user_id loop
    update public.accounts set current_balance_minor=current_balance_minor-v_entry.amount_minor,updated_at=now() where id=v_entry.account_id and user_id=v_user_id;
  end loop;

  delete from public.liability_funding_events where id=v_event.id and user_id=v_user_id;
  if v_event.funding_type='loan' then delete from public.loans where id=v_event.loan_id and user_id=v_user_id; end if;
  delete from public.transactions where id=p_transaction_id and user_id=v_user_id;
  return true;
end;
$$;

revoke execute on function public.create_financial_transaction_v071(text,text,uuid,text,date,uuid,uuid,bigint,bigint,text,uuid,uuid,bigint,bigint,bigint,text,text,numeric,integer,date,text,text,bigint) from public, anon;
revoke execute on function public.delete_financial_transaction_v071(uuid) from public, anon;
grant execute on function public.create_financial_transaction_v071(text,text,uuid,text,date,uuid,uuid,bigint,bigint,text,uuid,uuid,bigint,bigint,bigint,text,text,numeric,integer,date,text,text,bigint) to authenticated;
grant execute on function public.delete_financial_transaction_v071(uuid) to authenticated;

comment on table public.liability_funding_events is 'V0.7.1 links income transactions funded by credit cards or newly-created loans for safe rollback.';
comment on column public.transactions.transaction_purpose is 'standard, debt payment, debt funding/borrowing, or transfer semantic purpose.';
