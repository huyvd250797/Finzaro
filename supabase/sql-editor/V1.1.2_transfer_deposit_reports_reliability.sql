-- Finzaro V1.1.2 — Deposit Transfer & Reports Reliability Fix
-- 1) Transfer directly from an Account into a Deposit asset atomically.
-- 2) Optionally advance an existing Savings Goal in the same DB transaction.
-- 3) Provide a flattened, date-bounded report RPC to avoid fragile embedded PostgREST hydration.

alter table public.transactions drop constraint if exists transactions_purpose_allowed_v071;
alter table public.transactions drop constraint if exists transactions_purpose_allowed_v112;
alter table public.transactions add constraint transactions_purpose_allowed_v112 check (
  transaction_purpose in (
    'standard','credit_card_payment','loan_payment','credit_card_borrow','loan_borrow','transfer','deposit_funding'
  )
);

create table if not exists public.deposit_funding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  deposit_id uuid not null references public.deposits(id) on delete restrict,
  amount_minor bigint not null,
  savings_goal_id uuid references public.savings_goals(id) on delete set null,
  savings_goal_entry_id uuid references public.savings_goal_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint deposit_funding_amount_check check (amount_minor > 0 and amount_minor <= 9007199254740991)
);

create unique index if not exists deposit_funding_transaction_uidx
  on public.deposit_funding_events(transaction_id);
create index if not exists deposit_funding_user_deposit_idx
  on public.deposit_funding_events(user_id, deposit_id, created_at desc);

alter table public.deposit_funding_events enable row level security;
drop policy if exists "users can read own deposit funding" on public.deposit_funding_events;
create policy "users can read own deposit funding"
on public.deposit_funding_events for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.deposit_funding_events from anon, authenticated;
grant select on table public.deposit_funding_events to authenticated;

create or replace function public.create_deposit_transfer_v112(
  p_title text,
  p_notes text default null,
  p_transaction_date date default current_date,
  p_from_account_id uuid default null,
  p_deposit_id uuid default null,
  p_amount_minor bigint default null,
  p_savings_goal_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.accounts%rowtype;
  v_deposit public.deposits%rowtype;
  v_goal public.savings_goals%rowtype;
  v_tx_id uuid;
  v_goal_entry_id uuid;
  v_title text := btrim(coalesce(p_title,''));
  v_notes text := nullif(btrim(coalesce(p_notes,'')), '');
  v_limit bigint := 9007199254740991;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 140 then
    raise exception 'Transaction title must be between 1 and 140 characters.' using errcode = '22023';
  end if;
  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'Notes are too long.' using errcode = '22023';
  end if;
  if p_transaction_date is null then
    raise exception 'Transaction date is required.' using errcode = '22023';
  end if;
  if p_from_account_id is null or p_deposit_id is null or p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > v_limit then
    raise exception 'Deposit transfer requires a source account, deposit and positive amount.' using errcode = '22023';
  end if;

  select * into v_source
  from public.accounts
  where id = p_from_account_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Source account was not found.' using errcode = '42501';
  end if;
  if v_source.is_archived then
    raise exception 'Archived accounts cannot create new transfers.' using errcode = '22023';
  end if;

  select * into v_deposit
  from public.deposits
  where id = p_deposit_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Deposit was not found.' using errcode = '42501';
  end if;
  if v_deposit.is_archived then
    raise exception 'Archived deposits cannot receive new transfers.' using errcode = '22023';
  end if;
  if v_source.currency_code <> v_deposit.currency_code then
    raise exception 'Source account currency must match the deposit currency.' using errcode = '22023';
  end if;
  if v_deposit.principal_minor + p_amount_minor > v_limit then
    raise exception 'Deposit principal would exceed the supported limit.' using errcode = '22023';
  end if;

  if p_savings_goal_id is not null then
    select * into v_goal
    from public.savings_goals
    where id = p_savings_goal_id and user_id = v_user_id;
    if not found then
      raise exception 'Savings goal was not found.' using errcode = '42501';
    end if;
    if v_goal.is_archived then
      raise exception 'Archived savings goal cannot receive new entries.' using errcode = '22023';
    end if;
    if v_goal.currency_code <> v_deposit.currency_code then
      raise exception 'Savings goal currency must match the deposit currency.' using errcode = '22023';
    end if;
  end if;

  insert into public.transactions(
    user_id, transaction_type, transaction_purpose, title, category_id, category_label, notes, transaction_date
  ) values (
    v_user_id, 'transfer', 'deposit_funding', v_title, null, 'Chuyển vào tiền gửi', v_notes, p_transaction_date
  ) returning id into v_tx_id;

  insert into public.transaction_entries(
    transaction_id, user_id, account_id, currency_code, amount_minor, entry_role
  ) values (
    v_tx_id, v_user_id, p_from_account_id, v_source.currency_code, -p_amount_minor, 'transfer_out'
  );

  update public.accounts
  set current_balance_minor = current_balance_minor - p_amount_minor,
      updated_at = now()
  where id = p_from_account_id and user_id = v_user_id;

  update public.deposits
  set principal_minor = principal_minor + p_amount_minor,
      updated_at = now()
  where id = p_deposit_id and user_id = v_user_id;

  if p_savings_goal_id is not null then
    insert into public.savings_goal_entries(
      user_id, goal_id, entry_type, amount_minor, entry_date, transaction_id, notes
    ) values (
      v_user_id, p_savings_goal_id, 'contribution', p_amount_minor, p_transaction_date, null,
      'Thêm vào mục tiêu từ chuyển tiền vào Tiền gửi V1.1.2'
    ) returning id into v_goal_entry_id;
  end if;

  insert into public.deposit_funding_events(
    user_id, transaction_id, deposit_id, amount_minor, savings_goal_id, savings_goal_entry_id
  ) values (
    v_user_id, v_tx_id, p_deposit_id, p_amount_minor, p_savings_goal_id, v_goal_entry_id
  );

  return v_tx_id;
end;
$$;

create or replace function public.delete_financial_transaction_v112(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.deposit_funding_events%rowtype;
  v_deposit public.deposits%rowtype;
  v_entry record;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_event
  from public.deposit_funding_events
  where transaction_id = p_transaction_id and user_id = v_user_id
  for update;

  if not found then
    return public.delete_financial_transaction_v071(p_transaction_id);
  end if;

  select * into v_deposit
  from public.deposits
  where id = v_event.deposit_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Deposit was not found.' using errcode = '42501';
  end if;
  if v_deposit.principal_minor <= v_event.amount_minor then
    raise exception 'Cannot delete this deposit transfer because the current principal would become zero or negative. Adjust the deposit principal first.' using errcode = '23503';
  end if;

  perform 1
  from public.accounts
  where id in (
    select account_id from public.transaction_entries
    where transaction_id = p_transaction_id and user_id = v_user_id
  )
  order by id
  for update;

  if v_event.savings_goal_entry_id is not null then
    delete from public.savings_goal_entries
    where id = v_event.savings_goal_entry_id and user_id = v_user_id;
  end if;

  update public.deposits
  set principal_minor = principal_minor - v_event.amount_minor,
      updated_at = now()
  where id = v_event.deposit_id and user_id = v_user_id;

  for v_entry in
    select account_id, amount_minor
    from public.transaction_entries
    where transaction_id = p_transaction_id and user_id = v_user_id
    order by account_id
  loop
    update public.accounts
    set current_balance_minor = current_balance_minor - v_entry.amount_minor,
        updated_at = now()
    where id = v_entry.account_id and user_id = v_user_id;
  end loop;

  delete from public.deposit_funding_events where id = v_event.id and user_id = v_user_id;
  delete from public.transactions where id = p_transaction_id and user_id = v_user_id;
  return true;
end;
$$;

-- Flatten the report read path into one date-bounded RPC. This avoids embedded
-- PostgREST relation hydration and repeated paginated requests on report pages.
create or replace function public.report_flow_rows_v112(
  p_from_date date,
  p_to_date date
)
returns table (
  transaction_id uuid,
  transaction_type text,
  transaction_purpose text,
  title text,
  category_id uuid,
  category_label text,
  notes text,
  transaction_date date,
  transaction_created_at timestamptz,
  category_name text,
  category_icon_name text,
  category_icon_color text,
  category_type text,
  category_parent_id uuid,
  category_is_archived boolean,
  entry_id uuid,
  account_id uuid,
  currency_code text,
  amount_minor bigint,
  entry_role text,
  account_name text,
  account_type text,
  account_currency_code text,
  account_institution_name text,
  account_is_archived boolean,
  account_current_balance_minor bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.transaction_type,
    coalesce(t.transaction_purpose, 'standard'),
    t.title,
    t.category_id,
    t.category_label,
    t.notes,
    t.transaction_date,
    t.created_at,
    c.name,
    c.icon_name,
    c.icon_color,
    c.category_type,
    c.parent_id,
    c.is_archived,
    te.id,
    te.account_id,
    te.currency_code,
    te.amount_minor,
    te.entry_role,
    a.name,
    a.account_type,
    a.currency_code,
    a.institution_name,
    a.is_archived,
    a.current_balance_minor
  from public.transactions t
  join public.transaction_entries te
    on te.transaction_id = t.id and te.user_id = t.user_id
  join public.accounts a
    on a.id = te.account_id and a.user_id = t.user_id
  left join public.categories c
    on c.id = t.category_id and c.user_id = t.user_id
  where t.user_id = auth.uid()
    and p_from_date is not null
    and p_to_date is not null
    and p_from_date <= p_to_date
    and t.transaction_date between p_from_date and p_to_date
  order by t.transaction_date desc, t.created_at desc, te.entry_role asc;
$$;

revoke execute on function public.create_deposit_transfer_v112(text,text,date,uuid,uuid,bigint,uuid) from public, anon;
revoke execute on function public.delete_financial_transaction_v112(uuid) from public, anon;
revoke execute on function public.report_flow_rows_v112(date,date) from public, anon;
grant execute on function public.create_deposit_transfer_v112(text,text,date,uuid,uuid,bigint,uuid) to authenticated;
grant execute on function public.delete_financial_transaction_v112(uuid) to authenticated;
grant execute on function public.report_flow_rows_v112(date,date) to authenticated;

comment on table public.deposit_funding_events is 'V1.1.2 links Account -> Deposit transfers for atomic rollback and optional Goal contributions.';
comment on function public.create_deposit_transfer_v112(text,text,date,uuid,uuid,bigint,uuid) is 'Atomically moves value from an Account into a Deposit principal and optionally advances one Savings Goal.';
comment on function public.report_flow_rows_v112(date,date) is 'Date-bounded flattened report ledger rows for reliable and faster Reports hydration.';
