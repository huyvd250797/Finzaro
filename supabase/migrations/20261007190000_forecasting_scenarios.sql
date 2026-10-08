-- Finzaro V0.3.0 — Forecasting & Scenario Planning
-- Persistent user-owned planning scenarios. Forecast calculations remain derived from live financial data.

create table if not exists public.forecast_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(120) not null,
  currency_code text not null references public.supported_currencies(code),
  horizon_days integer not null default 90,
  income_adjust_percent numeric(7,2) not null default 0,
  expense_adjust_percent numeric(7,2) not null default 0,
  extra_income_minor bigint not null default 0,
  extra_expense_minor bigint not null default 0,
  extra_debt_payment_minor bigint not null default 0,
  monthly_savings_reserve_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forecast_scenarios_horizon_check check (horizon_days in (30, 90, 180, 365)),
  constraint forecast_scenarios_income_adjust_check check (income_adjust_percent between -90 and 300),
  constraint forecast_scenarios_expense_adjust_check check (expense_adjust_percent between -90 and 300),
  constraint forecast_scenarios_amounts_nonnegative check (
    extra_income_minor >= 0 and extra_expense_minor >= 0 and extra_debt_payment_minor >= 0 and monthly_savings_reserve_minor >= 0
  )
);

create index if not exists forecast_scenarios_user_currency_updated_idx
  on public.forecast_scenarios (user_id, currency_code, updated_at desc);

alter table public.forecast_scenarios enable row level security;

drop policy if exists "users can read own forecast scenarios" on public.forecast_scenarios;
create policy "users can read own forecast scenarios"
on public.forecast_scenarios for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own forecast scenarios" on public.forecast_scenarios;
create policy "users can insert own forecast scenarios"
on public.forecast_scenarios for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own forecast scenarios" on public.forecast_scenarios;
create policy "users can update own forecast scenarios"
on public.forecast_scenarios for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own forecast scenarios" on public.forecast_scenarios;
create policy "users can delete own forecast scenarios"
on public.forecast_scenarios for delete to authenticated
using (auth.uid() = user_id);

revoke all on table public.forecast_scenarios from anon, authenticated;
grant select, insert, update, delete on table public.forecast_scenarios to authenticated;

drop trigger if exists forecast_scenarios_set_updated_at on public.forecast_scenarios;
create trigger forecast_scenarios_set_updated_at
before update on public.forecast_scenarios
for each row execute function public.set_updated_at();
