-- Finzaro V0.5.0 — Financial Goals Planner

create table if not exists public.financial_goal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_code text not null references public.supported_currencies(code),
  monthly_available_minor bigint not null default 0 check (monthly_available_minor >= 0),
  strategy text not null default 'priority' check (strategy in ('priority', 'balanced')),
  notes text null check (char_length(notes) <= 1000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint financial_goal_plans_user_currency_unique unique (user_id, currency_code)
);

create table if not exists public.financial_goal_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.financial_goal_plans(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  priority integer not null default 1 check (priority between 1 and 999),
  monthly_allocation_minor bigint not null default 0 check (monthly_allocation_minor >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint financial_goal_allocations_plan_goal_unique unique (plan_id, goal_id)
);

create index if not exists financial_goal_plans_user_currency_idx
  on public.financial_goal_plans (user_id, currency_code);
create index if not exists financial_goal_allocations_plan_priority_idx
  on public.financial_goal_allocations (plan_id, priority, created_at);
create index if not exists financial_goal_allocations_user_goal_idx
  on public.financial_goal_allocations (user_id, goal_id);

alter table public.financial_goal_plans enable row level security;
alter table public.financial_goal_allocations enable row level security;

revoke all on table public.financial_goal_plans from anon;
revoke all on table public.financial_goal_allocations from anon;
revoke all on table public.financial_goal_plans from authenticated;
revoke all on table public.financial_goal_allocations from authenticated;
grant select, insert, update, delete on table public.financial_goal_plans to authenticated;
grant select, insert, update, delete on table public.financial_goal_allocations to authenticated;

drop policy if exists "financial_goal_plans_select_own" on public.financial_goal_plans;
drop policy if exists "financial_goal_plans_insert_own" on public.financial_goal_plans;
drop policy if exists "financial_goal_plans_update_own" on public.financial_goal_plans;
drop policy if exists "financial_goal_plans_delete_own" on public.financial_goal_plans;
create policy "financial_goal_plans_select_own" on public.financial_goal_plans for select to authenticated using (auth.uid() = user_id);
create policy "financial_goal_plans_insert_own" on public.financial_goal_plans for insert to authenticated with check (auth.uid() = user_id);
create policy "financial_goal_plans_update_own" on public.financial_goal_plans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "financial_goal_plans_delete_own" on public.financial_goal_plans for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "financial_goal_allocations_select_own" on public.financial_goal_allocations;
drop policy if exists "financial_goal_allocations_insert_own" on public.financial_goal_allocations;
drop policy if exists "financial_goal_allocations_update_own" on public.financial_goal_allocations;
drop policy if exists "financial_goal_allocations_delete_own" on public.financial_goal_allocations;
create policy "financial_goal_allocations_select_own" on public.financial_goal_allocations for select to authenticated using (auth.uid() = user_id);
create policy "financial_goal_allocations_insert_own" on public.financial_goal_allocations for insert to authenticated with check (auth.uid() = user_id);
create policy "financial_goal_allocations_update_own" on public.financial_goal_allocations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "financial_goal_allocations_delete_own" on public.financial_goal_allocations for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_financial_goal_plans_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

drop trigger if exists set_financial_goal_plans_updated_at on public.financial_goal_plans;
create trigger set_financial_goal_plans_updated_at before update on public.financial_goal_plans
for each row execute function public.set_financial_goal_plans_updated_at();

create or replace function public.set_financial_goal_allocations_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

drop trigger if exists set_financial_goal_allocations_updated_at on public.financial_goal_allocations;
create trigger set_financial_goal_allocations_updated_at before update on public.financial_goal_allocations
for each row execute function public.set_financial_goal_allocations_updated_at();

create or replace function public.save_financial_goal_plan_v050(
  p_currency_code text,
  p_monthly_available_minor bigint,
  p_strategy text,
  p_notes text,
  p_allocations jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_total bigint := 0;
  v_item jsonb;
  v_goal_id uuid;
  v_priority integer;
  v_amount bigint;
  v_goal_currency text;
  v_goal_archived boolean;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_currency_code is null or char_length(trim(p_currency_code)) = 0 then raise exception 'Currency is required'; end if;
  if p_monthly_available_minor is null or p_monthly_available_minor < 0 then raise exception 'Monthly available amount is invalid'; end if;
  if p_strategy not in ('priority', 'balanced') then raise exception 'Invalid allocation strategy'; end if;
  if p_notes is not null and char_length(p_notes) > 1000 then raise exception 'Notes are too long'; end if;
  if jsonb_typeof(coalesce(p_allocations, '[]'::jsonb)) <> 'array' then raise exception 'Allocations must be an array'; end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) loop
    v_goal_id := nullif(v_item->>'goal_id', '')::uuid;
    v_priority := coalesce((v_item->>'priority')::integer, 999);
    v_amount := coalesce((v_item->>'monthly_allocation_minor')::bigint, 0);
    if v_goal_id is null or v_priority < 1 or v_priority > 999 or v_amount < 0 then raise exception 'Invalid goal allocation'; end if;

    select currency_code, is_archived into v_goal_currency, v_goal_archived
    from public.savings_goals
    where id = v_goal_id and user_id = v_user_id;
    if not found then raise exception 'Savings goal does not belong to current user'; end if;
    if v_goal_archived then raise exception 'Archived savings goal cannot be allocated'; end if;
    if v_goal_currency <> p_currency_code then raise exception 'Savings goal currency must match plan currency'; end if;
    v_total := v_total + v_amount;
  end loop;

  if v_total > p_monthly_available_minor then raise exception 'Total allocations exceed monthly available amount'; end if;

  insert into public.financial_goal_plans (user_id, currency_code, monthly_available_minor, strategy, notes)
  values (v_user_id, p_currency_code, p_monthly_available_minor, p_strategy, nullif(p_notes, ''))
  on conflict (user_id, currency_code) do update set
    monthly_available_minor = excluded.monthly_available_minor,
    strategy = excluded.strategy,
    notes = excluded.notes,
    updated_at = timezone('utc', now())
  returning id into v_plan_id;

  delete from public.financial_goal_allocations where plan_id = v_plan_id and user_id = v_user_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) loop
    v_goal_id := (v_item->>'goal_id')::uuid;
    v_priority := (v_item->>'priority')::integer;
    v_amount := (v_item->>'monthly_allocation_minor')::bigint;
    insert into public.financial_goal_allocations (user_id, plan_id, goal_id, priority, monthly_allocation_minor)
    values (v_user_id, v_plan_id, v_goal_id, v_priority, v_amount);
  end loop;

  return v_plan_id;
end;
$$;

revoke all on function public.save_financial_goal_plan_v050(text, bigint, text, text, jsonb) from public;
grant execute on function public.save_financial_goal_plan_v050(text, bigint, text, text, jsonb) to authenticated;
