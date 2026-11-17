-- Finzaro V4.5.7 — Full Previous Period Comparison
-- Compare current day/month/year through today with COMPLETE prior calendar day/month/year.
-- Never compare partial previous months/years. Return current totals as reconciliation guard.
-- No data writes; additive RPC preserves v455 for rollback.
create or replace function public.dashboard_period_comparison_v457(p_currency text, p_today date)
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
  v_previous_month_end date := v_month_start - 1;
  v_previous_year_end date := v_year_start - 1;
  v_previous jsonb;
  v_current jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
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

  return jsonb_build_object('snapshotVersion', 'v457', 'today', p_today::text,
    'currency', p_currency,
    'ranges', jsonb_build_object(
      'today', jsonb_build_object('from', v_previous_day::text, 'to', v_previous_day::text),
      'month', jsonb_build_object('from', v_previous_month::text, 'to', v_previous_month_end::text),
      'year', jsonb_build_object('from', v_previous_year::text, 'to', v_previous_year_end::text)),
    'previous', v_previous, 'current', v_current);
end;
$$;
revoke all on function public.dashboard_period_comparison_v457(text,date) from public, anon;
grant execute on function public.dashboard_period_comparison_v457(text,date) to authenticated;
comment on function public.dashboard_period_comparison_v457(text,date) is
  'Finzaro V4.5.7: completed yesterday/previous month/previous year baselines and partial current periods; authenticated invoker read-only standard flows.';
