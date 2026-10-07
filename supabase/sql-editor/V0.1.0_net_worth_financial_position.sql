-- Finzaro V0.1.0 — Net Worth & Financial Position
-- Run after 20261007160000_credit_card_manager.sql.

-- V0.0.11 expanded the UI icon catalog. Remove the legacy fixed icon allow-list
-- so existing/used categories can be re-styled with the newer icon set.
alter table public.categories drop constraint if exists categories_icon_allowed;
alter table public.categories drop constraint if exists categories_icon_allowed_v0100;
alter table public.categories add constraint categories_icon_allowed_v0100 check (icon_name in ('Shapes','Briefcase','Gift','Laptop','Store','TrendingUp','RotateCcw','CircleDollarSign','Utensils','Home','Car','ShoppingBag','ShoppingCart','ReceiptText','HeartPulse','GraduationCap','Gamepad2','Users','MoreHorizontal','Coffee','Plane','Bus','TrainFront','Fuel','Baby','PawPrint','Dog','Shirt','Smartphone','Wifi','CreditCard','Dumbbell','Stethoscope','BookOpen','Film','Music','Landmark','WalletCards','PiggyBank','Building2','Coins','Banknote','CakeSlice','Camera','Donut','PartyPopper','Shield','Soup','Bike','BedDouble','Tv','Wrench'));

grant update (name, parent_id, icon_name, icon_color, is_archived, sort_order) on table public.categories to authenticated;

-- When a category name is intentionally changed, keep transaction snapshots in
-- sync so exports/fallbacks reflect the confirmed new label. Amounts/ledger are untouched.
create or replace function public.sync_transaction_category_label_v0100()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.transactions
       set category_label = new.name,
           updated_at = now()
     where user_id = new.user_id
       and category_id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_transaction_category_label_v0100() from public, anon, authenticated;
drop trigger if exists categories_sync_transaction_label_v0100 on public.categories;
create trigger categories_sync_transaction_label_v0100
after update of name on public.categories
for each row execute function public.sync_transaction_category_label_v0100();

create table if not exists public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  currency_code text not null references public.supported_currencies(code),
  account_assets_minor bigint not null default 0,
  deposit_assets_minor bigint not null default 0,
  loan_liabilities_minor bigint not null default 0,
  credit_card_liabilities_minor bigint not null default 0,
  total_assets_minor bigint not null default 0,
  total_liabilities_minor bigint not null default 0,
  net_worth_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint net_worth_snapshots_amounts_check check (
    account_assets_minor >= -9007199254740991 and account_assets_minor <= 9007199254740991
    and deposit_assets_minor >= 0 and deposit_assets_minor <= 9007199254740991
    and loan_liabilities_minor >= 0 and loan_liabilities_minor <= 9007199254740991
    and credit_card_liabilities_minor >= 0 and credit_card_liabilities_minor <= 9007199254740991
    and total_assets_minor >= -9007199254740991 and total_assets_minor <= 9007199254740991
    and total_liabilities_minor >= 0 and total_liabilities_minor <= 9007199254740991
    and net_worth_minor >= -9007199254740991 and net_worth_minor <= 9007199254740991
  ),
  constraint net_worth_snapshots_math_check check (
    total_assets_minor = account_assets_minor + deposit_assets_minor
    and total_liabilities_minor = loan_liabilities_minor + credit_card_liabilities_minor
    and net_worth_minor = total_assets_minor - total_liabilities_minor
  ),
  constraint net_worth_snapshots_unique unique (user_id, snapshot_date, currency_code)
);

comment on table public.net_worth_snapshots is 'User-owned point-in-time Net Worth snapshots introduced in Finzaro V0.1.0.';

create index if not exists net_worth_snapshots_user_currency_date_idx
  on public.net_worth_snapshots (user_id, currency_code, snapshot_date desc);

alter table public.net_worth_snapshots enable row level security;

drop policy if exists "users can read own net worth snapshots" on public.net_worth_snapshots;
create policy "users can read own net worth snapshots"
on public.net_worth_snapshots for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own net worth snapshots" on public.net_worth_snapshots;
create policy "users can insert own net worth snapshots"
on public.net_worth_snapshots for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own net worth snapshots" on public.net_worth_snapshots;
create policy "users can update own net worth snapshots"
on public.net_worth_snapshots for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own net worth snapshots" on public.net_worth_snapshots;
create policy "users can delete own net worth snapshots"
on public.net_worth_snapshots for delete to authenticated
using (auth.uid() = user_id);

revoke all on table public.net_worth_snapshots from anon, authenticated;
grant select, insert, update, delete on table public.net_worth_snapshots to authenticated;

drop trigger if exists net_worth_snapshots_set_updated_at on public.net_worth_snapshots;
create trigger net_worth_snapshots_set_updated_at
before update on public.net_worth_snapshots
for each row execute function public.set_updated_at();
