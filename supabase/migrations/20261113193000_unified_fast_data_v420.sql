-- Finzaro V4.2.0: user-scoped, read-only dashboard aggregation.
-- Database migration required to activate the fast path; fallback remains available.
-- Only raw minor units are aggregated. No stored copies of financial snapshots.
create or replace function public.dashboard_snapshot_v420(p_currency text, p_today date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_start date := p_today - 365;
  v_month date := date_trunc('month', p_today)::date;
  v_year date := date_trunc('year', p_today)::date;
  v_end_month date := (date_trunc('month',p_today) + interval '1 month - 1 day')::date;
  v_end_year date := (date_trunc('year',p_today) + interval '1 year - 1 day')::date;
  v_balance numeric := 0;
  v_future numeric := 0;
  v_month_income numeric := 0;
  v_month_expense numeric := 0;
  v_daily jsonb := '[]'::jsonb;
  v_movements jsonb := '[]'::jsonb;
  v_categories jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_today is null or p_today < date '2000-01-01' or p_today > date '2200-12-31'
    or p_currency is null or p_currency !~ '^[A-Z]{3,8}$' then
    raise exception 'Invalid dashboard parameters' using errcode='22023';
  end if;

  select coalesce(sum(a.current_balance_minor::numeric),0) into v_balance
  from public.accounts a
  where a.user_id = v_user and a.currency_code = p_currency
    and a.is_archived = false and a.account_type in ('cash','bank','ewallet');

  -- current_balance_minor can include future-dated postings. Remove them from
  -- the end-of-today position before calculating historical closing balances.
  select coalesce(sum(e.amount_minor::numeric),0) into v_future
  from public.transactions t
  join public.transaction_entries e on e.transaction_id=t.id and e.user_id=v_user
  join public.accounts a on a.id=e.account_id and a.user_id=v_user
  where t.user_id=v_user and t.transaction_date > p_today
    and e.currency_code=p_currency and a.currency_code=p_currency
    and a.is_archived=false and a.account_type in ('cash','bank','ewallet');

  with flows as (
    select t.transaction_date as d, t.transaction_type as flow,
      abs(e.amount_minor::numeric) as amount
    from public.transactions t
    join public.transaction_entries e on e.transaction_id=t.id and e.user_id=v_user
      and e.entry_role=t.transaction_type and e.currency_code=p_currency
    where t.user_id=v_user and t.transaction_date between least(v_start,v_year) and v_end_year
      and t.transaction_type in ('income','expense')
      and coalesce(t.transaction_purpose,'standard')='standard'
  ), daily as (
    select d, sum(amount) filter (where flow='income') as income,
      sum(amount) filter (where flow='expense') as expense
    from flows group by d
  )
  select coalesce(jsonb_agg(jsonb_build_object('date',d::text,
    'income',coalesce(income,0),'expense',coalesce(expense,0)) order by d),'[]'::jsonb),
    coalesce(sum(income) filter (where d between v_month and v_end_month),0),
    coalesce(sum(expense) filter (where d between v_month and v_end_month),0)
  into v_daily, v_month_income, v_month_expense from daily;

  select coalesce(jsonb_agg(jsonb_build_object('date',d::text,'delta',delta) order by d),'[]'::jsonb)
    into v_movements
  from (
    select t.transaction_date as d, sum(e.amount_minor::numeric) as delta
    from public.transactions t
    join public.transaction_entries e on e.transaction_id=t.id and e.user_id=v_user and e.currency_code=p_currency
    join public.accounts a on a.id=e.account_id and a.user_id=v_user
    where t.user_id=v_user and t.transaction_date between v_start and p_today
      and a.currency_code=p_currency and a.is_archived=false and a.account_type in ('cash','bank','ewallet')
    group by t.transaction_date
  ) m;

  with spending as (
    select t.id, t.title, t.transaction_date, t.created_at, t.category_id,
      coalesce(c.name,t.category_label,'Chưa phân loại') as label,
      coalesce(c.icon_name,'Shapes') as icon_name,
      c.icon_color, abs(e.amount_minor::numeric) as amount
    from public.transactions t
    join public.transaction_entries e on e.transaction_id=t.id and e.user_id=v_user
      and e.entry_role='expense' and e.currency_code=p_currency
    left join public.categories c on c.id=t.category_id and c.user_id=v_user
    where t.user_id=v_user and t.transaction_type='expense'
      and coalesce(t.transaction_purpose,'standard')='standard'
      and t.transaction_date between v_year and v_end_year
  ), scoped as (
    select p.period, s.* from spending s
    cross join lateral (values ('today'::text, s.transaction_date=p_today),
      ('month'::text, s.transaction_date between v_month and v_end_month),
      ('year'::text, true)) p(period, included)
    where p.included
  ), grouped as (
    select period, category_id, max(label) as label, max(icon_name) as icon_name,
      max(icon_color) as icon_color, sum(amount) as amount, count(*) as count
    from scoped group by period, category_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'period',period,'id',category_id,'label',label,'iconName',icon_name,
    'iconColor',icon_color,'amount',amount,'count',count
  ) order by period, amount desc),'[]'::jsonb) into v_categories from grouped;

  with spending as (
    select t.id, t.title, t.transaction_date, t.created_at,
      coalesce(c.name,t.category_label,'Chưa phân loại') as category,
      abs(e.amount_minor::numeric) as amount
    from public.transactions t
    join public.transaction_entries e on e.transaction_id=t.id and e.user_id=v_user
      and e.entry_role='expense' and e.currency_code=p_currency
    left join public.categories c on c.id=t.category_id and c.user_id=v_user
    where t.user_id=v_user and t.transaction_type='expense'
      and coalesce(t.transaction_purpose,'standard')='standard'
      and t.transaction_date between v_year and v_end_year
  ), ranked as (
    select p.period,s.*,row_number() over (
      partition by p.period order by s.transaction_date desc,s.created_at desc,s.id desc
    ) as rn
    from spending s cross join lateral (values ('today'::text, s.transaction_date=p_today),
      ('month'::text, s.transaction_date between v_month and v_end_month),('year'::text,true)) p(period,included)
    where p.included
  )
  select coalesce(jsonb_agg(jsonb_build_object('period',period,'id',id,'title',title,
    'date',transaction_date::text,'category',category,'amount',amount)
    order by period,transaction_date desc,created_at desc,id desc),'[]'::jsonb)
    into v_recent from ranked where rn<=5;

  return jsonb_build_object('today',p_today::text,'balance',v_balance,
    'closingBalance',v_balance-v_future,
    'monthTotals',jsonb_build_object('income',v_month_income,'expense',v_month_expense),
    'daily',v_daily,'movements',v_movements,'categories',v_categories,'recent',v_recent);
end;
$$;
revoke all on function public.dashboard_snapshot_v420(text,date) from public, anon;
grant execute on function public.dashboard_snapshot_v420(text,date) to authenticated;
comment on function public.dashboard_snapshot_v420(text,date) is
  'Finzaro 4.2: authenticated single-request daily cashflow, 3 spending windows and liquid account historical position; read only.';

-- Existing transaction user/date and entries transaction indexes support the
-- aggregate; this covering index improves date-ordered category slices.
create index if not exists transactions_user_purpose_date_v420_idx
  on public.transactions (user_id, transaction_date desc, transaction_type, category_id)
  where coalesce(transaction_purpose,'standard')='standard';
