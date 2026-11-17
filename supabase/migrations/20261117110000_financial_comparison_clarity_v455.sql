-- Finzaro V4.5.5: current dashboard aggregates must end TODAY (never include future-dated entries).
-- Database migration required to activate the fast path; fallback remains available.
-- Only raw minor units are aggregated. No stored copies of financial snapshots.
create or replace function public.dashboard_snapshot_v450(p_currency text, p_today date)
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
    where t.user_id=v_user and t.transaction_date between least(v_start,v_year) and p_today
      and t.transaction_type in ('income','expense')
      and coalesce(t.transaction_purpose,'standard')='standard'
  ), daily as (
    select d, sum(amount) filter (where flow='income') as income,
      sum(amount) filter (where flow='expense') as expense
    from flows group by d
  )
  select coalesce(jsonb_agg(jsonb_build_object('date',d::text,
    'income',coalesce(income,0),'expense',coalesce(expense,0)) order by d),'[]'::jsonb),
    coalesce(sum(income) filter (where d between v_month and p_today),0),
    coalesce(sum(expense) filter (where d between v_month and p_today),0)
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

  with flows as (
    select t.id, t.title, t.transaction_date, t.created_at, t.category_id,
      t.transaction_type as flow_type,
      coalesce(c.name,t.category_label,'Chưa phân loại') as label,
      coalesce(c.icon_name,'Shapes') as icon_name,
      c.icon_color, abs(e.amount_minor::numeric) as amount
    from public.transactions t
    join public.transaction_entries e on e.transaction_id=t.id and e.user_id=v_user
      and e.entry_role=t.transaction_type and e.currency_code=p_currency
    left join public.categories c on c.id=t.category_id and c.user_id=v_user
    where t.user_id=v_user and t.transaction_type in ('income','expense')
      and coalesce(t.transaction_purpose,'standard')='standard'
      and t.transaction_date between v_year and p_today
  ), scoped as (
    select p.period, s.* from flows s
    cross join lateral (values ('today'::text, s.transaction_date=p_today),
      ('month'::text, s.transaction_date between v_month and p_today),
      ('year'::text, true)) p(period, included)
    where p.included
  ), grouped as (
    select period, flow_type, category_id, max(label) as label, max(icon_name) as icon_name,
      max(icon_color) as icon_color, sum(amount) as amount, count(*) as count
    from scoped group by period, flow_type, category_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'period',period,'flowType',flow_type,'id',category_id,'label',label,'iconName',icon_name,
    'iconColor',icon_color,'amount',amount,'count',count
  ) order by period, amount desc),'[]'::jsonb) into v_categories from grouped;

  with flows as (
    select t.id, t.title, t.transaction_date, t.created_at,
      t.transaction_type as flow_type,
      coalesce(c.name,t.category_label,'Chưa phân loại') as category,
      abs(e.amount_minor::numeric) as amount
    from public.transactions t
    join public.transaction_entries e on e.transaction_id=t.id and e.user_id=v_user
      and e.entry_role=t.transaction_type and e.currency_code=p_currency
    left join public.categories c on c.id=t.category_id and c.user_id=v_user
    where t.user_id=v_user and t.transaction_type in ('income','expense')
      and coalesce(t.transaction_purpose,'standard')='standard'
      and t.transaction_date between v_year and p_today
  ), ranked as (
    select p.period,s.*,row_number() over (
      partition by p.period,s.flow_type order by s.transaction_date desc,s.created_at desc,s.id desc
    ) as rn
    from flows s cross join lateral (values ('today'::text, s.transaction_date=p_today),
      ('month'::text, s.transaction_date between v_month and p_today),('year'::text,true)) p(period,included)
    where p.included
  )
  select coalesce(jsonb_agg(jsonb_build_object('period',period,'flowType',flow_type,'id',id,'title',title,
    'date',transaction_date::text,'category',category,'amount',amount)
    order by period,transaction_date desc,created_at desc,id desc),'[]'::jsonb)
    into v_recent from ranked where rn<=5;

  return jsonb_build_object('snapshotVersion','v450','today',p_today::text,'balance',v_balance,
    'closingBalance',v_balance-v_future,
    'monthTotals',jsonb_build_object('income',v_month_income,'expense',v_month_expense),
    'daily',v_daily,'movements',v_movements,'categories',v_categories,'recent',v_recent);
end;
$$;
revoke all on function public.dashboard_snapshot_v450(text,date) from public, anon;
grant execute on function public.dashboard_snapshot_v450(text,date) to authenticated;
comment on function public.dashboard_snapshot_v450(text,date) is
  'Finzaro 4.5.5: authenticated read-only income/expense up to selected date, excludes future-dated postings.';



-- V4.5.5: Full YESTERDAY (option B). Month/year match the elapsed calendar dates,
-- clamping e.g. March 31 -> February 28, Feb 29 -> previous-year Feb 28.
-- Return previous AND current flow totals for strict dashboard reconciliation.
create or replace function public.dashboard_period_comparison_v455(p_currency text, p_today date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_previous_day date := p_today - 1;
  v_previous_month date := (date_trunc('month', p_today) - interval '1 month')::date;
  v_previous_year date := (date_trunc('year', p_today) - interval '1 year')::date;
  v_month_start date := date_trunc('month', p_today)::date;
  v_year_start date := date_trunc('year', p_today)::date;
  v_previous_month_end date;
  v_previous_year_end date;
  v_previous jsonb;
  v_current jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_today is null or p_today < date '2000-01-01' or p_today > date '2200-12-31'
    or p_currency is null or p_currency !~ '^[A-Z]{3,8}$' then
    raise exception 'Invalid comparison parameters' using errcode='22023';
  end if;

  v_previous_month_end := least(
    v_previous_month + (extract(day from p_today)::int - 1),
    (v_month_start - 1));
  v_previous_year_end := least(
    make_date(extract(year from p_today)::int - 1, extract(month from p_today)::int, 1)
      + (extract(day from p_today)::int - 1),
    (make_date(extract(year from p_today)::int - 1, extract(month from p_today)::int, 1)
      + interval '1 month - 1 day')::date);

  with flows as (
    select t.transaction_date as d, t.transaction_type as flow,
      abs(e.amount_minor::numeric) as amount
    from public.transactions t
    join public.transaction_entries e on e.transaction_id = t.id
      and e.user_id = v_user and e.entry_role = t.transaction_type
      and e.currency_code = p_currency
    where t.user_id = v_user
      and t.transaction_date between v_previous_year and p_today
      and t.transaction_type in ('income', 'expense')
      and coalesce(t.transaction_purpose, 'standard') = 'standard'
  )
  select jsonb_build_object(
      'income', jsonb_build_object(
        'today', coalesce(sum(amount) filter (where flow='income' and d = v_previous_day), 0),
        'month', coalesce(sum(amount) filter (where flow='income' and d between v_previous_month and v_previous_month_end), 0),
        'year', coalesce(sum(amount) filter (where flow='income' and d between v_previous_year and v_previous_year_end), 0)),
      'expense', jsonb_build_object(
        'today', coalesce(sum(amount) filter (where flow='expense' and d = v_previous_day), 0),
        'month', coalesce(sum(amount) filter (where flow='expense' and d between v_previous_month and v_previous_month_end), 0),
        'year', coalesce(sum(amount) filter (where flow='expense' and d between v_previous_year and v_previous_year_end), 0))
    ),
    jsonb_build_object(
      'income', jsonb_build_object(
        'today', coalesce(sum(amount) filter (where flow='income' and d = p_today), 0),
        'month', coalesce(sum(amount) filter (where flow='income' and d between v_month_start and p_today), 0),
        'year', coalesce(sum(amount) filter (where flow='income' and d between v_year_start and p_today), 0)),
      'expense', jsonb_build_object(
        'today', coalesce(sum(amount) filter (where flow='expense' and d = p_today), 0),
        'month', coalesce(sum(amount) filter (where flow='expense' and d between v_month_start and p_today), 0),
        'year', coalesce(sum(amount) filter (where flow='expense' and d between v_year_start and p_today), 0))
    )
  into v_previous, v_current from flows;

  return jsonb_build_object('snapshotVersion', 'v455', 'today', p_today::text,
    'currency', p_currency,
    'ranges', jsonb_build_object(
      'today', jsonb_build_object('from', v_previous_day::text, 'to', v_previous_day::text),
      'month', jsonb_build_object('from', v_previous_month::text, 'to', v_previous_month_end::text),
      'year', jsonb_build_object('from', v_previous_year::text, 'to', v_previous_year_end::text)),
    'previous', v_previous, 'current', v_current);
end;
$$;
revoke all on function public.dashboard_period_comparison_v455(text,date) from public, anon;
grant execute on function public.dashboard_period_comparison_v455(text,date) to authenticated;
comment on function public.dashboard_period_comparison_v455(text,date) is
  'Finzaro V4.5.5: option B full-yesterday, prior calendar-to-date month/year, paired current totals for reconciliation; RLS invoker, standard flows only.';
