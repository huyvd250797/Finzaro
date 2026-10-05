-- Finance PWA V0.1.0 - Foundation & Secure Account
-- Run once on a NEW Supabase project. Money is NUMERIC, never float/double.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  base_currency text not null default 'VND' check (base_currency ~ '^[A-Z]{3}$'),
  locale text not null default 'vi-VN',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'personal' check (kind in ('personal', 'family')),
  base_currency text not null default 'VND' check (base_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  account_type text not null check (account_type in ('cash', 'bank', 'ewallet', 'credit', 'loan', 'other')),
  currency text not null default 'VND' check (currency ~ '^[A-Z]{3}$'),
  opened_on date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('income', 'expense')),
  icon text,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create unique index if not exists categories_workspace_name_kind_uq
  on public.categories (workspace_id, lower(name), kind);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid,
  category_id uuid,
  kind text not null check (kind in ('income', 'expense', 'transfer')),
  amount numeric(20,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  occurred_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'confirmed' check (status in ('draft', 'pending', 'confirmed', 'reversed')),
  idempotency_key uuid not null default gen_random_uuid(),
  version integer not null default 1 check (version >= 1),
  reversal_of uuid references public.transactions(id),
  deleted_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_account_workspace_fk foreign key (account_id, workspace_id)
    references public.accounts(id, workspace_id),
  constraint transactions_category_workspace_fk foreign key (category_id, workspace_id)
    references public.categories(id, workspace_id),
  unique (workspace_id, idempotency_key)
);

-- Ledger-ready detail table. V0.2.0 will make all balance-affecting operations go through this layer.
create table if not exists public.transaction_lines (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null,
  direction text not null check (direction in ('debit', 'credit')),
  amount numeric(20,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  constraint transaction_lines_account_workspace_fk foreign key (account_id, workspace_id)
    references public.accounts(id, workspace_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (char_length(action) between 3 and 100),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspace_members_user_idx on public.workspace_members(user_id, status);
create index if not exists accounts_workspace_idx on public.accounts(workspace_id, is_archived);
create index if not exists categories_workspace_idx on public.categories(workspace_id, kind, is_archived);
create index if not exists transactions_workspace_occurred_idx on public.transactions(workspace_id, occurred_at desc);
create index if not exists transaction_lines_account_idx on public.transaction_lines(workspace_id, account_id);
create index if not exists audit_logs_workspace_created_idx on public.audit_logs(workspace_id, created_at desc);
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
      and wm.status = 'active'
  );
$$;

create or replace function public.can_write_workspace(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'member')
      and wm.status = 'active'
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_owner(uuid) from public;
revoke all on function public.can_write_workspace(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.can_write_workspace(uuid) to authenticated;

create or replace function public.bootstrap_finance_user(p_user_id uuid, p_email text, p_meta jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_workspace_id uuid;
begin
  v_display_name := coalesce(nullif(trim(p_meta->>'display_name'), ''), nullif(split_part(coalesce(p_email, ''), '@', 1), ''), 'Người dùng');
  if char_length(v_display_name) < 2 then v_display_name := 'Người dùng'; end if;
  v_display_name := left(v_display_name, 80);

  insert into public.profiles (id, display_name)
  values (p_user_id, v_display_name)
  on conflict (id) do nothing;

  select id into v_workspace_id
  from public.workspaces
  where owner_id = p_user_id and kind = 'personal'
  order by created_at
  limit 1;

  if v_workspace_id is null then
    insert into public.workspaces (owner_id, name, kind, base_currency)
    values (p_user_id, left(v_display_name || ' · Cá nhân', 120), 'personal', 'VND')
    returning id into v_workspace_id;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (v_workspace_id, p_user_id, 'owner', 'active')
  on conflict (workspace_id, user_id) do update set role = 'owner', status = 'active';

  insert into public.categories (workspace_id, name, kind, icon, sort_order) values
    (v_workspace_id, 'Lương', 'income', 'briefcase-business', 10),
    (v_workspace_id, 'Thu nhập khác', 'income', 'circle-dollar-sign', 20),
    (v_workspace_id, 'Ăn uống', 'expense', 'utensils', 10),
    (v_workspace_id, 'Di chuyển', 'expense', 'car-front', 20),
    (v_workspace_id, 'Nhà ở', 'expense', 'house', 30),
    (v_workspace_id, 'Mua sắm', 'expense', 'shopping-bag', 40),
    (v_workspace_id, 'Sức khỏe', 'expense', 'heart-pulse', 50),
    (v_workspace_id, 'Khác', 'expense', 'shapes', 99)
  on conflict do nothing;
end;
$$;

revoke all on function public.bootstrap_finance_user(uuid, text, jsonb) from public;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.bootstrap_finance_user(new.id, new.email, coalesce(new.raw_user_meta_data, '{}'::jsonb));
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Backfill safely when migration is applied to a project that already has Auth users.
select public.bootstrap_finance_user(id, email, coalesce(raw_user_meta_data, '{}'::jsonb)) from auth.users;

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces for each row execute procedure public.set_updated_at();
create trigger accounts_updated_at before update on public.accounts for each row execute procedure public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_lines enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: only the authenticated user can read/update their own profile.
create policy "profiles_select_self" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Workspaces: active members can read; only owners can update/delete.
create policy "workspaces_select_member" on public.workspaces for select to authenticated using (public.is_workspace_member(id));
create policy "workspaces_update_owner" on public.workspaces for update to authenticated using (public.is_workspace_owner(id)) with check (public.is_workspace_owner(id));
create policy "workspaces_delete_owner" on public.workspaces for delete to authenticated using (public.is_workspace_owner(id));

-- Membership: users can see their own membership; workspace owners can see/manage all memberships.
create policy "members_select_self_or_owner" on public.workspace_members for select to authenticated
  using (user_id = auth.uid() or public.is_workspace_owner(workspace_id));
create policy "members_insert_owner" on public.workspace_members for insert to authenticated
  with check (public.is_workspace_owner(workspace_id));
create policy "members_update_owner" on public.workspace_members for update to authenticated
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy "members_delete_owner" on public.workspace_members for delete to authenticated
  using (public.is_workspace_owner(workspace_id) and user_id <> auth.uid());

-- Financial foundation tables: viewer can read, owner/member can mutate.
create policy "accounts_select_member" on public.accounts for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "accounts_insert_writer" on public.accounts for insert to authenticated with check (public.can_write_workspace(workspace_id));
create policy "accounts_update_writer" on public.accounts for update to authenticated using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));
create policy "accounts_delete_writer" on public.accounts for delete to authenticated using (public.can_write_workspace(workspace_id));

create policy "categories_select_member" on public.categories for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "categories_insert_writer" on public.categories for insert to authenticated with check (public.can_write_workspace(workspace_id));
create policy "categories_update_writer" on public.categories for update to authenticated using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));
create policy "categories_delete_writer" on public.categories for delete to authenticated using (public.can_write_workspace(workspace_id));

create policy "transactions_select_member" on public.transactions for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "transactions_insert_writer" on public.transactions for insert to authenticated with check (public.can_write_workspace(workspace_id) and created_by = auth.uid());
create policy "transactions_update_writer" on public.transactions for update to authenticated using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));
create policy "transactions_delete_writer" on public.transactions for delete to authenticated using (public.can_write_workspace(workspace_id));

create policy "transaction_lines_select_member" on public.transaction_lines for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "transaction_lines_insert_writer" on public.transaction_lines for insert to authenticated with check (public.can_write_workspace(workspace_id));
create policy "transaction_lines_update_writer" on public.transaction_lines for update to authenticated using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id));
create policy "transaction_lines_delete_writer" on public.transaction_lines for delete to authenticated using (public.can_write_workspace(workspace_id));

-- Audit is append-only through RLS. Users can write only as themselves.
create policy "audit_select_self_or_owner" on public.audit_logs for select to authenticated
  using (actor_user_id = auth.uid() or (workspace_id is not null and public.is_workspace_owner(workspace_id)));
create policy "audit_insert_self" on public.audit_logs for insert to authenticated
  with check (actor_user_id = auth.uid() and (workspace_id is null or public.can_write_workspace(workspace_id)));

revoke all on table public.profiles, public.workspaces, public.workspace_members, public.accounts, public.categories, public.transactions, public.transaction_lines, public.audit_logs from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces, public.workspace_members, public.accounts, public.categories, public.transactions, public.transaction_lines to authenticated;
grant select, insert on public.audit_logs to authenticated;

comment on table public.accounts is 'No mutable balance column. Balance must be derived/rebuilt from confirmed ledger data.';
comment on column public.transactions.amount is 'NUMERIC money amount; application code must never convert to JS float for authoritative calculations.';
comment on column public.transactions.idempotency_key is 'Prevents duplicate creates/import/sync within a workspace.';
