-- Finzaro V4.6.6 — Family Savings Fund Management
-- Run AFTER migrations through V4.6.4. Non-destructive; no changes to past ledger or legacy savings accounts.
begin;

alter table public.accounts drop constraint if exists accounts_type_allowed;
alter table public.accounts add constraint accounts_type_allowed
  check (account_type in ('cash', 'bank', 'ewallet', 'savings', 'family_savings'));

-- Family fund must never become negative, including reversals of earlier transfers.
alter table public.accounts drop constraint if exists family_fund_nonnegative_v466;
alter table public.accounts add constraint family_fund_nonnegative_v466
  check(account_type <> 'family_savings' or current_balance_minor >= 0);

create table if not exists public.family_savings_funds_v466 (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_amount_minor bigint not null default 0 check(target_amount_minor between 0 and 9007199254740991),
  monthly_contribution_minor bigint not null default 0 check(monthly_contribution_minor between 0 and 9007199254740991),
  maturity_date date,
  annual_interest_rate numeric(7,4) check(annual_interest_rate is null or (annual_interest_rate between 0 and 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists family_savings_funds_v466_owner_idx on public.family_savings_funds_v466(user_id);
alter table public.family_savings_funds_v466 enable row level security;
drop policy if exists "family funds own select v466" on public.family_savings_funds_v466;
create policy "family funds own select v466" on public.family_savings_funds_v466
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.family_savings_funds_v466 from public, anon, authenticated;
grant select on public.family_savings_funds_v466 to authenticated;

-- Atomic creation prevents an account without its fund metadata. Opening balance is always zero.
create or replace function public.family_fund_create_v466(
  p_name text, p_institution_name text, p_target_amount_minor bigint,
  p_monthly_contribution_minor bigint, p_maturity_date date,
  p_annual_interest_rate numeric
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_name,''))) not between 1 and 100
    or length(btrim(coalesce(p_institution_name,'')))>100 then
    raise exception 'Tên quỹ/tổ chức không hợp lệ.' using errcode='22023'; end if;
  if p_target_amount_minor is null or p_target_amount_minor<0 or p_target_amount_minor>9007199254740991
    or p_monthly_contribution_minor is null or p_monthly_contribution_minor<0 or p_monthly_contribution_minor>9007199254740991
    or (p_annual_interest_rate is not null and (p_annual_interest_rate<0 or p_annual_interest_rate>100)) then
    raise exception 'Mục tiêu, mức góp hoặc lãi suất không hợp lệ.' using errcode='22023'; end if;
  insert into public.accounts(user_id,name,account_type,currency_code,institution_name,opening_balance_minor,current_balance_minor)
    values(v_uid,btrim(p_name),'family_savings','VND',nullif(btrim(coalesce(p_institution_name,'')),''),0,0)
    returning id into v_id;
  insert into public.family_savings_funds_v466(account_id,user_id,target_amount_minor,monthly_contribution_minor,maturity_date,annual_interest_rate)
    values(v_id,v_uid,p_target_amount_minor,p_monthly_contribution_minor,p_maturity_date,p_annual_interest_rate);
  return v_id;
end; $$;

create or replace function public.family_fund_update_v466(
  p_account_id uuid, p_name text, p_institution_name text,
  p_target_amount_minor bigint, p_monthly_contribution_minor bigint,
  p_maturity_date date, p_annual_interest_rate numeric
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_name,''))) not between 1 and 100
    or length(btrim(coalesce(p_institution_name,'')))>100
    or p_target_amount_minor is null or p_target_amount_minor<0 or p_target_amount_minor>9007199254740991
    or p_monthly_contribution_minor is null or p_monthly_contribution_minor<0 or p_monthly_contribution_minor>9007199254740991
    or (p_annual_interest_rate is not null and (p_annual_interest_rate<0 or p_annual_interest_rate>100)) then
    raise exception 'Thông tin quỹ không hợp lệ.' using errcode='22023'; end if;
  perform 1 from public.accounts where id=p_account_id and user_id=v_uid and account_type='family_savings' and not is_archived for update;
  if not found then raise exception 'Quỹ không tồn tại hoặc đã lưu trữ.' using errcode='42501'; end if;
  update public.accounts set name=btrim(p_name),institution_name=nullif(btrim(coalesce(p_institution_name,'')),''),updated_at=now()
    where id=p_account_id and user_id=v_uid;
  update public.family_savings_funds_v466 set target_amount_minor=p_target_amount_minor,
    monthly_contribution_minor=p_monthly_contribution_minor,maturity_date=p_maturity_date,
    annual_interest_rate=p_annual_interest_rate,updated_at=now()
    where account_id=p_account_id and user_id=v_uid;
  return true;
end; $$;

-- Use the existing atomic ledger engine: no expense/income, no double count.
-- Only same-currency VND transfers involving an owned family savings account are accepted.
create or replace function public.family_fund_transfer_v466(
  p_from_account_id uuid, p_to_account_id uuid, p_amount_minor bigint,
  p_transaction_date date, p_notes text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid:=auth.uid(); v_id uuid; v_total integer; v_family integer;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập.' using errcode='42501'; end if;
  if p_from_account_id is null or p_to_account_id is null or p_from_account_id=p_to_account_id
    or p_amount_minor is null or p_amount_minor<=0 or p_amount_minor>9007199254740991
    or p_transaction_date is null or length(coalesce(p_notes,''))>500 then
    raise exception 'Thông tin chuyển quỹ không hợp lệ.' using errcode='22023'; end if;
  -- Stable lock ordering; prevent concurrent edits and owner bypass.
  perform 1 from public.accounts where id in (p_from_account_id,p_to_account_id) and user_id=v_uid order by id for update;
  select count(*),count(*) filter(where account_type='family_savings') into v_total,v_family
    from public.accounts where id in (p_from_account_id,p_to_account_id) and user_id=v_uid
      and is_archived=false and currency_code='VND' and account_type in ('cash','bank','ewallet','family_savings');
  if v_total<>2 or v_family<>1 then
    raise exception 'Phải chuyển giữa tài khoản VND và một quỹ gia đình đang hoạt động.' using errcode='22023'; end if;
  if (select current_balance_minor from public.accounts where id=p_from_account_id and user_id=v_uid)<p_amount_minor then
    raise exception 'Số dư nguồn không đủ để chuyển quỹ.' using errcode='22023'; end if;
  v_id:=public.create_financial_transaction_v071(
    p_transaction_type=>'transfer',
    p_title=>case when exists(select 1 from public.accounts where id=p_to_account_id and account_type='family_savings')
      then 'Gửi quỹ gia đình' else 'Rút quỹ gia đình' end,
    p_notes=>nullif(btrim(coalesce(p_notes,'')),''),
    p_transaction_date=>p_transaction_date,
    p_from_account_id=>p_from_account_id,p_to_account_id=>p_to_account_id,
    p_from_amount_minor=>p_amount_minor,p_to_amount_minor=>p_amount_minor,
    p_transaction_purpose=>'transfer'
  );
  insert into public.simple_transaction_ids_v120(transaction_id,user_id) values(v_id,v_uid);
  return v_id;
end; $$;

revoke all on function public.family_fund_create_v466(text,text,bigint,bigint,date,numeric),
 public.family_fund_update_v466(uuid,text,text,bigint,bigint,date,numeric),
 public.family_fund_transfer_v466(uuid,uuid,bigint,date,text) from public,anon;
grant execute on function public.family_fund_create_v466(text,text,bigint,bigint,date,numeric),
 public.family_fund_update_v466(uuid,text,text,bigint,bigint,date,numeric),
 public.family_fund_transfer_v466(uuid,uuid,bigint,date,text) to authenticated;
commit;
