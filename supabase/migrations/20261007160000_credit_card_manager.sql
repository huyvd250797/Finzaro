-- Finzaro V0.0.12 — Credit Card Manager + editable income/expense transactions
-- Run after V0.0.11_loan_debt_manager.sql.

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank_name text,
  last4 text,
  currency_code text not null references public.supported_currencies(code),
  credit_limit_minor bigint not null,
  current_balance_minor bigint not null default 0,
  annual_rate_percent numeric(8,4) not null default 0,
  statement_day integer not null default 20,
  due_days_after_statement integer not null default 15,
  minimum_payment_percent numeric(7,4) not null default 5,
  minimum_payment_floor_minor bigint not null default 0,
  linked_payment_account_id uuid references public.accounts(id) on delete set null,
  icon_name text not null default 'CreditCard',
  icon_color text not null default '#2563eb',
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_cards_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint credit_cards_bank_check check (bank_name is null or char_length(bank_name) <= 120),
  constraint credit_cards_last4_check check (last4 is null or last4 ~ '^[0-9]{4}$'),
  constraint credit_cards_limit_check check (credit_limit_minor > 0 and credit_limit_minor <= 9007199254740991),
  constraint credit_cards_balance_check check (current_balance_minor >= 0 and current_balance_minor <= 9007199254740991),
  constraint credit_cards_rate_check check (annual_rate_percent >= 0 and annual_rate_percent <= 100),
  constraint credit_cards_statement_day_check check (statement_day between 1 and 28),
  constraint credit_cards_due_days_check check (due_days_after_statement between 1 and 60),
  constraint credit_cards_min_percent_check check (minimum_payment_percent >= 0 and minimum_payment_percent <= 100),
  constraint credit_cards_min_floor_check check (minimum_payment_floor_minor >= 0 and minimum_payment_floor_minor <= 9007199254740991),
  constraint credit_cards_icon_check check (char_length(btrim(icon_name)) between 1 and 64),
  constraint credit_cards_icon_color_check check (icon_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint credit_cards_notes_check check (notes is null or char_length(notes) <= 1000)
);

create table if not exists public.credit_card_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  statement_date date not null,
  due_date date not null,
  statement_balance_minor bigint not null,
  minimum_payment_minor bigint not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint credit_card_statements_balance_check check (statement_balance_minor >= 0 and statement_balance_minor <= 9007199254740991),
  constraint credit_card_statements_min_check check (minimum_payment_minor >= 0 and minimum_payment_minor <= statement_balance_minor),
  constraint credit_card_statements_due_check check (due_date >= statement_date),
  constraint credit_card_statements_notes_check check (notes is null or char_length(notes) <= 500),
  constraint credit_card_statements_unique unique (credit_card_id, statement_date)
);

create table if not exists public.credit_card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  statement_id uuid references public.credit_card_statements(id) on delete set null,
  payment_date date not null default current_date,
  amount_minor bigint not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint credit_card_payments_amount_check check (amount_minor > 0 and amount_minor <= 9007199254740991),
  constraint credit_card_payments_notes_check check (notes is null or char_length(notes) <= 500)
);

comment on table public.credit_cards is 'User-owned credit cards introduced in Finzaro V0.0.12.';
comment on table public.credit_card_statements is 'Credit-card statement snapshots and due obligations.';
comment on table public.credit_card_payments is 'Actual credit-card repayments; linked ledger outflow is optional but validated when supplied.';

create index if not exists credit_cards_user_archived_idx on public.credit_cards (user_id, is_archived, created_at desc);
create index if not exists credit_cards_user_currency_idx on public.credit_cards (user_id, currency_code, is_archived);
create index if not exists credit_card_statements_card_date_idx on public.credit_card_statements (credit_card_id, statement_date desc);
create index if not exists credit_card_payments_card_date_idx on public.credit_card_payments (credit_card_id, payment_date desc, created_at desc);
create unique index if not exists credit_card_payments_transaction_unique_idx on public.credit_card_payments (transaction_id) where transaction_id is not null;

alter table public.credit_cards enable row level security;
alter table public.credit_card_statements enable row level security;
alter table public.credit_card_payments enable row level security;

drop policy if exists "users can read own credit cards" on public.credit_cards;
create policy "users can read own credit cards" on public.credit_cards for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users can insert own credit cards" on public.credit_cards;
create policy "users can insert own credit cards" on public.credit_cards for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users can update own credit cards" on public.credit_cards;
create policy "users can update own credit cards" on public.credit_cards for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "users can read own credit card statements" on public.credit_card_statements;
create policy "users can read own credit card statements" on public.credit_card_statements for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users can insert own credit card statements" on public.credit_card_statements;
create policy "users can insert own credit card statements" on public.credit_card_statements for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "users can read own credit card payments" on public.credit_card_payments;
create policy "users can read own credit card payments" on public.credit_card_payments for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users can insert own credit card payments" on public.credit_card_payments;
create policy "users can insert own credit card payments" on public.credit_card_payments for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users can delete own credit card payments" on public.credit_card_payments;
create policy "users can delete own credit card payments" on public.credit_card_payments for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.credit_cards from anon, authenticated;
grant select on table public.credit_cards to authenticated;
grant insert (user_id, name, bank_name, last4, currency_code, credit_limit_minor, current_balance_minor, annual_rate_percent, statement_day, due_days_after_statement, minimum_payment_percent, minimum_payment_floor_minor, linked_payment_account_id, icon_name, icon_color, notes) on table public.credit_cards to authenticated;
grant update (name, bank_name, last4, credit_limit_minor, current_balance_minor, annual_rate_percent, statement_day, due_days_after_statement, minimum_payment_percent, minimum_payment_floor_minor, linked_payment_account_id, icon_name, icon_color, notes, is_archived) on table public.credit_cards to authenticated;

revoke all on table public.credit_card_statements from anon, authenticated;
grant select on table public.credit_card_statements to authenticated;
grant insert (user_id, credit_card_id, statement_date, due_date, statement_balance_minor, minimum_payment_minor, notes) on table public.credit_card_statements to authenticated;

revoke all on table public.credit_card_payments from anon, authenticated;
grant select on table public.credit_card_payments to authenticated;
grant insert (user_id, credit_card_id, statement_id, payment_date, amount_minor, transaction_id, notes) on table public.credit_card_payments to authenticated;
grant delete on table public.credit_card_payments to authenticated;

drop trigger if exists credit_cards_set_updated_at on public.credit_cards;
create trigger credit_cards_set_updated_at before update on public.credit_cards for each row execute function public.set_updated_at();

create or replace function public.validate_credit_card_v0012()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_account_currency text;
  v_account_archived boolean;
begin
  if new.current_balance_minor > new.credit_limit_minor * 5 then
    raise exception 'Credit card balance is unexpectedly high relative to credit limit.' using errcode = '22023';
  end if;

  if new.linked_payment_account_id is not null then
    select currency_code, is_archived into v_account_currency, v_account_archived
    from public.accounts
    where id = new.linked_payment_account_id and user_id = new.user_id;
    if not found then
      raise exception 'Linked payment account was not found.' using errcode = '42501';
    end if;
    if v_account_currency <> new.currency_code then
      raise exception 'Credit card currency must match the linked payment account currency.' using errcode = '22023';
    end if;
    if not new.is_archived and v_account_archived then
      raise exception 'Archived account cannot be linked to an active credit card.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists credit_cards_validate_v0012 on public.credit_cards;
create trigger credit_cards_validate_v0012 before insert or update on public.credit_cards for each row execute function public.validate_credit_card_v0012();
revoke execute on function public.validate_credit_card_v0012() from public, anon, authenticated;

create or replace function public.validate_credit_card_statement_v0012()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.credit_cards c where c.id = new.credit_card_id and c.user_id = new.user_id
  ) then
    raise exception 'Credit card was not found.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists credit_card_statements_validate_v0012 on public.credit_card_statements;
create trigger credit_card_statements_validate_v0012 before insert on public.credit_card_statements for each row execute function public.validate_credit_card_statement_v0012();
revoke execute on function public.validate_credit_card_statement_v0012() from public, anon, authenticated;

create or replace function public.validate_credit_card_payment_v0012()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_card public.credit_cards%rowtype;
  v_statement_card uuid;
  v_matching_amount bigint;
begin
  select * into v_card from public.credit_cards where id = new.credit_card_id and user_id = new.user_id for update;
  if not found then raise exception 'Credit card was not found.' using errcode = '42501'; end if;
  if v_card.is_archived then raise exception 'Archived credit card cannot receive new payments.' using errcode = '22023'; end if;
  if new.amount_minor > v_card.current_balance_minor then
    raise exception 'Credit card payment cannot exceed current balance.' using errcode = '22023';
  end if;

  if new.statement_id is not null then
    select credit_card_id into v_statement_card from public.credit_card_statements where id = new.statement_id and user_id = new.user_id;
    if not found or v_statement_card <> new.credit_card_id then
      raise exception 'Statement does not belong to this credit card.' using errcode = '22023';
    end if;
  end if;

  if new.transaction_id is not null then
    select max(abs(te.amount_minor)) into v_matching_amount
    from public.transaction_entries te
    join public.transactions t on t.id = te.transaction_id
    where t.id = new.transaction_id and t.user_id = new.user_id and te.user_id = new.user_id
      and te.currency_code = v_card.currency_code and te.amount_minor < 0
      and (v_card.linked_payment_account_id is null or te.account_id = v_card.linked_payment_account_id);
    if v_matching_amount is null then
      raise exception 'Linked transaction does not match this credit card currency/account/payment direction.' using errcode = '22023';
    end if;
    if new.amount_minor > v_matching_amount then
      raise exception 'Credit card payment cannot exceed linked ledger outflow.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists credit_card_payments_validate_v0012 on public.credit_card_payments;
create trigger credit_card_payments_validate_v0012 before insert on public.credit_card_payments for each row execute function public.validate_credit_card_payment_v0012();
revoke execute on function public.validate_credit_card_payment_v0012() from public, anon, authenticated;

create or replace function public.apply_credit_card_payment_v0012()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.credit_cards
    set current_balance_minor = greatest(0, current_balance_minor - new.amount_minor), updated_at = now()
    where id = new.credit_card_id and user_id = new.user_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.credit_cards
    set current_balance_minor = current_balance_minor + old.amount_minor, updated_at = now()
    where id = old.credit_card_id and user_id = old.user_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists credit_card_payments_apply_v0012 on public.credit_card_payments;
create trigger credit_card_payments_apply_v0012 after insert or delete on public.credit_card_payments for each row execute function public.apply_credit_card_payment_v0012();
revoke execute on function public.apply_credit_card_payment_v0012() from public, anon, authenticated;

create or replace function public.guard_account_credit_card_archive_v0012()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_archived = true and old.is_archived = false and exists (
    select 1 from public.credit_cards c
    where c.user_id = new.user_id and c.is_archived = false and c.linked_payment_account_id = new.id
  ) then
    raise exception 'Archive or detach active credit cards before archiving this account.' using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_guard_credit_card_archive_v0012 on public.accounts;
create trigger accounts_guard_credit_card_archive_v0012 before update of is_archived on public.accounts for each row execute function public.guard_account_credit_card_archive_v0012();
revoke execute on function public.guard_account_credit_card_archive_v0012() from public, anon, authenticated;

-- Edit existing Income / Expense while preserving the transaction id and atomically repairing account balances.
create or replace function public.update_financial_transaction_v012(
  p_transaction_id uuid,
  p_title text,
  p_category_id uuid,
  p_notes text,
  p_transaction_date date,
  p_account_id uuid,
  p_amount_minor bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_type text;
  v_title text := btrim(coalesce(p_title, ''));
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_category_name text;
  v_category_type text;
  v_category_archived boolean;
  v_old_entry record;
  v_account_currency text;
  v_account_archived boolean;
  v_signed_amount bigint;
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select transaction_type into v_type from public.transactions where id = p_transaction_id and user_id = v_user_id for update;
  if not found then raise exception 'Transaction was not found.' using errcode = '42501'; end if;
  if v_type not in ('income','expense') then raise exception 'Only income and expense can be edited in V0.0.12.' using errcode = '22023'; end if;
  if char_length(v_title) < 1 or char_length(v_title) > 140 then raise exception 'Transaction title must be between 1 and 140 characters.' using errcode = '22023'; end if;
  if v_notes is not null and char_length(v_notes) > 500 then raise exception 'Notes are too long.' using errcode = '22023'; end if;
  if p_transaction_date is null or p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 9007199254740991 then raise exception 'Transaction amount/date is invalid.' using errcode = '22023'; end if;
  if p_category_id is null or p_account_id is null then raise exception 'Category and account are required.' using errcode = '22023'; end if;

  if exists (select 1 from public.savings_goal_entries where transaction_id = p_transaction_id)
     or exists (select 1 from public.deposit_interest_entries where transaction_id = p_transaction_id)
     or exists (select 1 from public.loan_payments where transaction_id = p_transaction_id)
     or exists (select 1 from public.recurring_occurrences where transaction_id = p_transaction_id)
     or exists (select 1 from public.credit_card_payments where transaction_id = p_transaction_id) then
    raise exception 'This transaction is linked to another financial module and cannot be edited directly.' using errcode = '23503';
  end if;

  select name, category_type, is_archived into v_category_name, v_category_type, v_category_archived
  from public.categories where id = p_category_id and user_id = v_user_id;
  if not found then raise exception 'Category was not found.' using errcode = '42501'; end if;
  if v_category_archived then raise exception 'Archived category cannot be used.' using errcode = '22023'; end if;
  if v_category_type <> v_type then raise exception 'Category type does not match transaction type.' using errcode = '22023'; end if;

  for v_old_entry in select account_id, amount_minor from public.transaction_entries where transaction_id = p_transaction_id and user_id = v_user_id order by account_id loop
    perform 1 from public.accounts where id = v_old_entry.account_id and user_id = v_user_id for update;
    update public.accounts set current_balance_minor = current_balance_minor - v_old_entry.amount_minor, updated_at = now()
    where id = v_old_entry.account_id and user_id = v_user_id;
  end loop;

  perform 1 from public.accounts where id = p_account_id and user_id = v_user_id for update;
  if not found then raise exception 'Account was not found.' using errcode = '42501'; end if;
  select currency_code, is_archived into v_account_currency, v_account_archived from public.accounts where id = p_account_id and user_id = v_user_id;
  if v_account_archived then raise exception 'Archived account cannot be used.' using errcode = '22023'; end if;

  delete from public.transaction_entries where transaction_id = p_transaction_id and user_id = v_user_id;
  update public.transactions set title = v_title, category_id = p_category_id, category_label = v_category_name, notes = v_notes, transaction_date = p_transaction_date, updated_at = now()
  where id = p_transaction_id and user_id = v_user_id;

  v_signed_amount := case when v_type = 'income' then p_amount_minor else -p_amount_minor end;
  insert into public.transaction_entries (transaction_id, user_id, account_id, currency_code, amount_minor, entry_role)
  values (p_transaction_id, v_user_id, p_account_id, v_account_currency, v_signed_amount, v_type);
  update public.accounts set current_balance_minor = current_balance_minor + v_signed_amount, updated_at = now()
  where id = p_account_id and user_id = v_user_id;
  return true;
end;
$$;

revoke execute on function public.update_financial_transaction_v012(uuid, text, uuid, text, date, uuid, bigint) from public, anon;
grant execute on function public.update_financial_transaction_v012(uuid, text, uuid, text, date, uuid, bigint) to authenticated;
