-- Finzaro V0.0.4 — Transaction Core
-- Run after 20261006134500_account_core.sql.
-- Ledger writes are intentionally routed through authenticated database functions so
-- transaction rows and account balances change atomically in one database transaction.

-- Establish the V0.0.4 ledger baseline. Before this release, Account Core allowed
-- manual balance edits and wrote opening/current balance together. From this point on,
-- current_balance_minor becomes ledger-maintained.
do $$
begin
  -- Only establish the pre-ledger baseline the first time this release is applied.
  -- This makes the SQL Editor script safe to rerun after transactions already exist.
  if to_regclass('public.transactions') is null then
    update public.accounts
    set opening_balance_minor = current_balance_minor
    where opening_balance_minor <> current_balance_minor;
  end if;
end;
$$;

create or replace function public.enforce_account_opening_balance_v004()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.current_balance_minor := new.opening_balance_minor;
  return new;
end;
$$;

drop trigger if exists accounts_enforce_opening_balance_v004 on public.accounts;
create trigger accounts_enforce_opening_balance_v004
before insert on public.accounts
for each row execute function public.enforce_account_opening_balance_v004();

-- Account metadata remains editable, but normal API clients can no longer mutate
-- ledger-maintained balance/currency columns or hard-delete accounts.
revoke all on table public.accounts from anon, authenticated;
grant select, insert on table public.accounts to authenticated;
grant update (name, account_type, institution_name, is_archived) on table public.accounts to authenticated;

revoke execute on function public.enforce_account_opening_balance_v004() from public, anon, authenticated;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null,
  title text not null,
  category_label text,
  notes text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_type_allowed check (transaction_type in ('income', 'expense', 'transfer')),
  constraint transactions_title_length check (char_length(title) between 1 and 140),
  constraint transactions_category_length check (category_label is null or char_length(category_label) between 1 and 80),
  constraint transactions_notes_length check (notes is null or char_length(notes) <= 500)
);

create table if not exists public.transaction_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  currency_code text not null references public.supported_currencies(code),
  amount_minor bigint not null,
  entry_role text not null,
  created_at timestamptz not null default now(),
  constraint transaction_entries_non_zero check (amount_minor <> 0),
  constraint transaction_entries_safe_amount check (amount_minor between -9007199254740991 and 9007199254740991),
  constraint transaction_entries_role_allowed check (entry_role in ('income', 'expense', 'transfer_out', 'transfer_in')),
  constraint transaction_entries_role_unique unique (transaction_id, entry_role)
);

comment on table public.transactions is 'Immutable user-owned transaction headers introduced in Finzaro V0.0.4.';
comment on table public.transaction_entries is 'Signed account ledger entries. Positive increases balance; negative decreases balance.';
comment on column public.transactions.category_label is 'Free-text category snapshot for V0.0.4. V0.0.5 Category Engine will add structured categories.';

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc, created_at desc);
create index if not exists transactions_user_type_date_idx
  on public.transactions (user_id, transaction_type, transaction_date desc);
create index if not exists transaction_entries_transaction_idx
  on public.transaction_entries (transaction_id);
create index if not exists transaction_entries_account_idx
  on public.transaction_entries (account_id, created_at desc);
create index if not exists transaction_entries_user_idx
  on public.transaction_entries (user_id, created_at desc);

alter table public.transactions enable row level security;
alter table public.transaction_entries enable row level security;

drop policy if exists "users can read own transactions" on public.transactions;
create policy "users can read own transactions"
on public.transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can read own transaction entries" on public.transaction_entries;
create policy "users can read own transaction entries"
on public.transaction_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Direct ledger mutation is denied. Authenticated users can read their rows; writes
-- happen only through the SECURITY DEFINER functions below, which re-check ownership.
revoke all on table public.transactions from anon, authenticated;
revoke all on table public.transaction_entries from anon, authenticated;
grant select on table public.transactions to authenticated;
grant select on table public.transaction_entries to authenticated;

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create or replace function public.create_financial_transaction_v004(
  p_transaction_type text,
  p_title text,
  p_category_label text default null,
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
  v_category text := nullif(btrim(coalesce(p_category_label, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
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
  if v_category is not null and char_length(v_category) > 80 then
    raise exception 'Category is too long.' using errcode = '22023';
  end if;
  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'Notes are too long.' using errcode = '22023';
  end if;
  if p_transaction_date is null then
    raise exception 'Transaction date is required.' using errcode = '22023';
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

    insert into public.transactions (user_id, transaction_type, title, category_label, notes, transaction_date)
    values (v_user_id, v_type, v_title, coalesce(v_category, 'Thu nhập khác'), v_notes, p_transaction_date)
    returning id into v_tx_id;

    insert into public.transaction_entries (transaction_id, user_id, account_id, currency_code, amount_minor, entry_role)
    values (v_tx_id, v_user_id, p_to_account_id, v_to_currency, p_to_amount_minor, 'income');

    update public.accounts
    set current_balance_minor = current_balance_minor + p_to_amount_minor,
        updated_at = now()
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

    insert into public.transactions (user_id, transaction_type, title, category_label, notes, transaction_date)
    values (v_user_id, v_type, v_title, coalesce(v_category, 'Chi tiêu khác'), v_notes, p_transaction_date)
    returning id into v_tx_id;

    insert into public.transaction_entries (transaction_id, user_id, account_id, currency_code, amount_minor, entry_role)
    values (v_tx_id, v_user_id, p_from_account_id, v_from_currency, -p_from_amount_minor, 'expense');

    update public.accounts
    set current_balance_minor = current_balance_minor - p_from_amount_minor,
        updated_at = now()
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

    -- Lock both rows in deterministic order to avoid opposing-transfer deadlocks.
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

    insert into public.transactions (user_id, transaction_type, title, category_label, notes, transaction_date)
    values (v_user_id, v_type, v_title, 'Chuyển tiền', v_notes, p_transaction_date)
    returning id into v_tx_id;

    insert into public.transaction_entries (transaction_id, user_id, account_id, currency_code, amount_minor, entry_role)
    values
      (v_tx_id, v_user_id, p_from_account_id, v_from_currency, -p_from_amount_minor, 'transfer_out'),
      (v_tx_id, v_user_id, p_to_account_id, v_to_currency, p_to_amount_minor, 'transfer_in');

    update public.accounts
    set current_balance_minor = current_balance_minor - p_from_amount_minor,
        updated_at = now()
    where id = p_from_account_id and user_id = v_user_id;

    update public.accounts
    set current_balance_minor = current_balance_minor + p_to_amount_minor,
        updated_at = now()
    where id = p_to_account_id and user_id = v_user_id;
  end if;

  return v_tx_id;
end;
$$;

create or replace function public.delete_financial_transaction_v004(p_transaction_id uuid)
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

  if not exists (
    select 1 from public.transactions
    where id = p_transaction_id and user_id = v_user_id
  ) then
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
    set current_balance_minor = current_balance_minor - v_entry.amount_minor,
        updated_at = now()
    where id = v_entry.account_id and user_id = v_user_id;
  end loop;

  delete from public.transactions
  where id = p_transaction_id and user_id = v_user_id;

  return true;
end;
$$;

revoke execute on function public.create_financial_transaction_v004(text, text, text, text, date, uuid, uuid, bigint, bigint) from public, anon;
revoke execute on function public.delete_financial_transaction_v004(uuid) from public, anon;
grant execute on function public.create_financial_transaction_v004(text, text, text, text, date, uuid, uuid, bigint, bigint) to authenticated;
grant execute on function public.delete_financial_transaction_v004(uuid) to authenticated;
