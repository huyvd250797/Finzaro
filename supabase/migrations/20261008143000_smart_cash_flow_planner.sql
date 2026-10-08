-- Finzaro V0.4.0 — Smart Cash Flow Planner

create table if not exists public.cash_flow_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  currency_code text not null references public.supported_currencies(code),
  planned_income_minor bigint not null default 0 check (planned_income_minor >= 0),
  discretionary_limit_minor bigint not null default 0 check (discretionary_limit_minor >= 0),
  savings_reserve_minor bigint not null default 0 check (savings_reserve_minor >= 0),
  extra_debt_payment_minor bigint not null default 0 check (extra_debt_payment_minor >= 0),
  minimum_cash_buffer_minor bigint not null default 0 check (minimum_cash_buffer_minor >= 0),
  notes text null check (char_length(notes) <= 1000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint cash_flow_plans_month_start_check check (month_start = date_trunc('month', month_start)::date),
  constraint cash_flow_plans_user_month_currency_unique unique (user_id, month_start, currency_code)
);

create index if not exists cash_flow_plans_user_month_idx
  on public.cash_flow_plans (user_id, currency_code, month_start desc);

alter table public.cash_flow_plans enable row level security;

revoke all on table public.cash_flow_plans from anon;
revoke all on table public.cash_flow_plans from authenticated;
grant select, insert, update, delete on table public.cash_flow_plans to authenticated;

create policy "cash_flow_plans_select_own"
  on public.cash_flow_plans for select
  to authenticated
  using (auth.uid() = user_id);

create policy "cash_flow_plans_insert_own"
  on public.cash_flow_plans for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "cash_flow_plans_update_own"
  on public.cash_flow_plans for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cash_flow_plans_delete_own"
  on public.cash_flow_plans for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_cash_flow_plans_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_cash_flow_plans_updated_at on public.cash_flow_plans;
create trigger set_cash_flow_plans_updated_at
before update on public.cash_flow_plans
for each row execute function public.set_cash_flow_plans_updated_at();
