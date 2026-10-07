-- Finzaro V0.2.0 — Financial Health Score & Intelligence
-- Run after 20261007164000_net_worth_financial_position.sql.

create table if not exists public.financial_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  currency_code text not null references public.supported_currencies(code),
  overall_score smallint not null,
  data_confidence smallint not null,
  cashflow_score smallint not null,
  savings_score smallint not null,
  budget_score smallint not null,
  liquidity_score smallint not null,
  debt_score smallint not null,
  credit_score smallint not null,
  net_worth_score smallint not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_health_snapshots_scores_check check (
    overall_score between 0 and 100
    and data_confidence between 0 and 100
    and cashflow_score between 0 and 100
    and savings_score between 0 and 100
    and budget_score between 0 and 100
    and liquidity_score between 0 and 100
    and debt_score between 0 and 100
    and credit_score between 0 and 100
    and net_worth_score between 0 and 100
  ),
  constraint financial_health_snapshots_metrics_object_check check (jsonb_typeof(metrics) = 'object'),
  constraint financial_health_snapshots_unique unique (user_id, snapshot_date, currency_code)
);

comment on table public.financial_health_snapshots is
  'User-owned point-in-time Financial Health Score snapshots introduced in Finzaro V0.2.0.';

create index if not exists financial_health_snapshots_user_currency_date_idx
  on public.financial_health_snapshots (user_id, currency_code, snapshot_date desc);

alter table public.financial_health_snapshots enable row level security;

drop policy if exists "users can read own financial health snapshots" on public.financial_health_snapshots;
create policy "users can read own financial health snapshots"
on public.financial_health_snapshots for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own financial health snapshots" on public.financial_health_snapshots;
create policy "users can insert own financial health snapshots"
on public.financial_health_snapshots for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own financial health snapshots" on public.financial_health_snapshots;
create policy "users can update own financial health snapshots"
on public.financial_health_snapshots for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own financial health snapshots" on public.financial_health_snapshots;
create policy "users can delete own financial health snapshots"
on public.financial_health_snapshots for delete to authenticated
using (auth.uid() = user_id);

revoke all on table public.financial_health_snapshots from anon, authenticated;
grant select, insert, update, delete on table public.financial_health_snapshots to authenticated;

drop trigger if exists financial_health_snapshots_set_updated_at on public.financial_health_snapshots;
create trigger financial_health_snapshots_set_updated_at
before update on public.financial_health_snapshots
for each row execute function public.set_updated_at();
