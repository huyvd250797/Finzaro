-- Finzaro V0.0.5 — Category Engine
-- Run after 20261006150000_transaction_core.sql.
-- Adds user-owned structured categories, icon metadata, hierarchy, migration of V0.0.4 labels,
-- and a category-aware transaction RPC while retaining category_label as an immutable snapshot.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category_type text not null,
  parent_id uuid,
  icon_name text not null default 'Shapes',
  system_key text,
  is_system boolean not null default false,
  is_archived boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_length check (char_length(name) between 1 and 80),
  constraint categories_type_allowed check (category_type in ('income', 'expense')),
  constraint categories_icon_length check (char_length(icon_name) between 1 and 64),
  constraint categories_icon_allowed check (icon_name in ('Shapes','Briefcase','Gift','Laptop','Store','TrendingUp','RotateCcw','CircleDollarSign','Utensils','Home','Car','ShoppingBag','ReceiptText','HeartPulse','GraduationCap','Gamepad2','Users','MoreHorizontal','Coffee','Plane','Bus','Fuel','Baby','PawPrint','Shirt','Smartphone','Wifi','Dumbbell','Stethoscope','BookOpen','Film','Music','Landmark','WalletCards','PiggyBank')),
  constraint categories_system_key_length check (system_key is null or char_length(system_key) between 1 and 64),
  constraint categories_no_self_parent check (parent_id is null or parent_id <> id),
  constraint categories_id_user_unique unique (id, user_id)
);

comment on table public.categories is 'User-owned income/expense categories introduced in Finzaro V0.0.5.';
comment on column public.categories.icon_name is 'Allow-listed Lucide icon key rendered by the Finzaro client.';
comment on column public.categories.system_key is 'Stable key for default categories; custom categories keep this null.';

-- Composite ownership FK prevents a user category from referencing another user's parent.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_parent_owner_fkey'
  ) then
    alter table public.categories
      add constraint categories_parent_owner_fkey
      foreign key (parent_id, user_id)
      references public.categories(id, user_id)
      on delete cascade;
  end if;
end;
$$;

create unique index if not exists categories_user_system_key_unique
  on public.categories (user_id, system_key)
  where system_key is not null;

create unique index if not exists categories_user_root_name_unique
  on public.categories (user_id, category_type, lower(name))
  where parent_id is null and is_archived = false;

create index if not exists categories_user_type_active_idx
  on public.categories (user_id, category_type, is_archived, sort_order, name);
create unique index if not exists categories_user_child_name_unique
  on public.categories (user_id, parent_id, lower(name))
  where parent_id is not null and is_archived = false;

create index if not exists categories_parent_idx
  on public.categories (parent_id, sort_order, name)
  where parent_id is not null;

alter table public.categories enable row level security;

drop policy if exists "users can read own categories" on public.categories;
create policy "users can read own categories"
on public.categories
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own categories" on public.categories;
create policy "users can insert own categories"
on public.categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update own categories" on public.categories;
create policy "users can update own categories"
on public.categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Categories are archived rather than hard-deleted so transaction history remains stable.
revoke all on table public.categories from anon, authenticated;
grant select on table public.categories to authenticated;
grant insert (user_id, name, category_type, parent_id, icon_name) on table public.categories to authenticated;
grant update (name, parent_id, icon_name, is_archived, sort_order) on table public.categories to authenticated;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create or replace function public.validate_category_parent_v005()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent_type text;
  v_parent_archived boolean;
begin
  if new.parent_id is null then
    return new;
  end if;

  select category_type, is_archived
  into v_parent_type, v_parent_archived
  from public.categories
  where id = new.parent_id and user_id = new.user_id;

  if not found then
    raise exception 'Parent category was not found.' using errcode = '23503';
  end if;
  if v_parent_type <> new.category_type then
    raise exception 'Parent category must use the same type.' using errcode = '22023';
  end if;
  if not new.is_archived and v_parent_archived then
    raise exception 'Archived category cannot be used as a parent for an active category.' using errcode = '22023';
  end if;

  if new.is_archived and exists (
    select 1 from public.categories child
    where child.parent_id = new.id and child.user_id = new.user_id and child.is_archived = false
  ) then
    raise exception 'Archive active child categories first.' using errcode = '22023';
  end if;

  if exists (
    with recursive ancestors as (
      select id, parent_id
      from public.categories
      where id = new.parent_id and user_id = new.user_id
      union all
      select c.id, c.parent_id
      from public.categories c
      join ancestors a on c.id = a.parent_id
      where c.user_id = new.user_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'Category hierarchy cannot contain a cycle.' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists categories_validate_parent_v005 on public.categories;
create trigger categories_validate_parent_v005
before insert or update of parent_id, is_archived on public.categories
for each row execute function public.validate_category_parent_v005();

revoke execute on function public.validate_category_parent_v005() from public, anon, authenticated;

create or replace function public.ensure_default_categories_v005(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (user_id, name, category_type, icon_name, system_key, is_system, sort_order)
  values
    (p_user_id, 'Lương', 'income', 'Briefcase', 'income_salary', true, 10),
    (p_user_id, 'Thưởng', 'income', 'Gift', 'income_bonus', true, 20),
    (p_user_id, 'Freelance', 'income', 'Laptop', 'income_freelance', true, 30),
    (p_user_id, 'Kinh doanh', 'income', 'Store', 'income_business', true, 40),
    (p_user_id, 'Lãi / cổ tức', 'income', 'TrendingUp', 'income_interest', true, 50),
    (p_user_id, 'Hoàn tiền', 'income', 'RotateCcw', 'income_refund', true, 60),
    (p_user_id, 'Thu nhập khác', 'income', 'CircleDollarSign', 'income_other', true, 999),
    (p_user_id, 'Ăn uống', 'expense', 'Utensils', 'expense_food', true, 10),
    (p_user_id, 'Nhà ở', 'expense', 'Home', 'expense_home', true, 20),
    (p_user_id, 'Di chuyển', 'expense', 'Car', 'expense_transport', true, 30),
    (p_user_id, 'Mua sắm', 'expense', 'ShoppingBag', 'expense_shopping', true, 40),
    (p_user_id, 'Hóa đơn', 'expense', 'ReceiptText', 'expense_bills', true, 50),
    (p_user_id, 'Sức khỏe', 'expense', 'HeartPulse', 'expense_health', true, 60),
    (p_user_id, 'Giáo dục', 'expense', 'GraduationCap', 'expense_education', true, 70),
    (p_user_id, 'Giải trí', 'expense', 'Gamepad2', 'expense_entertainment', true, 80),
    (p_user_id, 'Gia đình', 'expense', 'Users', 'expense_family', true, 90),
    (p_user_id, 'Chi tiêu khác', 'expense', 'MoreHorizontal', 'expense_other', true, 999)
  on conflict (user_id, system_key) where system_key is not null do nothing;
end;
$$;

revoke execute on function public.ensure_default_categories_v005(uuid) from public, anon, authenticated;

-- Seed defaults for all existing Finzaro users.
do $$
declare
  v_user record;
begin
  for v_user in select id from auth.users loop
    perform public.ensure_default_categories_v005(v_user.id);
  end loop;
end;
$$;

-- Extend signup lifecycle so every future user receives the same default categories.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(nullif(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''), ''), 100)
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (id)
  values (new.id)
  on conflict (id) do nothing;

  perform public.ensure_default_categories_v005(new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Keep V0.0.4 text snapshot, but add a structured category relation.
alter table public.transactions
  add column if not exists category_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_category_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_category_id_fkey
      foreign key (category_id)
      references public.categories(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists transactions_user_category_date_idx
  on public.transactions (user_id, category_id, transaction_date desc)
  where category_id is not null;

comment on column public.transactions.category_id is 'Structured Category Engine relation. category_label remains a historical display snapshot.';

-- Migrate existing V0.0.4 free-text categories. Known labels map to seeded defaults;
-- unknown labels become user-owned custom root categories.
insert into public.categories (user_id, name, category_type, icon_name, is_system, sort_order)
select
  t.user_id,
  min(btrim(t.category_label)) as name,
  t.transaction_type,
  'Shapes',
  false,
  500
from public.transactions t
where t.transaction_type in ('income', 'expense')
  and t.category_id is null
  and t.category_label is not null
  and btrim(t.category_label) <> ''
  and not exists (
    select 1
    from public.categories c
    where c.user_id = t.user_id
      and c.category_type = t.transaction_type
      and lower(c.name) = lower(btrim(t.category_label))
      and c.parent_id is null
      and c.is_archived = false
  )
group by t.user_id, t.transaction_type, lower(btrim(t.category_label));

update public.transactions t
set category_id = c.id
from public.categories c
where t.category_id is null
  and t.transaction_type in ('income', 'expense')
  and t.category_label is not null
  and c.user_id = t.user_id
  and c.category_type = t.transaction_type
  and lower(c.name) = lower(btrim(t.category_label))
  and c.parent_id is null
  and c.is_archived = false;

create or replace function public.create_financial_transaction_v005(
  p_transaction_type text,
  p_title text,
  p_category_id uuid default null,
  p_notes text default null,
  p_transaction_date date default current_date,
  p_from_account_id uuid default null,
  p_to_account_id uuid default null,
  p_from_amount_minor bigint default null,
  p_to_amount_minor bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tx_id uuid;
  v_from_currency text;
  v_to_currency text;
  v_from_archived boolean;
  v_to_archived boolean;
  v_type text := lower(btrim(coalesce(p_transaction_type, '')));
  v_title text := btrim(coalesce(p_title, ''));
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_category_name text;
  v_category_type text;
  v_category_archived boolean;
  v_limit bigint := 9007199254740991;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if v_type not in ('income', 'expense', 'transfer') then
    raise exception 'Invalid transaction type.' using errcode = '22023';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 140 then
    raise exception 'Transaction title must be between 1 and 140 characters.' using errcode = '22023';
  end if;
  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'Notes are too long.' using errcode = '22023';
  end if;
  if p_transaction_date is null then
    raise exception 'Transaction date is required.' using errcode = '22023';
  end if;

  if v_type in ('income', 'expense') then
    if p_category_id is null then
      raise exception 'Category is required.' using errcode = '22023';
    end if;
    select name, category_type, is_archived
    into v_category_name, v_category_type, v_category_archived
    from public.categories
    where id = p_category_id and user_id = v_user_id;

    if not found then
      raise exception 'Category was not found.' using errcode = '42501';
    end if;
    if v_category_archived then
      raise exception 'Archived category cannot be used for a new transaction.' using errcode = '22023';
    end if;
    if v_category_type <> v_type then
      raise exception 'Category type does not match transaction type.' using errcode = '22023';
    end if;
  elsif p_category_id is not null then
    raise exception 'Transfer does not use a category.' using errcode = '22023';
  end if;

  if v_type = 'income' then
    if p_to_account_id is null or p_to_amount_minor is null or p_to_amount_minor <= 0 or p_to_amount_minor > v_limit then
      raise exception 'A valid destination account and positive amount are required.' using errcode = '22023';
    end if;

    perform 1 from public.accounts where id = p_to_account_id and user_id = v_user_id for update;
    if not found then
      raise exception 'Destination account was not found.' using errcode = '42501';
    end if;
    select currency_code, is_archived into v_to_currency, v_to_archived
    from public.accounts where id = p_to_account_id and user_id = v_user_id;
    if v_to_archived then
      raise exception 'Archived accounts cannot receive new transactions.' using errcode = '22023';
    end if;

    insert into public.transactions (user_id, transaction_type, title, category_id, category_label, notes, transaction_date)
    values (v_user_id, v_type, v_title, p_category_id, v_category_name, v_notes, p_transaction_date)
    returning id into v_tx_id;

    insert into public.transaction_entries (transaction_id, user_id, account_id, currency_code, amount_minor, entry_role)
    values (v_tx_id, v_user_id, p_to_account_id, v_to_currency, p_to_amount_minor, 'income');

    update public.accounts
    set current_balance_minor = current_balance_minor + p_to_amount_minor, updated_at = now()
    where id = p_to_account_id and user_id = v_user_id;

  elsif v_type = 'expense' then
    if p_from_account_id is null or p_from_amount_minor is null or p_from_amount_minor <= 0 or p_from_amount_minor > v_limit then
      raise exception 'A valid source account and positive amount are required.' using errcode = '22023';
    end if;

    perform 1 from public.accounts where id = p_from_account_id and user_id = v_user_id for update;
    if not found then
      raise exception 'Source account was not found.' using errcode = '42501';
    end if;
    select currency_code, is_archived into v_from_currency, v_from_archived
    from public.accounts where id = p_from_account_id and user_id = v_user_id;
    if v_from_archived then
      raise exception 'Archived accounts cannot create new transactions.' using errcode = '22023';
    end if;

    insert into public.transactions (user_id, transaction_type, title, category_id, category_label, notes, transaction_date)
    values (v_user_id, v_type, v_title, p_category_id, v_category_name, v_notes, p_transaction_date)
    returning id into v_tx_id;

    insert into public.transaction_entries (transaction_id, user_id, account_id, currency_code, amount_minor, entry_role)
    values (v_tx_id, v_user_id, p_from_account_id, v_from_currency, -p_from_amount_minor, 'expense');

    update public.accounts
    set current_balance_minor = current_balance_minor - p_from_amount_minor, updated_at = now()
    where id = p_from_account_id and user_id = v_user_id;

  else
    if p_from_account_id is null or p_to_account_id is null or p_from_account_id = p_to_account_id then
      raise exception 'Transfer requires two different accounts.' using errcode = '22023';
    end if;
    if p_from_amount_minor is null or p_to_amount_minor is null
       or p_from_amount_minor <= 0 or p_to_amount_minor <= 0
       or p_from_amount_minor > v_limit or p_to_amount_minor > v_limit then
      raise exception 'Transfer amounts must be positive and valid.' using errcode = '22023';
    end if;

    perform 1
    from public.accounts
    where id in (p_from_account_id, p_to_account_id) and user_id = v_user_id
    order by id
    for update;

    if (select count(*) from public.accounts where id in (p_from_account_id, p_to_account_id) and user_id = v_user_id) <> 2 then
      raise exception 'One or more transfer accounts were not found.' using errcode = '42501';
    end if;

    select currency_code, is_archived into v_from_currency, v_from_archived
    from public.accounts where id = p_from_account_id and user_id = v_user_id;
    select currency_code, is_archived into v_to_currency, v_to_archived
    from public.accounts where id = p_to_account_id and user_id = v_user_id;
    if v_from_archived or v_to_archived then
      raise exception 'Archived accounts cannot be used for transfers.' using errcode = '22023';
    end if;

    insert into public.transactions (user_id, transaction_type, title, category_id, category_label, notes, transaction_date)
    values (v_user_id, v_type, v_title, null, 'Chuyển tiền', v_notes, p_transaction_date)
    returning id into v_tx_id;

    insert into public.transaction_entries (transaction_id, user_id, account_id, currency_code, amount_minor, entry_role)
    values
      (v_tx_id, v_user_id, p_from_account_id, v_from_currency, -p_from_amount_minor, 'transfer_out'),
      (v_tx_id, v_user_id, p_to_account_id, v_to_currency, p_to_amount_minor, 'transfer_in');

    update public.accounts
    set current_balance_minor = current_balance_minor - p_from_amount_minor, updated_at = now()
    where id = p_from_account_id and user_id = v_user_id;
    update public.accounts
    set current_balance_minor = current_balance_minor + p_to_amount_minor, updated_at = now()
    where id = p_to_account_id and user_id = v_user_id;
  end if;

  return v_tx_id;
end;
$$;

create or replace function public.delete_financial_transaction_v005(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry record;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.transactions where id = p_transaction_id and user_id = v_user_id) then
    raise exception 'Transaction was not found.' using errcode = '42501';
  end if;

  perform 1
  from public.accounts
  where id in (
    select account_id from public.transaction_entries
    where transaction_id = p_transaction_id and user_id = v_user_id
  )
  order by id
  for update;

  for v_entry in
    select account_id, amount_minor
    from public.transaction_entries
    where transaction_id = p_transaction_id and user_id = v_user_id
    order by account_id
  loop
    update public.accounts
    set current_balance_minor = current_balance_minor - v_entry.amount_minor, updated_at = now()
    where id = v_entry.account_id and user_id = v_user_id;
  end loop;

  delete from public.transactions where id = p_transaction_id and user_id = v_user_id;
  return true;
end;
$$;

-- Retire client access to the old V0.0.4 write RPC so new writes cannot bypass Category Engine.
revoke execute on function public.create_financial_transaction_v004(text, text, text, text, date, uuid, uuid, bigint, bigint) from authenticated;
revoke execute on function public.delete_financial_transaction_v004(uuid) from authenticated;
revoke execute on function public.create_financial_transaction_v005(text, text, uuid, text, date, uuid, uuid, bigint, bigint) from public, anon;
revoke execute on function public.delete_financial_transaction_v005(uuid) from public, anon;
grant execute on function public.create_financial_transaction_v005(text, text, uuid, text, date, uuid, uuid, bigint, bigint) to authenticated;
grant execute on function public.delete_financial_transaction_v005(uuid) to authenticated;
