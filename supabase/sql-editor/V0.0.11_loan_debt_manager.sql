-- Finzaro V0.0.11 — Loan & Debt Manager + customizable icon colors
-- Run after 20261007123000_interest_deposit_manager.sql.

alter table public.categories add column if not exists icon_color text not null default '#0d8b66';
alter table public.savings_goals add column if not exists icon_color text not null default '#0d8b66';
alter table public.deposits add column if not exists icon_color text not null default '#0d8b66';

alter table public.categories drop constraint if exists categories_icon_color_check;
alter table public.categories add constraint categories_icon_color_check check (icon_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.savings_goals drop constraint if exists savings_goals_icon_color_check;
alter table public.savings_goals add constraint savings_goals_icon_color_check check (icon_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.deposits drop constraint if exists deposits_icon_color_check;
alter table public.deposits add constraint deposits_icon_color_check check (icon_color ~ '^#[0-9A-Fa-f]{6}$');

grant insert (icon_color) on public.categories to authenticated;
grant update (icon_color) on public.categories to authenticated;
grant insert (icon_color) on public.savings_goals to authenticated;
grant update (icon_color) on public.savings_goals to authenticated;
grant insert (icon_color) on public.deposits to authenticated;
grant update (icon_color) on public.deposits to authenticated;

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lender_name text,
  currency_code text not null references public.supported_currencies(code),
  original_principal_minor bigint not null,
  annual_rate_percent numeric(8,4) not null,
  term_months integer not null,
  start_date date not null,
  first_payment_date date not null,
  interest_method text not null default 'annuity',
  payment_frequency text not null default 'monthly',
  upfront_fee_minor bigint not null default 0,
  linked_account_id uuid references public.accounts(id) on delete set null,
  icon_name text not null default 'CreditCard',
  icon_color text not null default '#2563eb',
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loans_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint loans_lender_check check (lender_name is null or char_length(lender_name) <= 120),
  constraint loans_principal_check check (original_principal_minor > 0 and original_principal_minor <= 9007199254740991),
  constraint loans_rate_check check (annual_rate_percent >= 0 and annual_rate_percent <= 100),
  constraint loans_term_check check (term_months between 1 and 600),
  constraint loans_date_check check (first_payment_date >= start_date),
  constraint loans_interest_method_check check (interest_method in ('annuity', 'equal_principal', 'interest_only')),
  constraint loans_payment_frequency_check check (payment_frequency in ('monthly','biweekly','weekly')),
  constraint loans_upfront_fee_check check (upfront_fee_minor >= 0 and upfront_fee_minor <= 9007199254740991),
  constraint loans_icon_check check (char_length(btrim(icon_name)) between 1 and 64),
  constraint loans_icon_color_check check (icon_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint loans_notes_check check (notes is null or char_length(notes) <= 1000)
);

create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  payment_date date not null default current_date,
  principal_minor bigint not null default 0,
  interest_minor bigint not null default 0,
  fee_minor bigint not null default 0,
  transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint loan_payments_components_check check (
    principal_minor >= 0 and interest_minor >= 0 and fee_minor >= 0
    and principal_minor <= 9007199254740991
    and interest_minor <= 9007199254740991
    and fee_minor <= 9007199254740991
    and (principal_minor + interest_minor + fee_minor) > 0
  ),
  constraint loan_payments_notes_check check (notes is null or char_length(notes) <= 500)
);

comment on table public.loans is 'User-owned loans and debts introduced in Finzaro V0.0.11.';
comment on table public.loan_payments is 'Actual loan payment history. Principal reduces outstanding debt; interest and fee are tracked separately.';

create index if not exists loans_user_archived_start_idx on public.loans (user_id, is_archived, start_date desc);
create index if not exists loans_user_currency_idx on public.loans (user_id, currency_code, is_archived);
create index if not exists loan_payments_loan_date_idx on public.loan_payments (loan_id, payment_date desc, created_at desc);
create unique index if not exists loan_payments_transaction_unique_idx on public.loan_payments (transaction_id) where transaction_id is not null;

alter table public.loans enable row level security;
alter table public.loan_payments enable row level security;

drop policy if exists "users can read own loans" on public.loans;
create policy "users can read own loans" on public.loans for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users can insert own loans" on public.loans;
create policy "users can insert own loans" on public.loans for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users can update own loans" on public.loans;
create policy "users can update own loans" on public.loans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "users can read own loan payments" on public.loan_payments;
create policy "users can read own loan payments" on public.loan_payments for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users can insert own loan payments" on public.loan_payments;
create policy "users can insert own loan payments" on public.loan_payments for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users can delete own loan payments" on public.loan_payments;
create policy "users can delete own loan payments" on public.loan_payments for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.loans from anon, authenticated;
grant select on table public.loans to authenticated;
grant insert (user_id, name, lender_name, currency_code, original_principal_minor, annual_rate_percent, term_months, start_date, first_payment_date, interest_method, payment_frequency, upfront_fee_minor, linked_account_id, icon_name, icon_color, notes) on table public.loans to authenticated;
grant update (name, lender_name, original_principal_minor, annual_rate_percent, term_months, start_date, first_payment_date, interest_method, payment_frequency, upfront_fee_minor, linked_account_id, icon_name, icon_color, notes, is_archived) on table public.loans to authenticated;

revoke all on table public.loan_payments from anon, authenticated;
grant select on table public.loan_payments to authenticated;
grant insert (user_id, loan_id, payment_date, principal_minor, interest_minor, fee_minor, transaction_id, notes) on table public.loan_payments to authenticated;
grant delete on table public.loan_payments to authenticated;

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at before update on public.loans for each row execute function public.set_updated_at();

create or replace function public.validate_loan_v0011()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_account_currency text;
  v_account_archived boolean;
begin
  if tg_op = 'UPDATE' and new.original_principal_minor <> old.original_principal_minor then
    if new.original_principal_minor < (
      select coalesce(sum(principal_minor), 0)
      from public.loan_payments
      where loan_id = old.id and user_id = old.user_id
    ) then
      raise exception 'Loan principal cannot be lower than principal already paid.' using errcode = '22023';
    end if;
  end if;

  if new.linked_account_id is not null then
    select currency_code, is_archived into v_account_currency, v_account_archived
    from public.accounts
    where id = new.linked_account_id and user_id = new.user_id;

    if not found then
      raise exception 'Linked loan account was not found.' using errcode = '42501';
    end if;
    if v_account_currency <> new.currency_code then
      raise exception 'Loan currency must match the linked account currency.' using errcode = '22023';
    end if;
    if not new.is_archived and v_account_archived then
      raise exception 'Archived account cannot be linked to an active loan.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists loans_validate_v0011 on public.loans;
create trigger loans_validate_v0011 before insert or update on public.loans for each row execute function public.validate_loan_v0011();
revoke execute on function public.validate_loan_v0011() from public, anon, authenticated;

create or replace function public.validate_loan_payment_v0011()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_loan public.loans%rowtype;
  v_paid_principal bigint;
  v_matching_amount bigint;
begin
  select * into v_loan from public.loans where id = new.loan_id and user_id = new.user_id;
  if not found then
    raise exception 'Loan was not found.' using errcode = '42501';
  end if;
  if v_loan.is_archived then
    raise exception 'Archived loan cannot receive new payments.' using errcode = '22023';
  end if;

  select coalesce(sum(principal_minor), 0) into v_paid_principal
  from public.loan_payments
  where loan_id = new.loan_id and user_id = new.user_id and id <> new.id;

  if v_paid_principal + new.principal_minor > v_loan.original_principal_minor then
    raise exception 'Loan principal payments cannot exceed original principal.' using errcode = '22023';
  end if;

  if new.transaction_id is not null then
    select max(abs(te.amount_minor)) into v_matching_amount
    from public.transaction_entries te
    join public.transactions t on t.id = te.transaction_id
    where t.id = new.transaction_id
      and t.user_id = new.user_id
      and te.user_id = new.user_id
      and te.currency_code = v_loan.currency_code
      and te.amount_minor < 0
      and (v_loan.linked_account_id is null or te.account_id = v_loan.linked_account_id);

    if v_matching_amount is null then
      raise exception 'Linked transaction does not match this loan currency/account/payment direction.' using errcode = '22023';
    end if;
    if (new.principal_minor + new.interest_minor + new.fee_minor) > v_matching_amount then
      raise exception 'Loan payment cannot exceed the linked ledger outflow.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists loan_payments_validate_v0011 on public.loan_payments;
create trigger loan_payments_validate_v0011 before insert on public.loan_payments for each row execute function public.validate_loan_payment_v0011();
revoke execute on function public.validate_loan_payment_v0011() from public, anon, authenticated;

create or replace function public.guard_account_loan_archive_v0011()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_archived = true and old.is_archived = false and exists (
    select 1 from public.loans l
    where l.user_id = new.user_id and l.is_archived = false and l.linked_account_id = new.id
  ) then
    raise exception 'Archive or detach active loans before archiving this account.' using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_guard_loan_archive_v0011 on public.accounts;
create trigger accounts_guard_loan_archive_v0011 before update of is_archived on public.accounts for each row execute function public.guard_account_loan_archive_v0011();
revoke execute on function public.guard_account_loan_archive_v0011() from public, anon, authenticated;
