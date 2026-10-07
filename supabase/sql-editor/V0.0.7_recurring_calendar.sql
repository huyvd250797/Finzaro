-- Finzaro V0.0.7 — Recurring Transactions & Financial Calendar
-- Run after 20261006170000_budget_engine.sql.

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null,
  title text not null,
  category_id uuid references public.categories(id) on delete restrict,
  from_account_id uuid references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  from_amount_minor bigint,
  to_amount_minor bigint,
  notes text,
  frequency text not null,
  interval_count smallint not null default 1,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_rules_type_check check (transaction_type in ('income', 'expense', 'transfer')),
  constraint recurring_rules_frequency_check check (frequency in ('weekly', 'monthly', 'yearly')),
  constraint recurring_rules_interval_check check (interval_count between 1 and 52),
  constraint recurring_rules_title_check check (char_length(btrim(title)) between 1 and 140),
  constraint recurring_rules_notes_check check (notes is null or char_length(notes) <= 500),
  constraint recurring_rules_end_after_start check (end_date is null or end_date >= start_date),
  constraint recurring_rules_amount_safe check (
    (from_amount_minor is null or (from_amount_minor > 0 and from_amount_minor <= 9007199254740991))
    and (to_amount_minor is null or (to_amount_minor > 0 and to_amount_minor <= 9007199254740991))
  )
);

create table if not exists public.recurring_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_rule_id uuid not null references public.recurring_rules(id) on delete cascade,
  due_date date not null,
  status text not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint recurring_occurrences_status_check check (status in ('paid', 'skipped')),
  constraint recurring_occurrences_rule_date_key unique (recurring_rule_id, due_date)
);

comment on table public.recurring_rules is 'Recurring income, expense and transfer templates introduced in Finzaro V0.0.7.';
comment on table public.recurring_occurrences is 'Completed or skipped projected recurring dates. Future schedule is projected from recurring_rules.';

create index if not exists recurring_rules_user_active_idx
  on public.recurring_rules (user_id, is_active, start_date);
create index if not exists recurring_occurrences_user_due_idx
  on public.recurring_occurrences (user_id, due_date desc);
create index if not exists recurring_occurrences_rule_idx
  on public.recurring_occurrences (recurring_rule_id, due_date desc);

alter table public.recurring_rules enable row level security;
alter table public.recurring_occurrences enable row level security;

drop policy if exists "users can read own recurring rules" on public.recurring_rules;
create policy "users can read own recurring rules"
on public.recurring_rules for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own recurring rules" on public.recurring_rules;
create policy "users can insert own recurring rules"
on public.recurring_rules for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update own recurring rules" on public.recurring_rules;
create policy "users can update own recurring rules"
on public.recurring_rules for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users can read own recurring occurrences" on public.recurring_occurrences;
create policy "users can read own recurring occurrences"
on public.recurring_occurrences for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.recurring_rules from anon, authenticated;
grant select on table public.recurring_rules to authenticated;
grant insert (user_id, transaction_type, title, category_id, from_account_id, to_account_id, from_amount_minor, to_amount_minor, notes, frequency, interval_count, start_date, end_date) on table public.recurring_rules to authenticated;
grant update (title, category_id, from_account_id, to_account_id, from_amount_minor, to_amount_minor, notes, frequency, interval_count, start_date, end_date, is_active) on table public.recurring_rules to authenticated;

revoke all on table public.recurring_occurrences from anon, authenticated;
grant select on table public.recurring_occurrences to authenticated;

drop trigger if exists recurring_rules_set_updated_at on public.recurring_rules;
create trigger recurring_rules_set_updated_at
before update on public.recurring_rules
for each row execute function public.set_updated_at();

create or replace function public.validate_recurring_rule_v007()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_category_type text;
  v_category_archived boolean;
  v_from_archived boolean;
  v_to_archived boolean;
begin
  if new.transaction_type in ('income', 'expense') then
    if new.category_id is null then
      raise exception 'Recurring income or expense requires a category.' using errcode = '22023';
    end if;
    select category_type, is_archived into v_category_type, v_category_archived
    from public.categories where id = new.category_id and user_id = new.user_id;
    if not found or v_category_type <> new.transaction_type then
      raise exception 'Recurring category does not match the transaction type.' using errcode = '22023';
    end if;
    if new.is_active and v_category_archived then
      raise exception 'Archived category cannot be used by an active recurring rule.' using errcode = '22023';
    end if;
  elsif new.category_id is not null then
    raise exception 'Recurring transfer does not use a category.' using errcode = '22023';
  end if;

  if new.transaction_type = 'income' then
    if new.to_account_id is null or new.to_amount_minor is null or new.from_account_id is not null or new.from_amount_minor is not null then
      raise exception 'Recurring income requires one destination account and amount.' using errcode = '22023';
    end if;
    select is_archived into v_to_archived from public.accounts where id = new.to_account_id and user_id = new.user_id;
    if not found then raise exception 'Recurring destination account was not found.' using errcode = '42501'; end if;
    if new.is_active and v_to_archived then raise exception 'Archived account cannot be used by an active recurring rule.' using errcode = '22023'; end if;
  elsif new.transaction_type = 'expense' then
    if new.from_account_id is null or new.from_amount_minor is null or new.to_account_id is not null or new.to_amount_minor is not null then
      raise exception 'Recurring expense requires one source account and amount.' using errcode = '22023';
    end if;
    select is_archived into v_from_archived from public.accounts where id = new.from_account_id and user_id = new.user_id;
    if not found then raise exception 'Recurring source account was not found.' using errcode = '42501'; end if;
    if new.is_active and v_from_archived then raise exception 'Archived account cannot be used by an active recurring rule.' using errcode = '22023'; end if;
  else
    if new.from_account_id is null or new.to_account_id is null or new.from_account_id = new.to_account_id
      or new.from_amount_minor is null or new.to_amount_minor is null then
      raise exception 'Recurring transfer requires two different accounts and both amounts.' using errcode = '22023';
    end if;
    select is_archived into v_from_archived from public.accounts where id = new.from_account_id and user_id = new.user_id;
    if not found then raise exception 'Recurring source account was not found.' using errcode = '42501'; end if;
    select is_archived into v_to_archived from public.accounts where id = new.to_account_id and user_id = new.user_id;
    if not found then raise exception 'Recurring destination account was not found.' using errcode = '42501'; end if;
    if new.is_active and (v_from_archived or v_to_archived) then
      raise exception 'Archived accounts cannot be used by an active recurring transfer.' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists recurring_rules_validate_v007 on public.recurring_rules;
create trigger recurring_rules_validate_v007
before insert or update on public.recurring_rules
for each row execute function public.validate_recurring_rule_v007();
revoke execute on function public.validate_recurring_rule_v007() from public, anon, authenticated;

-- Keep active recurring rules from silently becoming invalid when a dependency is archived.
create or replace function public.guard_category_recurring_archive_v007()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_archived = true and old.is_archived = false and exists (
    select 1 from public.recurring_rules r
    where r.user_id = new.user_id and r.category_id = new.id and r.is_active = true
  ) then
    raise exception 'Pause recurring rules before archiving this category.' using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists categories_guard_recurring_archive_v007 on public.categories;
create trigger categories_guard_recurring_archive_v007
before update of is_archived on public.categories
for each row execute function public.guard_category_recurring_archive_v007();
revoke execute on function public.guard_category_recurring_archive_v007() from public, anon, authenticated;

create or replace function public.guard_account_recurring_archive_v007()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_archived = true and old.is_archived = false and exists (
    select 1 from public.recurring_rules r
    where r.user_id = new.user_id
      and r.is_active = true
      and (r.from_account_id = new.id or r.to_account_id = new.id)
  ) then
    raise exception 'Pause recurring rules before archiving this account.' using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_guard_recurring_archive_v007 on public.accounts;
create trigger accounts_guard_recurring_archive_v007
before update of is_archived on public.accounts
for each row execute function public.guard_account_recurring_archive_v007();
revoke execute on function public.guard_account_recurring_archive_v007() from public, anon, authenticated;


-- Validate that a requested occurrence date is an actual projected date for the rule.
-- This prevents a client from calling the posting RPC with an arbitrary in-range date.
create or replace function public.is_recurring_due_date_v007(
  p_frequency text,
  p_interval_count integer,
  p_start_date date,
  p_due_date date
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_day_diff integer;
  v_month_diff integer;
  v_year_diff integer;
  v_anchor_day integer := extract(day from p_start_date)::integer;
  v_due_last_day integer := extract(day from (date_trunc('month', p_due_date::timestamp) + interval '1 month - 1 day'))::integer;
begin
  if p_interval_count < 1 or p_due_date < p_start_date then
    return false;
  end if;

  if p_frequency = 'weekly' then
    v_day_diff := p_due_date - p_start_date;
    return mod(v_day_diff, p_interval_count * 7) = 0;
  elsif p_frequency = 'monthly' then
    v_month_diff :=
      (extract(year from p_due_date)::integer * 12 + extract(month from p_due_date)::integer)
      - (extract(year from p_start_date)::integer * 12 + extract(month from p_start_date)::integer);
    return v_month_diff >= 0
      and mod(v_month_diff, p_interval_count) = 0
      and extract(day from p_due_date)::integer = least(v_anchor_day, v_due_last_day);
  elsif p_frequency = 'yearly' then
    v_year_diff := extract(year from p_due_date)::integer - extract(year from p_start_date)::integer;
    return v_year_diff >= 0
      and mod(v_year_diff, p_interval_count) = 0
      and extract(month from p_due_date)::integer = extract(month from p_start_date)::integer
      and extract(day from p_due_date)::integer = least(v_anchor_day, v_due_last_day);
  end if;

  return false;
end;
$$;

revoke execute on function public.is_recurring_due_date_v007(text, integer, date, date) from public, anon, authenticated;

create or replace function public.post_recurring_occurrence_v007(
  p_rule_id uuid,
  p_due_date date,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rule public.recurring_rules%rowtype;
  v_transaction_id uuid;
  v_occurrence_id uuid;
  v_status text := lower(btrim(coalesce(p_status, '')));
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if v_status not in ('paid', 'skipped') then
    raise exception 'Recurring occurrence status must be paid or skipped.' using errcode = '22023';
  end if;
  if p_due_date is null then
    raise exception 'Recurring due date is required.' using errcode = '22023';
  end if;

  select * into v_rule
  from public.recurring_rules
  where id = p_rule_id and user_id = v_user_id
  for update;

  if not found then raise exception 'Recurring rule was not found.' using errcode = '42501'; end if;
  if not v_rule.is_active then
    raise exception 'Recurring rule is paused.' using errcode = '22023';
  end if;
  if p_due_date < v_rule.start_date or (v_rule.end_date is not null and p_due_date > v_rule.end_date)
     or not public.is_recurring_due_date_v007(v_rule.frequency, v_rule.interval_count, v_rule.start_date, p_due_date) then
    raise exception 'Recurring due date is outside the rule schedule.' using errcode = '22023';
  end if;
  if exists (select 1 from public.recurring_occurrences where recurring_rule_id = p_rule_id and due_date = p_due_date) then
    raise exception 'Recurring occurrence is already completed or skipped.' using errcode = '23505';
  end if;

  if v_status = 'paid' then
    v_transaction_id := public.create_financial_transaction_v005(
      v_rule.transaction_type,
      v_rule.title,
      v_rule.category_id,
      v_rule.notes,
      p_due_date,
      v_rule.from_account_id,
      v_rule.to_account_id,
      v_rule.from_amount_minor,
      v_rule.to_amount_minor
    );
  end if;

  insert into public.recurring_occurrences (user_id, recurring_rule_id, due_date, status, transaction_id)
  values (v_user_id, p_rule_id, p_due_date, v_status, v_transaction_id)
  returning id into v_occurrence_id;

  return v_occurrence_id;
end;
$$;

create or replace function public.undo_recurring_occurrence_v007(p_occurrence_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_occurrence public.recurring_occurrences%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into v_occurrence from public.recurring_occurrences
  where id = p_occurrence_id and user_id = v_user_id for update;
  if not found then raise exception 'Recurring occurrence was not found.' using errcode = '42501'; end if;

  if v_occurrence.transaction_id is not null then
    perform public.delete_financial_transaction_v005(v_occurrence.transaction_id);
  end if;
  delete from public.recurring_occurrences where id = p_occurrence_id and user_id = v_user_id;
  return true;
end;
$$;

revoke execute on function public.post_recurring_occurrence_v007(uuid, date, text) from public, anon;
revoke execute on function public.undo_recurring_occurrence_v007(uuid) from public, anon;
grant execute on function public.post_recurring_occurrence_v007(uuid, date, text) to authenticated;
grant execute on function public.undo_recurring_occurrence_v007(uuid) to authenticated;
