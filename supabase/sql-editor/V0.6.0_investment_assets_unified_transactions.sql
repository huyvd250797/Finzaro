-- Finzaro V0.6.0 — Investment & Asset Tracking + Unified Liability/Goal-linked Transactions
-- Run after V0.5.0 Financial Goals Planner.

-- -----------------------------------------------------------------------------
-- Investment & Asset Tracking
-- -----------------------------------------------------------------------------
create table if not exists public.investment_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  asset_type text not null,
  currency_code text not null references public.supported_currencies(code),
  quantity numeric(24,8),
  cost_basis_minor bigint not null default 0,
  current_value_minor bigint not null default 0,
  institution_name text,
  purchase_date date,
  valuation_date date not null default current_date,
  linked_account_id uuid references public.accounts(id) on delete set null,
  icon_name text not null default 'Gem',
  icon_color text not null default '#7c3aed',
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_assets_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint investment_assets_type_check check (asset_type in ('gold','stock','fund','real_estate','vehicle','business','collectible','other')),
  constraint investment_assets_quantity_check check (quantity is null or quantity >= 0),
  constraint investment_assets_cost_check check (cost_basis_minor between 0 and 9007199254740991),
  constraint investment_assets_value_check check (current_value_minor between 0 and 9007199254740991),
  constraint investment_assets_institution_check check (institution_name is null or char_length(institution_name) <= 160),
  constraint investment_assets_icon_check check (char_length(btrim(icon_name)) between 1 and 64),
  constraint investment_assets_icon_color_check check (icon_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint investment_assets_notes_check check (notes is null or char_length(notes) <= 1000)
);

create table if not exists public.asset_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.investment_assets(id) on delete cascade,
  valuation_date date not null default current_date,
  value_minor bigint not null,
  cost_basis_minor bigint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  constraint asset_valuations_value_check check (value_minor between 0 and 9007199254740991),
  constraint asset_valuations_cost_check check (cost_basis_minor between 0 and 9007199254740991),
  constraint asset_valuations_notes_check check (notes is null or char_length(notes) <= 500)
);

create index if not exists investment_assets_user_type_idx on public.investment_assets (user_id, is_archived, asset_type);
create index if not exists investment_assets_user_currency_idx on public.investment_assets (user_id, currency_code, is_archived);
create index if not exists asset_valuations_asset_date_idx on public.asset_valuations (asset_id, valuation_date desc, created_at desc);

alter table public.investment_assets enable row level security;
alter table public.asset_valuations enable row level security;

drop policy if exists "users can read own investment assets" on public.investment_assets;
create policy "users can read own investment assets" on public.investment_assets for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users can insert own investment assets" on public.investment_assets;
create policy "users can insert own investment assets" on public.investment_assets for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users can update own investment assets" on public.investment_assets;
create policy "users can update own investment assets" on public.investment_assets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "users can read own asset valuations" on public.asset_valuations;
create policy "users can read own asset valuations" on public.asset_valuations for select to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.investment_assets from anon, authenticated;
grant select on table public.investment_assets to authenticated;
grant insert (user_id, name, asset_type, currency_code, quantity, cost_basis_minor, current_value_minor, institution_name, purchase_date, valuation_date, linked_account_id, icon_name, icon_color, notes) on public.investment_assets to authenticated;
grant update (name, asset_type, quantity, cost_basis_minor, current_value_minor, institution_name, purchase_date, valuation_date, linked_account_id, icon_name, icon_color, notes, is_archived) on public.investment_assets to authenticated;

revoke all on table public.asset_valuations from anon, authenticated;
grant select on table public.asset_valuations to authenticated;

drop trigger if exists investment_assets_set_updated_at on public.investment_assets;
create trigger investment_assets_set_updated_at before update on public.investment_assets for each row execute function public.set_updated_at();

create or replace function public.validate_investment_asset_v060()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_currency text;
  v_archived boolean;
begin
  if new.linked_account_id is not null then
    select currency_code, is_archived into v_currency, v_archived
    from public.accounts where id = new.linked_account_id and user_id = new.user_id;
    if not found then raise exception 'Linked asset account was not found.' using errcode = '42501'; end if;
    if v_currency <> new.currency_code then raise exception 'Asset currency must match linked account currency.' using errcode = '22023'; end if;
    if not new.is_archived and v_archived then raise exception 'Archived account cannot be linked to an active asset.' using errcode = '22023'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists investment_assets_validate_v060 on public.investment_assets;
create trigger investment_assets_validate_v060 before insert or update on public.investment_assets for each row execute function public.validate_investment_asset_v060();
revoke execute on function public.validate_investment_asset_v060() from public, anon, authenticated;

create or replace function public.record_asset_valuation_v060()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.current_value_minor is distinct from old.current_value_minor or new.cost_basis_minor is distinct from old.cost_basis_minor or new.valuation_date is distinct from old.valuation_date then
    insert into public.asset_valuations (user_id, asset_id, valuation_date, value_minor, cost_basis_minor, notes)
    values (new.user_id, new.id, new.valuation_date, new.current_value_minor, new.cost_basis_minor, case when tg_op = 'INSERT' then 'Giá trị ban đầu' else 'Cập nhật định giá' end);
  end if;
  return new;
end;
$$;
drop trigger if exists investment_assets_record_valuation_v060 on public.investment_assets;
create trigger investment_assets_record_valuation_v060 after insert or update on public.investment_assets for each row execute function public.record_asset_valuation_v060();
revoke execute on function public.record_asset_valuation_v060() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Unified transaction purpose + automatic liability/goal links
-- -----------------------------------------------------------------------------
alter table public.transactions add column if not exists transaction_purpose text not null default 'standard';
alter table public.transactions drop constraint if exists transactions_purpose_allowed_v060;
alter table public.transactions add constraint transactions_purpose_allowed_v060 check (transaction_purpose in ('standard','credit_card_payment','loan_payment','transfer'));

-- Backfill semantics for transactions created before V0.6.0 so old liability payments
-- are not suddenly counted as lifestyle spending and existing transfers are explicit.
update public.transactions t set transaction_purpose = 'credit_card_payment'
where t.transaction_type = 'expense'
  and exists (select 1 from public.credit_card_payments p where p.transaction_id = t.id);
update public.transactions t set transaction_purpose = 'loan_payment'
where t.transaction_type = 'expense'
  and exists (select 1 from public.loan_payments p where p.transaction_id = t.id);
update public.transactions set transaction_purpose = 'transfer'
where transaction_type = 'transfer' and transaction_purpose <> 'transfer';

-- A transfer may legitimately update two different linked goals (source + destination).
drop index if exists public.savings_goal_entries_transaction_unique_idx;
create unique index if not exists savings_goal_entries_transaction_goal_unique_idx
  on public.savings_goal_entries (transaction_id, goal_id) where transaction_id is not null;

create or replace function public.validate_savings_goal_v060()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_account_currency text;
  v_account_archived boolean;
  v_account_type text;
begin
  if new.linked_account_id is not null then
    select currency_code, is_archived, account_type into v_account_currency, v_account_archived, v_account_type
    from public.accounts where id = new.linked_account_id and user_id = new.user_id;
    if not found then raise exception 'Linked savings account was not found.' using errcode = '42501'; end if;
    if v_account_currency <> new.currency_code then raise exception 'Savings goal currency must match the linked account currency.' using errcode = '22023'; end if;
    if v_account_type <> 'savings' then raise exception 'Savings goals can only link to a savings account.' using errcode = '22023'; end if;
    if not new.is_archived and v_account_archived then raise exception 'Archived account cannot be linked to an active savings goal.' using errcode = '22023'; end if;
    if not new.is_archived and exists (
      select 1 from public.savings_goals g
      where g.user_id = new.user_id and g.linked_account_id = new.linked_account_id and g.is_archived = false and g.id <> new.id
    ) then
      raise exception 'This savings account is already linked to another active goal.' using errcode = '23505';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists savings_goals_validate_v009 on public.savings_goals;
drop trigger if exists savings_goals_validate_v060 on public.savings_goals;
create trigger savings_goals_validate_v060 before insert or update on public.savings_goals for each row execute function public.validate_savings_goal_v060();
revoke execute on function public.validate_savings_goal_v060() from public, anon, authenticated;

create or replace function public.sync_linked_goal_transfer_v060(
  p_transaction_id uuid,
  p_user_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_from_amount_minor bigint,
  p_to_amount_minor bigint,
  p_transaction_date date
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_goal record;
  v_progress bigint;
  v_withdraw bigint;
begin
  if (select count(*) from public.savings_goals g join public.accounts a on a.id = g.linked_account_id and a.user_id = g.user_id where g.user_id = p_user_id and g.linked_account_id = p_to_account_id and g.is_archived = false and a.account_type = 'savings') > 1 then
    raise exception 'Multiple active savings goals are linked to the destination account. Resolve the links before transferring.' using errcode = '23505';
  end if;
  if (select count(*) from public.savings_goals g join public.accounts a on a.id = g.linked_account_id and a.user_id = g.user_id where g.user_id = p_user_id and g.linked_account_id = p_from_account_id and g.is_archived = false and a.account_type = 'savings') > 1 then
    raise exception 'Multiple active savings goals are linked to the source account. Resolve the links before transferring.' using errcode = '23505';
  end if;

  select g.id into v_goal from public.savings_goals g
  join public.accounts a on a.id = g.linked_account_id and a.user_id = g.user_id
  where g.user_id = p_user_id and g.linked_account_id = p_to_account_id and g.is_archived = false and a.account_type = 'savings' limit 1;
  if found then
    insert into public.savings_goal_entries (user_id, goal_id, entry_type, amount_minor, entry_date, transaction_id, notes)
    values (p_user_id, v_goal.id, 'contribution', p_to_amount_minor, p_transaction_date, p_transaction_id, 'Tự động từ chuyển tiền vào tài khoản tiết kiệm liên kết');
  end if;

  select g.id into v_goal from public.savings_goals g
  join public.accounts a on a.id = g.linked_account_id and a.user_id = g.user_id
  where g.user_id = p_user_id and g.linked_account_id = p_from_account_id and g.is_archived = false and a.account_type = 'savings' limit 1;
  if found then
    select coalesce(sum(amount_minor),0) into v_progress from public.savings_goal_entries where user_id = p_user_id and goal_id = v_goal.id;
    v_withdraw := least(greatest(v_progress,0), p_from_amount_minor);
    if v_withdraw > 0 then
      insert into public.savings_goal_entries (user_id, goal_id, entry_type, amount_minor, entry_date, transaction_id, notes)
      values (p_user_id, v_goal.id, 'withdrawal', -v_withdraw, p_transaction_date, p_transaction_id, 'Tự động từ chuyển tiền ra khỏi tài khoản tiết kiệm liên kết');
    end if;
  end if;
end;
$$;
revoke execute on function public.sync_linked_goal_transfer_v060(uuid,uuid,uuid,uuid,bigint,bigint,date) from public, anon, authenticated;

create or replace function public.create_financial_transaction_v060(
  p_transaction_type text,
  p_title text,
  p_category_id uuid default null,
  p_notes text default null,
  p_transaction_date date default current_date,
  p_from_account_id uuid default null,
  p_to_account_id uuid default null,
  p_from_amount_minor bigint default null,
  p_to_amount_minor bigint default null,
  p_transaction_purpose text default 'standard',
  p_credit_card_id uuid default null,
  p_loan_id uuid default null,
  p_loan_principal_minor bigint default null,
  p_loan_interest_minor bigint default null,
  p_loan_fee_minor bigint default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_tx_id uuid;
  v_from_currency text;
  v_to_currency text;
  v_from_archived boolean;
  v_to_archived boolean;
  v_type text := lower(btrim(coalesce(p_transaction_type, '')));
  v_purpose text := lower(btrim(coalesce(p_transaction_purpose, 'standard')));
  v_title text := btrim(coalesce(p_title, ''));
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_category_name text;
  v_category_type text;
  v_category_archived boolean;
  v_card public.credit_cards%rowtype;
  v_loan public.loans%rowtype;
  v_paid_principal bigint;
  v_principal bigint := coalesce(p_loan_principal_minor,0);
  v_interest bigint := coalesce(p_loan_interest_minor,0);
  v_fee bigint := coalesce(p_loan_fee_minor,0);
  v_limit bigint := 9007199254740991;
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if v_type not in ('income','expense','transfer') then raise exception 'Invalid transaction type.' using errcode = '22023'; end if;
  if char_length(v_title) < 1 or char_length(v_title) > 140 then raise exception 'Transaction title must be between 1 and 140 characters.' using errcode = '22023'; end if;
  if v_notes is not null and char_length(v_notes) > 500 then raise exception 'Notes are too long.' using errcode = '22023'; end if;
  if p_transaction_date is null then raise exception 'Transaction date is required.' using errcode = '22023'; end if;
  if v_type = 'transfer' then v_purpose := 'transfer'; end if;
  if v_type <> 'expense' and v_purpose in ('credit_card_payment','loan_payment') then raise exception 'Liability payments must use Chi tiền.' using errcode = '22023'; end if;
  if v_purpose not in ('standard','credit_card_payment','loan_payment','transfer') then raise exception 'Invalid transaction purpose.' using errcode = '22023'; end if;

  if v_type in ('income','expense') and v_purpose = 'standard' then
    if p_category_id is null then raise exception 'Category is required.' using errcode = '22023'; end if;
    select name, category_type, is_archived into v_category_name, v_category_type, v_category_archived
    from public.categories where id = p_category_id and user_id = v_user_id;
    if not found then raise exception 'Category was not found.' using errcode = '42501'; end if;
    if v_category_archived then raise exception 'Archived category cannot be used for a new transaction.' using errcode = '22023'; end if;
    if v_category_type <> v_type then raise exception 'Category type does not match transaction type.' using errcode = '22023'; end if;
  elsif v_type = 'income' then
    raise exception 'Income must use a category.' using errcode = '22023';
  end if;

  if v_type = 'income' then
    if p_to_account_id is null or p_to_amount_minor is null or p_to_amount_minor <= 0 or p_to_amount_minor > v_limit then raise exception 'A valid destination account and positive amount are required.' using errcode = '22023'; end if;
    perform 1 from public.accounts where id = p_to_account_id and user_id = v_user_id for update;
    if not found then raise exception 'Destination account was not found.' using errcode = '42501'; end if;
    select currency_code, is_archived into v_to_currency, v_to_archived from public.accounts where id = p_to_account_id and user_id = v_user_id;
    if v_to_archived then raise exception 'Archived accounts cannot receive new transactions.' using errcode = '22023'; end if;
    insert into public.transactions (user_id, transaction_type, transaction_purpose, title, category_id, category_label, notes, transaction_date)
    values (v_user_id, v_type, 'standard', v_title, p_category_id, v_category_name, v_notes, p_transaction_date) returning id into v_tx_id;
    insert into public.transaction_entries (transaction_id,user_id,account_id,currency_code,amount_minor,entry_role) values (v_tx_id,v_user_id,p_to_account_id,v_to_currency,p_to_amount_minor,'income');
    update public.accounts set current_balance_minor = current_balance_minor + p_to_amount_minor, updated_at = now() where id = p_to_account_id and user_id = v_user_id;

  elsif v_type = 'expense' then
    if p_from_account_id is null or p_from_amount_minor is null or p_from_amount_minor <= 0 or p_from_amount_minor > v_limit then raise exception 'A valid source account and positive amount are required.' using errcode = '22023'; end if;
    perform 1 from public.accounts where id = p_from_account_id and user_id = v_user_id for update;
    if not found then raise exception 'Source account was not found.' using errcode = '42501'; end if;
    select currency_code, is_archived into v_from_currency, v_from_archived from public.accounts where id = p_from_account_id and user_id = v_user_id;
    if v_from_archived then raise exception 'Archived accounts cannot create new transactions.' using errcode = '22023'; end if;

    if v_purpose = 'credit_card_payment' then
      if p_credit_card_id is null then raise exception 'Please choose a credit card to pay.' using errcode = '22023'; end if;
      select * into v_card from public.credit_cards where id = p_credit_card_id and user_id = v_user_id for update;
      if not found then raise exception 'Credit card was not found.' using errcode = '42501'; end if;
      if v_card.is_archived then raise exception 'Archived credit card cannot receive new payments.' using errcode = '22023'; end if;
      if v_card.currency_code <> v_from_currency then raise exception 'Credit card payment currency must match the source account.' using errcode = '22023'; end if;
      if p_from_amount_minor > v_card.current_balance_minor then raise exception 'Credit card payment cannot exceed current balance.' using errcode = '22023'; end if;
      if v_card.linked_payment_account_id is not null and v_card.linked_payment_account_id <> p_from_account_id then raise exception 'Use the payment account linked to this credit card or update the card first.' using errcode = '22023'; end if;
      v_category_name := 'Thanh toán thẻ tín dụng';
    elsif v_purpose = 'loan_payment' then
      if p_loan_id is null then raise exception 'Please choose a loan to pay.' using errcode = '22023'; end if;
      select * into v_loan from public.loans where id = p_loan_id and user_id = v_user_id for update;
      if not found then raise exception 'Loan was not found.' using errcode = '42501'; end if;
      if v_loan.is_archived then raise exception 'Archived loan cannot receive new payments.' using errcode = '22023'; end if;
      if v_loan.currency_code <> v_from_currency then raise exception 'Loan payment currency must match the source account.' using errcode = '22023'; end if;
      if v_loan.linked_account_id is not null and v_loan.linked_account_id <> p_from_account_id then raise exception 'Use the payment account linked to this loan or update the loan first.' using errcode = '22023'; end if;
      if v_principal < 0 or v_interest < 0 or v_fee < 0 or (v_principal + v_interest + v_fee) <> p_from_amount_minor then raise exception 'Loan principal, interest and fee must equal the payment amount.' using errcode = '22023'; end if;
      select coalesce(sum(principal_minor),0) into v_paid_principal from public.loan_payments where loan_id = v_loan.id and user_id = v_user_id;
      if v_paid_principal + v_principal > v_loan.original_principal_minor then raise exception 'Loan principal payment exceeds remaining principal.' using errcode = '22023'; end if;
      v_category_name := 'Thanh toán khoản vay';
    else
      v_purpose := 'standard';
    end if;

    insert into public.transactions (user_id, transaction_type, transaction_purpose, title, category_id, category_label, notes, transaction_date)
    values (v_user_id, v_type, v_purpose, v_title, case when v_purpose='standard' then p_category_id else null end, v_category_name, v_notes, p_transaction_date) returning id into v_tx_id;
    insert into public.transaction_entries (transaction_id,user_id,account_id,currency_code,amount_minor,entry_role) values (v_tx_id,v_user_id,p_from_account_id,v_from_currency,-p_from_amount_minor,'expense');
    update public.accounts set current_balance_minor = current_balance_minor - p_from_amount_minor, updated_at = now() where id = p_from_account_id and user_id = v_user_id;

    if v_purpose = 'credit_card_payment' then
      insert into public.credit_card_payments (user_id, credit_card_id, payment_date, amount_minor, transaction_id, notes)
      values (v_user_id, p_credit_card_id, p_transaction_date, p_from_amount_minor, v_tx_id, coalesce(v_notes,'Tạo từ Chi tiền'));
    elsif v_purpose = 'loan_payment' then
      insert into public.loan_payments (user_id, loan_id, payment_date, principal_minor, interest_minor, fee_minor, transaction_id, notes)
      values (v_user_id, p_loan_id, p_transaction_date, v_principal, v_interest, v_fee, v_tx_id, coalesce(v_notes,'Tạo từ Chi tiền'));
    end if;

  else
    if p_from_account_id is null or p_to_account_id is null or p_from_account_id = p_to_account_id then raise exception 'Transfer requires two different accounts.' using errcode = '22023'; end if;
    if p_from_amount_minor is null or p_to_amount_minor is null or p_from_amount_minor <= 0 or p_to_amount_minor <= 0 or p_from_amount_minor > v_limit or p_to_amount_minor > v_limit then raise exception 'Transfer amounts must be positive and valid.' using errcode = '22023'; end if;
    perform 1 from public.accounts where id in (p_from_account_id,p_to_account_id) and user_id = v_user_id order by id for update;
    if (select count(*) from public.accounts where id in (p_from_account_id,p_to_account_id) and user_id = v_user_id) <> 2 then raise exception 'One or more transfer accounts were not found.' using errcode = '42501'; end if;
    select currency_code,is_archived into v_from_currency,v_from_archived from public.accounts where id=p_from_account_id and user_id=v_user_id;
    select currency_code,is_archived into v_to_currency,v_to_archived from public.accounts where id=p_to_account_id and user_id=v_user_id;
    if v_from_archived or v_to_archived then raise exception 'Archived accounts cannot be used for transfers.' using errcode = '22023'; end if;
    insert into public.transactions (user_id,transaction_type,transaction_purpose,title,category_id,category_label,notes,transaction_date)
    values (v_user_id,'transfer','transfer',v_title,null,'Chuyển tiền',v_notes,p_transaction_date) returning id into v_tx_id;
    insert into public.transaction_entries (transaction_id,user_id,account_id,currency_code,amount_minor,entry_role) values
      (v_tx_id,v_user_id,p_from_account_id,v_from_currency,-p_from_amount_minor,'transfer_out'),
      (v_tx_id,v_user_id,p_to_account_id,v_to_currency,p_to_amount_minor,'transfer_in');
    update public.accounts set current_balance_minor=current_balance_minor-p_from_amount_minor,updated_at=now() where id=p_from_account_id and user_id=v_user_id;
    update public.accounts set current_balance_minor=current_balance_minor+p_to_amount_minor,updated_at=now() where id=p_to_account_id and user_id=v_user_id;
    perform public.sync_linked_goal_transfer_v060(v_tx_id,v_user_id,p_from_account_id,p_to_account_id,p_from_amount_minor,p_to_amount_minor,p_transaction_date);
  end if;
  return v_tx_id;
end;
$$;

create or replace function public.delete_financial_transaction_v060(p_transaction_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_entry record;
begin
  if v_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not exists (select 1 from public.transactions where id=p_transaction_id and user_id=v_user_id) then raise exception 'Transaction was not found.' using errcode='42501'; end if;
  if exists (select 1 from public.deposit_interest_entries where transaction_id=p_transaction_id)
     or exists (select 1 from public.recurring_occurrences where transaction_id=p_transaction_id) then
    raise exception 'This transaction is managed by another financial module and must be undone there.' using errcode='23503';
  end if;

  -- Delete module links first so their own triggers reverse liability/progress state.
  delete from public.credit_card_payments where transaction_id=p_transaction_id and user_id=v_user_id;
  delete from public.loan_payments where transaction_id=p_transaction_id and user_id=v_user_id;
  delete from public.savings_goal_entries where transaction_id=p_transaction_id and user_id=v_user_id;

  perform 1 from public.accounts where id in (select account_id from public.transaction_entries where transaction_id=p_transaction_id and user_id=v_user_id) order by id for update;
  for v_entry in select account_id,amount_minor from public.transaction_entries where transaction_id=p_transaction_id and user_id=v_user_id order by account_id loop
    update public.accounts set current_balance_minor=current_balance_minor-v_entry.amount_minor,updated_at=now() where id=v_entry.account_id and user_id=v_user_id;
  end loop;
  delete from public.transactions where id=p_transaction_id and user_id=v_user_id;
  return true;
end;
$$;

revoke execute on function public.create_financial_transaction_v005(text,text,uuid,text,date,uuid,uuid,bigint,bigint) from authenticated;
revoke execute on function public.delete_financial_transaction_v005(uuid) from authenticated;
revoke execute on function public.create_financial_transaction_v060(text,text,uuid,text,date,uuid,uuid,bigint,bigint,text,uuid,uuid,bigint,bigint,bigint) from public, anon;
revoke execute on function public.delete_financial_transaction_v060(uuid) from public, anon;
grant execute on function public.create_financial_transaction_v060(text,text,uuid,text,date,uuid,uuid,bigint,bigint,text,uuid,uuid,bigint,bigint,bigint) to authenticated;
grant execute on function public.delete_financial_transaction_v060(uuid) to authenticated;

comment on table public.investment_assets is 'Finzaro V0.6.0 manually valued investment and real-world assets included in Net Worth.';
comment on column public.transactions.transaction_purpose is 'V0.6.0 semantic purpose: standard expense/income, credit-card payment, loan payment, or transfer.';

-- Include manually valued investment assets in future Net Worth snapshots.
alter table public.net_worth_snapshots add column if not exists investment_assets_minor bigint not null default 0;
alter table public.net_worth_snapshots drop constraint if exists net_worth_snapshots_amounts_check;
alter table public.net_worth_snapshots drop constraint if exists net_worth_snapshots_math_check;
alter table public.net_worth_snapshots add constraint net_worth_snapshots_amounts_check check (
  account_assets_minor >= -9007199254740991 and account_assets_minor <= 9007199254740991
  and deposit_assets_minor >= 0 and deposit_assets_minor <= 9007199254740991
  and investment_assets_minor >= 0 and investment_assets_minor <= 9007199254740991
  and loan_liabilities_minor >= 0 and loan_liabilities_minor <= 9007199254740991
  and credit_card_liabilities_minor >= 0 and credit_card_liabilities_minor <= 9007199254740991
  and total_assets_minor >= -9007199254740991 and total_assets_minor <= 9007199254740991
  and total_liabilities_minor >= 0 and total_liabilities_minor <= 9007199254740991
  and net_worth_minor >= -9007199254740991 and net_worth_minor <= 9007199254740991
);
alter table public.net_worth_snapshots add constraint net_worth_snapshots_math_check check (
  total_assets_minor = account_assets_minor + deposit_assets_minor + investment_assets_minor
  and total_liabilities_minor = loan_liabilities_minor + credit_card_liabilities_minor
  and net_worth_minor = total_assets_minor - total_liabilities_minor
);

-- Recurring transfers should use the V0.6.0 transaction core so linked Savings Goals stay in sync.
create or replace function public.post_recurring_occurrence_v007(
  p_rule_id uuid,
  p_due_date date,
  p_status text default 'paid'
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
  if v_user_id is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if v_status not in ('paid','skipped') then raise exception 'Recurring occurrence status must be paid or skipped.' using errcode = '22023'; end if;
  if p_due_date is null then raise exception 'Recurring due date is required.' using errcode = '22023'; end if;

  select * into v_rule from public.recurring_rules where id=p_rule_id and user_id=v_user_id for update;
  if not found then raise exception 'Recurring rule was not found.' using errcode='42501'; end if;
  if not v_rule.is_active then raise exception 'Recurring rule is paused.' using errcode='22023'; end if;
  if p_due_date < v_rule.start_date or (v_rule.end_date is not null and p_due_date > v_rule.end_date)
     or not public.is_recurring_due_date_v007(v_rule.frequency,v_rule.interval_count,v_rule.start_date,p_due_date) then
    raise exception 'Recurring due date is outside the rule schedule.' using errcode='22023';
  end if;
  if exists (select 1 from public.recurring_occurrences where recurring_rule_id=p_rule_id and due_date=p_due_date) then
    raise exception 'Recurring occurrence is already completed or skipped.' using errcode='23505';
  end if;

  if v_status='paid' then
    v_transaction_id := public.create_financial_transaction_v060(
      v_rule.transaction_type, v_rule.title, v_rule.category_id, v_rule.notes, p_due_date,
      v_rule.from_account_id, v_rule.to_account_id, v_rule.from_amount_minor, v_rule.to_amount_minor,
      case when v_rule.transaction_type='transfer' then 'transfer' else 'standard' end,
      null, null, null, null, null
    );
  end if;

  insert into public.recurring_occurrences (user_id,recurring_rule_id,due_date,status,transaction_id)
  values (v_user_id,p_rule_id,p_due_date,v_status,v_transaction_id) returning id into v_occurrence_id;
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
  if v_user_id is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  select * into v_occurrence from public.recurring_occurrences where id=p_occurrence_id and user_id=v_user_id for update;
  if not found then raise exception 'Recurring occurrence was not found.' using errcode='42501'; end if;
  delete from public.recurring_occurrences where id=p_occurrence_id and user_id=v_user_id;
  if v_occurrence.transaction_id is not null then perform public.delete_financial_transaction_v060(v_occurrence.transaction_id); end if;
  return true;
end;
$$;
