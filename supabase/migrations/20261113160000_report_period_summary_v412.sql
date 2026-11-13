-- Finzaro V4.1.2 - fast per-period report aggregates.
-- Explicit auth.uid() scoping; NO stored snapshots, no existing data changes.
-- A single database request returns category/bucket totals instead of loading
-- every transaction plus its ledger entries for each month/year navigation.
create or replace function public.report_period_summary_v412(
  p_from_date date,
  p_to_date date,
  p_currency text,
  p_mode text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_from_date is null or p_to_date is null or p_to_date < p_from_date
    or p_to_date > p_from_date + 366
    or p_currency is null or length(p_currency) > 8
    or p_mode not in ('month', 'year') then
    raise exception 'Invalid report period parameters' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'type', r.transaction_type,
    'id', r.category_id,
    'label', r.category_label,
    'iconName', r.icon_name,
    'iconColor', r.icon_color,
    'bucket', r.bucket,
    'amount', r.amount,
    'count', r.row_count
  ) order by r.transaction_type, r.category_label, r.bucket), '[]'::jsonb)
  into v_rows
  from (
    select
      t.transaction_type,
      t.category_id,
      max(coalesce(c.name, t.category_label, 'Chưa phân loại')) as category_label,
      max(coalesce(c.icon_name, case when t.transaction_type = 'income' then 'CircleDollarSign' else 'Shapes' end)) as icon_name,
      max(coalesce(c.icon_color, '#0d8b66')) as icon_color,
      case when p_mode = 'year' then to_char(t.transaction_date, 'YYYY-MM')
           else to_char(t.transaction_date, 'YYYY-MM-DD') end as bucket,
      sum(abs(e.amount_minor::numeric)) as amount,
      count(*) as row_count
    from public.transactions t
    join public.transaction_entries e on e.transaction_id = t.id
      and e.user_id = t.user_id and e.entry_role = t.transaction_type
    left join public.categories c on c.id = t.category_id and c.user_id = t.user_id
    where t.user_id = (select auth.uid())
      and t.transaction_type in ('income', 'expense')
      and coalesce(t.transaction_purpose, 'standard') = 'standard'
      and t.transaction_date between p_from_date and p_to_date
      and e.currency_code = upper(p_currency)
    group by t.transaction_type, t.category_id,
      case when p_mode = 'year' then to_char(t.transaction_date, 'YYYY-MM')
           else to_char(t.transaction_date, 'YYYY-MM-DD') end
  ) r;

  return jsonb_build_object('rows', v_rows);
end;
$$;

revoke all on function public.report_period_summary_v412(date,date,text,text) from public, anon;
grant execute on function public.report_period_summary_v412(date,date,text,text) to authenticated;
comment on function public.report_period_summary_v412(date,date,text,text)
  is 'V4.1.2: authenticated, currency-scoped income/expense category aggregates for fast month/year navigation.';
