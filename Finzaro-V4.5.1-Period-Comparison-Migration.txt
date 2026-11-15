-- Finzaro V4.5.1 — compare current Dashboard cards against the *complete* previous day/month/year.
-- Deploy AFTER V4.5.0. Read-only. All numbers are minor units; no data changes.
-- A previous-period base of 0 is returned as 0. The UI deliberately displays —% if
-- current > 0; assigning an arbitrary +100% would misrepresent the comparison.
create or replace function public.dashboard_period_comparison_v451(p_currency text, p_today date)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_previous_year date := (date_trunc('year', p_today) - interval '1 year')::date;
  v_previous_month date := (date_trunc('month', p_today) - interval '1 month')::date;
  v_month_start date := date_trunc('month', p_today)::date;
  v_year_start date := date_trunc('year', p_today)::date;
  v_previous jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode='28000';
  end if;
  if p_today is null or p_today < date '2000-01-01' or p_today > date '2200-12-31'
    or p_currency is null or p_currency !~ '^[A-Z]{3,8}$' then
    raise exception 'Invalid comparison parameters' using errcode='22023';
  end if;

  with flows as (
    select t.transaction_date as d, t.transaction_type as flow,
      abs(e.amount_minor::numeric) as amount
    from public.transactions t
    join public.transaction_entries e on e.transaction_id = t.id
      and e.user_id = v_user and e.entry_role = t.transaction_type
      and e.currency_code = p_currency
    where t.user_id = v_user
      and t.transaction_date >= v_previous_year and t.transaction_date < p_today
      and t.transaction_type in ('income', 'expense')
      and coalesce(t.transaction_purpose, 'standard') = 'standard'
  )
  select jsonb_build_object(
    'income', jsonb_build_object(
      'today', coalesce(sum(amount) filter (where flow='income' and d = p_today - 1), 0),
      'month', coalesce(sum(amount) filter (where flow='income' and d >= v_previous_month and d < v_month_start), 0),
      'year', coalesce(sum(amount) filter (where flow='income' and d < v_year_start), 0)),
    'expense', jsonb_build_object(
      'today', coalesce(sum(amount) filter (where flow='expense' and d = p_today - 1), 0),
      'month', coalesce(sum(amount) filter (where flow='expense' and d >= v_previous_month and d < v_month_start), 0),
      'year', coalesce(sum(amount) filter (where flow='expense' and d < v_year_start), 0))
  ) into v_previous from flows;

  return jsonb_build_object('snapshotVersion','v451','today',p_today::text,
    'currency',p_currency,'previous',v_previous);
end;
$$;
revoke all on function public.dashboard_period_comparison_v451(text,date) from public, anon;
grant execute on function public.dashboard_period_comparison_v451(text,date) to authenticated;
comment on function public.dashboard_period_comparison_v451(text,date) is
  'Finzaro V4.5.1: authenticated, invoker-only prior complete day/month/year income and expense comparison; standard flow, same currency.';
