-- Finzaro V0.0.10 — Interest & Deposit Manager
-- Run after 20261007110000_savings_goals.sql.

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  institution_name text,
  currency_code text not null references public.supported_currencies(code),
  principal_minor bigint not null,
  annual_rate_percent numeric(8,4) not null,
  term_months integer not null,
  start_date date not null,
  maturity_date date not null,
  interest_method text not null default 'simple_maturity',
  auto_renew boolean not null default false,
  linked_account_id uuid references public.accounts(id) on delete set null,
  icon_name text not null default 'Landmark',
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deposits_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint deposits_institution_check check (institution_name is null or char_length(institution_name) <= 120),
  constraint deposits_principal_check check (principal_minor > 0 and principal_minor <= 9007199254740991),
  constraint deposits_rate_check check (annual_rate_percent >= 0 and annual_rate_percent <= 100),
  constraint deposits_term_check check (term_months between 1 and 600),
  constraint deposits_interest_method_check check (interest_method in ('simple_maturity', 'compound_monthly', 'monthly_payout')),
  constraint deposits_icon_check check (char_length(btrim(icon_name)) between 1 and 64),
  constraint deposits_notes_check check (notes is null or char_length(notes) <= 1000)
);

create table if not exists public.deposit_interest_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deposit_id uuid not null references public.deposits(id) on delete cascade,
  entry_type text not null,
  amount_minor bigint not null,
  entry_date date not null default current_date,
  transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint deposit_interest_entries_type_check check (entry_type in ('interest', 'tax', 'fee', 'adjustment')),
  constraint deposit_interest_entries_amount_check check (amount_minor <> 0 and amount_minor between -9007199254740991 and 9007199254740991),
  constraint deposit_interest_entries_sign_check check (
    (entry_type = 'interest' and amount_minor > 0)
    or (entry_type in ('tax', 'fee') and amount_minor < 0)
    or (entry_type = 'adjustment' and amount_minor <> 0)
  ),
  constraint deposit_interest_entries_notes_check check (notes is null or char_length(notes) <= 500)
);

comment on table public.deposits is 'User-owned fixed-term deposits introduced in Finzaro V0.0.10.';
comment on table public.deposit_interest_entries is 'Realized interest/tax/fee/adjustment entries for deposits. They do not mutate account ledger unless linked to a transaction.';

create index if not exists deposits_user_archived_maturity_idx
  on public.deposits (user_id, is_archived, maturity_date);
create index if not exists deposits_user_currency_idx
  on public.deposits (user_id, currency_code, is_archived);
create index if not exists deposit_interest_entries_deposit_date_idx
  on public.deposit_interest_entries (deposit_id, entry_date desc, created_at desc);
create unique index if not exists deposit_interest_entries_transaction_unique_idx
  on public.deposit_interest_entries (transaction_id)
  where transaction_id is not null;

alter table public.deposits enable row level security;
alter table public.deposit_interest_entries enable row level security;

drop policy if exists "users can read own deposits" on public.deposits;
create policy "users can read own deposits"
on public.deposits for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own deposits" on public.deposits;
create policy "users can insert own deposits"
on public.deposits for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update own deposits" on public.deposits;
create policy "users can update own deposits"
on public.deposits for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users can read own deposit interest entries" on public.deposit_interest_entries;
create policy "users can read own deposit interest entries"
on public.deposit_interest_entries for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own deposit interest entries" on public.deposit_interest_entries;
create policy "users can insert own deposit interest entries"
on public.deposit_interest_entries for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can delete own deposit interest entries" on public.deposit_interest_entries;
create policy "users can delete own deposit interest entries"
on public.deposit_interest_entries for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.deposits from anon, authenticated;
grant select on table public.deposits to authenticated;
grant insert (user_id, name, institution_name, currency_code, principal_minor, annual_rate_percent, term_months, start_date, maturity_date, interest_method, auto_renew, linked_account_id, icon_name, notes) on table public.deposits to authenticated;
grant update (name, institution_name, principal_minor, annual_rate_percent, term_months, start_date, maturity_date, interest_method, auto_renew, linked_account_id, icon_name, notes, is_archived) on table public.deposits to authenticated;

revoke all on table public.deposit_interest_entries from anon, authenticated;
grant select on table public.deposit_interest_entries to authenticated;
grant insert (user_id, deposit_id, entry_type, amount_minor, entry_date, transaction_id, notes) on table public.deposit_interest_entries to authenticated;
grant delete on table public.deposit_interest_entries to authenticated;

drop trigger if exists deposits_set_updated_at on public.deposits;
create trigger deposits_set_updated_at
before update on public.deposits
for each row execute function public.set_updated_at();

create or replace function public.validate_deposit_v0010()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_account_currency text;
  v_account_archived boolean;
  v_expected_maturity date;
begin
  v_expected_maturity := (new.start_date + make_interval(months => new.term_months))::date;
  if new.maturity_date <> v_expected_maturity then
    raise exception 'Deposit maturity date must match start date plus term months.' using errcode = '22023';
  end if;

  if new.linked_account_id is not null then
    select currency_code, is_archived into v_account_currency, v_account_archived
    from public.accounts
    where id = new.linked_account_id and user_id = new.user_id;

    if not found then
      raise exception 'Linked deposit account was not found.' using errcode = '42501';
    end if;
    if v_account_currency <> new.currency_code then
      raise exception 'Deposit currency must match the linked account currency.' using errcode = '22023';
    end if;
    if not new.is_archived and v_account_archived then
      raise exception 'Archived account cannot be linked to an active deposit.' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists deposits_validate_v0010 on public.deposits;
create trigger deposits_validate_v0010
before insert or update on public.deposits
for each row execute function public.validate_deposit_v0010();
revoke execute on function public.validate_deposit_v0010() from public, anon, authenticated;

create or replace function public.validate_deposit_interest_entry_v0010()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_deposit public.deposits%rowtype;
  v_matching_amount bigint;
begin
  select * into v_deposit
  from public.deposits
  where id = new.deposit_id and user_id = new.user_id;

  if not found then
    raise exception 'Deposit was not found.' using errcode = '42501';
  end if;
  if v_deposit.is_archived then
    raise exception 'Archived deposit cannot receive new interest entries.' using errcode = '22023';
  end if;

  if new.transaction_id is not null then
    if new.entry_type = 'adjustment' then
      raise exception 'Manual deposit adjustment cannot be linked to a ledger transaction.' using errcode = '22023';
    end if;

    select max(abs(te.amount_minor)) into v_matching_amount
    from public.transaction_entries te
    join public.transactions t on t.id = te.transaction_id
    where t.id = new.transaction_id
      and t.user_id = new.user_id
      and te.user_id = new.user_id
      and te.currency_code = v_deposit.currency_code
      and (v_deposit.linked_account_id is null or te.account_id = v_deposit.linked_account_id)
      and (
        (new.entry_type = 'interest' and te.amount_minor > 0)
        or (new.entry_type in ('tax', 'fee') and te.amount_minor < 0)
      );

    if v_matching_amount is null then
      raise exception 'Linked transaction does not match this deposit currency/account/direction.' using errcode = '22023';
    end if;
    if abs(new.amount_minor) > v_matching_amount then
      raise exception 'Deposit interest entry cannot exceed the linked ledger amount.' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists deposit_interest_entries_validate_v0010 on public.deposit_interest_entries;
create trigger deposit_interest_entries_validate_v0010
before insert on public.deposit_interest_entries
for each row execute function public.validate_deposit_interest_entry_v0010();
revoke execute on function public.validate_deposit_interest_entry_v0010() from public, anon, authenticated;

create or replace function public.guard_account_deposit_archive_v0010()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_archived = true and old.is_archived = false and exists (
    select 1 from public.deposits d
    where d.user_id = new.user_id
      and d.is_archived = false
      and d.linked_account_id = new.id
  ) then
    raise exception 'Archive or detach active deposits before archiving this account.' using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_guard_deposit_archive_v0010 on public.accounts;
create trigger accounts_guard_deposit_archive_v0010
before update of is_archived on public.accounts
for each row execute function public.guard_account_deposit_archive_v0010();
revoke execute on function public.guard_account_deposit_archive_v0010() from public, anon, authenticated;
