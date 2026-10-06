-- Finzaro V0.0.6 — Budget Engine
-- Run after 20261006160000_category_engine.sql.
-- Budgets are monthly, category-scoped and currency-specific. Actual spending is
-- derived from immutable Expense ledger entries in the application layer.

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  month_start date not null,
  currency_code text not null references public.supported_currencies(code),
  amount_minor bigint not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_month_first_day check (month_start = date_trunc('month', month_start)::date),
  constraint budgets_positive_amount check (amount_minor > 0),
  constraint budgets_safe_amount check (amount_minor <= 9007199254740991),
  constraint budgets_user_category_month_currency_key unique (user_id, category_id, month_start, currency_code)
);

comment on table public.budgets is 'Monthly category budgets introduced in Finzaro V0.0.6. Actual spending is derived from Transaction Core ledger data.';
comment on column public.budgets.currency_code is 'Budget currency. Expenses in other currencies are intentionally excluded until an FX conversion engine exists.';
comment on column public.budgets.month_start is 'First calendar day of the budget month.';

create index if not exists budgets_user_month_idx
  on public.budgets (user_id, month_start desc, currency_code)
  where is_archived = false;
create index if not exists budgets_category_idx
  on public.budgets (category_id, month_start desc);

alter table public.budgets enable row level security;

drop policy if exists "users can read own budgets" on public.budgets;
create policy "users can read own budgets"
on public.budgets
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own budgets" on public.budgets;
create policy "users can insert own budgets"
on public.budgets
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update own budgets" on public.budgets;
create policy "users can update own budgets"
on public.budgets
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.budgets from anon, authenticated;
grant select on table public.budgets to authenticated;
grant insert (user_id, category_id, month_start, currency_code, amount_minor) on table public.budgets to authenticated;
grant update (amount_minor, is_archived) on table public.budgets to authenticated;

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

-- Enforce domain rules in the database, not only in the UI:
-- 1) category must belong to the authenticated owner and be an Expense category;
-- 2) active budgets cannot target archived categories;
-- 3) one active budget scope cannot overlap an ancestor/descendant budget in the
--    same month + currency, preventing double-counted budget progress.
create or replace function public.validate_budget_v006()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_category_type text;
  v_category_archived boolean;
  v_overlap boolean;
begin
  select category_type, is_archived
  into v_category_type, v_category_archived
  from public.categories
  where id = new.category_id and user_id = new.user_id;

  if not found or v_category_type <> 'expense' then
    raise exception 'Budget requires an expense category owned by the user.' using errcode = '22023';
  end if;

  if new.is_archived = false and v_category_archived then
    raise exception 'Active budget cannot use an archived expense category.' using errcode = '22023';
  end if;

  if new.is_archived = false then
    with recursive
    ancestors as (
      select id, parent_id
      from public.categories
      where id = new.category_id and user_id = new.user_id
      union all
      select c.id, c.parent_id
      from public.categories c
      join ancestors a on c.id = a.parent_id
      where c.user_id = new.user_id
    ),
    descendants as (
      select id
      from public.categories
      where id = new.category_id and user_id = new.user_id
      union all
      select c.id
      from public.categories c
      join descendants d on c.parent_id = d.id
      where c.user_id = new.user_id
    ),
    scope as (
      select id from ancestors
      union
      select id from descendants
    )
    select exists (
      select 1
      from public.budgets b
      where b.user_id = new.user_id
        and b.month_start = new.month_start
        and b.currency_code = new.currency_code
        and b.is_archived = false
        and b.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
        and b.category_id in (select id from scope)
    ) into v_overlap;

    if v_overlap then
      raise exception 'Budget scope overlap: ancestor or descendant category already has an active budget for this month and currency.' using errcode = '23505';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists budgets_validate_v006 on public.budgets;
create trigger budgets_validate_v006
before insert or update of category_id, month_start, currency_code, is_archived
on public.budgets
for each row execute function public.validate_budget_v006();

revoke execute on function public.validate_budget_v006() from public, anon, authenticated;

-- A hierarchy move can create an overlap after budgets already exist. Guard category
-- re-parenting as well so the no-double-count invariant remains true over time.
create or replace function public.validate_category_budget_hierarchy_v006()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_overlap boolean;
begin
  if new.parent_id is not distinct from old.parent_id or new.parent_id is null then
    return new;
  end if;

  with recursive
  moved_scope as (
    select id
    from public.categories
    where id = new.id and user_id = new.user_id
    union all
    select c.id
    from public.categories c
    join moved_scope m on c.parent_id = m.id
    where c.user_id = new.user_id
  ),
  new_ancestors as (
    select id, parent_id
    from public.categories
    where id = new.parent_id and user_id = new.user_id
    union all
    select c.id, c.parent_id
    from public.categories c
    join new_ancestors a on c.id = a.parent_id
    where c.user_id = new.user_id
  )
  select exists (
    select 1
    from public.budgets moved_budget
    join public.budgets ancestor_budget
      on ancestor_budget.user_id = moved_budget.user_id
     and ancestor_budget.month_start = moved_budget.month_start
     and ancestor_budget.currency_code = moved_budget.currency_code
     and ancestor_budget.is_archived = false
    where moved_budget.user_id = new.user_id
      and moved_budget.is_archived = false
      and moved_budget.category_id in (select id from moved_scope)
      and ancestor_budget.category_id in (select id from new_ancestors)
  ) into v_overlap;

  if v_overlap then
    raise exception 'Category move would create overlapping active budgets. Archive or adjust the conflicting budget first.' using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists categories_validate_budget_hierarchy_v006 on public.categories;
create trigger categories_validate_budget_hierarchy_v006
before update of parent_id on public.categories
for each row execute function public.validate_category_budget_hierarchy_v006();

revoke execute on function public.validate_category_budget_hierarchy_v006() from public, anon, authenticated;

