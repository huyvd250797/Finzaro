-- Finzaro V0.0.3 — Account Core
-- Run after 20261005110000_foundation_environment.sql.
-- Safe ownership model: each row belongs to auth.uid() and is protected by RLS.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null,
  currency_code text not null references public.supported_currencies(code),
  institution_name text,
  opening_balance_minor bigint not null default 0,
  current_balance_minor bigint not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_name_length check (char_length(name) between 1 and 100),
  constraint accounts_type_allowed check (account_type in ('cash', 'bank', 'ewallet', 'savings')),
  constraint accounts_institution_length check (institution_name is null or char_length(institution_name) between 1 and 100),
  constraint accounts_opening_balance_safe check (opening_balance_minor between -9007199254740991 and 9007199254740991),
  constraint accounts_current_balance_safe check (current_balance_minor between -9007199254740991 and 9007199254740991)
);

comment on table public.accounts is 'User-owned financial accounts introduced in Finzaro V0.0.3.';
comment on column public.accounts.opening_balance_minor is 'Opening balance in the currency minor unit.';
comment on column public.accounts.current_balance_minor is 'Current balance in the currency minor unit. V0.0.4 transaction engine will maintain this value.';

create index if not exists accounts_user_active_created_idx
  on public.accounts (user_id, is_archived, created_at desc);

alter table public.accounts enable row level security;

drop policy if exists "users can read own accounts" on public.accounts;
create policy "users can read own accounts"
on public.accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own accounts" on public.accounts;
create policy "users can insert own accounts"
on public.accounts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update own accounts" on public.accounts;
create policy "users can update own accounts"
on public.accounts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users can delete own accounts" on public.accounts;
create policy "users can delete own accounts"
on public.accounts
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.accounts from anon, authenticated;
grant select, insert, update, delete on table public.accounts to authenticated;

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();
