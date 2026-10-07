-- Finzaro V0.0.9 — Savings Goals
-- Run after 20261006180000_recurring_calendar.sql.

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  currency_code text not null references public.supported_currencies(code),
  target_amount_minor bigint not null,
  target_date date,
  linked_account_id uuid references public.accounts(id) on delete set null,
  icon_name text not null default 'PiggyBank',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint savings_goals_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint savings_goals_description_check check (description is null or char_length(description) <= 500),
  constraint savings_goals_icon_check check (char_length(btrim(icon_name)) between 1 and 64),
  constraint savings_goals_target_amount_check check (target_amount_minor > 0 and target_amount_minor <= 9007199254740991)
);

create table if not exists public.savings_goal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  entry_type text not null,
  amount_minor bigint not null,
  entry_date date not null default current_date,
  transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint savings_goal_entries_type_check check (entry_type in ('contribution', 'withdrawal', 'adjustment')),
  constraint savings_goal_entries_amount_safe check (amount_minor <> 0 and amount_minor between -9007199254740991 and 9007199254740991),
  constraint savings_goal_entries_notes_check check (notes is null or char_length(notes) <= 500),
  constraint savings_goal_entries_sign_check check (
    (entry_type = 'contribution' and amount_minor > 0)
    or (entry_type = 'withdrawal' and amount_minor < 0)
    or (entry_type = 'adjustment' and amount_minor <> 0)
  )
);

comment on table public.savings_goals is 'User-owned savings goals introduced in Finzaro V0.0.9.';
comment on table public.savings_goal_entries is 'Immutable savings goal progress entries. Positive adds to progress, negative reduces it.';

create index if not exists savings_goals_user_archived_target_idx
  on public.savings_goals (user_id, is_archived, target_date);
create index if not exists savings_goal_entries_goal_date_idx
  on public.savings_goal_entries (goal_id, entry_date desc, created_at desc);
create index if not exists savings_goal_entries_user_date_idx
  on public.savings_goal_entries (user_id, entry_date desc);
create unique index if not exists savings_goal_entries_transaction_unique_idx
  on public.savings_goal_entries (transaction_id)
  where transaction_id is not null;

alter table public.savings_goals enable row level security;
alter table public.savings_goal_entries enable row level security;

drop policy if exists "users can read own savings goals" on public.savings_goals;
create policy "users can read own savings goals"
on public.savings_goals for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own savings goals" on public.savings_goals;
create policy "users can insert own savings goals"
on public.savings_goals for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update own savings goals" on public.savings_goals;
create policy "users can update own savings goals"
on public.savings_goals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users can read own savings goal entries" on public.savings_goal_entries;
create policy "users can read own savings goal entries"
on public.savings_goal_entries for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own savings goal entries" on public.savings_goal_entries;
create policy "users can insert own savings goal entries"
on public.savings_goal_entries for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can delete own savings goal entries" on public.savings_goal_entries;
create policy "users can delete own savings goal entries"
on public.savings_goal_entries for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.savings_goals from anon, authenticated;
grant select on table public.savings_goals to authenticated;
grant insert (user_id, name, description, currency_code, target_amount_minor, target_date, linked_account_id, icon_name) on table public.savings_goals to authenticated;
grant update (name, description, target_amount_minor, target_date, linked_account_id, icon_name, is_archived) on table public.savings_goals to authenticated;

revoke all on table public.savings_goal_entries from anon, authenticated;
grant select on table public.savings_goal_entries to authenticated;
grant insert (user_id, goal_id, entry_type, amount_minor, entry_date, transaction_id, notes) on table public.savings_goal_entries to authenticated;
grant delete on table public.savings_goal_entries to authenticated;

drop trigger if exists savings_goals_set_updated_at on public.savings_goals;
create trigger savings_goals_set_updated_at
before update on public.savings_goals
for each row execute function public.set_updated_at();

create or replace function public.validate_savings_goal_v009()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_account_currency text;
  v_account_archived boolean;
begin
  if new.linked_account_id is not null then
    select currency_code, is_archived
      into v_account_currency, v_account_archived
    from public.accounts
    where id = new.linked_account_id and user_id = new.user_id;

    if not found then
      raise exception 'Linked savings account was not found.' using errcode = '42501';
    end if;
    if v_account_currency <> new.currency_code then
      raise exception 'Savings goal currency must match the linked account currency.' using errcode = '22023';
    end if;
    if not new.is_archived and v_account_archived then
      raise exception 'Archived account cannot be linked to an active savings goal.' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists savings_goals_validate_v009 on public.savings_goals;
create trigger savings_goals_validate_v009
before insert or update on public.savings_goals
for each row execute function public.validate_savings_goal_v009();
revoke execute on function public.validate_savings_goal_v009() from public, anon, authenticated;

create or replace function public.validate_savings_goal_entry_v009()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_goal public.savings_goals%rowtype;
  v_matching_amount bigint;
  v_current_amount bigint;
begin
  select * into v_goal
  from public.savings_goals
  where id = new.goal_id and user_id = new.user_id;

  if not found then
    raise exception 'Savings goal was not found.' using errcode = '42501';
  end if;
  if v_goal.is_archived then
    raise exception 'Archived savings goal cannot receive new entries.' using errcode = '22023';
  end if;

  select coalesce(sum(amount_minor), 0) into v_current_amount
  from public.savings_goal_entries
  where goal_id = new.goal_id and user_id = new.user_id;

  if v_current_amount + new.amount_minor < 0 then
    raise exception 'Savings goal progress cannot become negative.' using errcode = '22023';
  end if;

  if new.transaction_id is not null then
    if new.entry_type = 'adjustment' then
      raise exception 'Manual adjustment cannot be linked to a ledger transaction.' using errcode = '22023';
    end if;

    select max(abs(te.amount_minor))
      into v_matching_amount
    from public.transaction_entries te
    join public.transactions t on t.id = te.transaction_id
    where t.id = new.transaction_id
      and t.user_id = new.user_id
      and te.user_id = new.user_id
      and te.currency_code = v_goal.currency_code
      and (v_goal.linked_account_id is null or te.account_id = v_goal.linked_account_id)
      and (
        (new.entry_type = 'contribution' and te.amount_minor > 0)
        or (new.entry_type = 'withdrawal' and te.amount_minor < 0)
      );

    if v_matching_amount is null then
      raise exception 'Linked transaction does not match this goal currency/account/direction.' using errcode = '22023';
    end if;
    if abs(new.amount_minor) > v_matching_amount then
      raise exception 'Goal entry cannot exceed the linked ledger amount.' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists savings_goal_entries_validate_v009 on public.savings_goal_entries;
create trigger savings_goal_entries_validate_v009
before insert on public.savings_goal_entries
for each row execute function public.validate_savings_goal_entry_v009();
revoke execute on function public.validate_savings_goal_entry_v009() from public, anon, authenticated;
create or replace function public.guard_savings_goal_entry_delete_v009()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_total bigint;
begin
  select coalesce(sum(amount_minor), 0) into v_total
  from public.savings_goal_entries
  where goal_id = old.goal_id and user_id = old.user_id;

  if v_total - old.amount_minor < 0 then
    raise exception 'Deleting this entry would make savings goal progress negative.' using errcode = '22023';
  end if;
  return old;
end;
$$;

drop trigger if exists savings_goal_entries_guard_delete_v009 on public.savings_goal_entries;
create trigger savings_goal_entries_guard_delete_v009
before delete on public.savings_goal_entries
for each row execute function public.guard_savings_goal_entry_delete_v009();
revoke execute on function public.guard_savings_goal_entry_delete_v009() from public, anon, authenticated;
