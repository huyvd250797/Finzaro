-- Finzaro V1.1.0 — UI Design System & Visual Polish
-- Transfer-to-savings can optionally contribute to an existing Savings Goal atomically.

create or replace function public.create_transfer_with_goal_v110(
  p_title text,
  p_notes text default null,
  p_transaction_date date default current_date,
  p_from_account_id uuid default null,
  p_to_account_id uuid default null,
  p_from_amount_minor bigint default null,
  p_to_amount_minor bigint default null,
  p_savings_goal_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tx_id uuid;
  v_destination public.accounts%rowtype;
  v_goal public.savings_goals%rowtype;
  v_linked_goal_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_savings_goal_id is not null then
    if p_to_account_id is null or p_to_amount_minor is null or p_to_amount_minor <= 0 then
      raise exception 'Savings goal contribution requires a valid destination account and positive amount.' using errcode = '22023';
    end if;

    select * into v_destination
    from public.accounts
    where id = p_to_account_id and user_id = v_user_id;

    if not found then
      raise exception 'Destination account was not found.' using errcode = '42501';
    end if;
    if v_destination.is_archived then
      raise exception 'Archived accounts cannot receive new transfers.' using errcode = '22023';
    end if;
    if v_destination.account_type <> 'savings' then
      raise exception 'Savings goal contribution requires a savings destination account.' using errcode = '22023';
    end if;

    select * into v_goal
    from public.savings_goals
    where id = p_savings_goal_id and user_id = v_user_id;

    if not found then
      raise exception 'Savings goal was not found.' using errcode = '42501';
    end if;
    if v_goal.is_archived then
      raise exception 'Archived savings goal cannot receive new entries.' using errcode = '22023';
    end if;
    if v_goal.currency_code <> v_destination.currency_code then
      raise exception 'Savings goal currency must match the destination savings account.' using errcode = '22023';
    end if;
    if v_goal.linked_account_id is not null and v_goal.linked_account_id <> p_to_account_id then
      raise exception 'Savings goal is linked to a different savings account.' using errcode = '22023';
    end if;

    select g.id into v_linked_goal_id
    from public.savings_goals g
    where g.user_id = v_user_id
      and g.linked_account_id = p_to_account_id
      and g.is_archived = false
    limit 1;

    if v_linked_goal_id is not null and v_linked_goal_id <> p_savings_goal_id then
      raise exception 'Destination savings account is already linked to another active goal.' using errcode = '23505';
    end if;
  end if;

  v_tx_id := public.create_financial_transaction_v071(
    p_transaction_type => 'transfer',
    p_title => p_title,
    p_category_id => null,
    p_notes => p_notes,
    p_transaction_date => p_transaction_date,
    p_from_account_id => p_from_account_id,
    p_to_account_id => p_to_account_id,
    p_from_amount_minor => p_from_amount_minor,
    p_to_amount_minor => p_to_amount_minor,
    p_transaction_purpose => 'transfer'
  );

  if p_savings_goal_id is not null and not exists (
    select 1 from public.savings_goal_entries
    where user_id = v_user_id
      and goal_id = p_savings_goal_id
      and transaction_id = v_tx_id
  ) then
    insert into public.savings_goal_entries (
      user_id, goal_id, entry_type, amount_minor, entry_date, transaction_id, notes
    ) values (
      v_user_id,
      p_savings_goal_id,
      'contribution',
      p_to_amount_minor,
      p_transaction_date,
      v_tx_id,
      'Thêm vào mục tiêu từ giao dịch chuyển tiền V1.1.0'
    );
  end if;

  return v_tx_id;
end;
$$;

revoke execute on function public.create_transfer_with_goal_v110(text,text,date,uuid,uuid,bigint,bigint,uuid) from public, anon;
grant execute on function public.create_transfer_with_goal_v110(text,text,date,uuid,uuid,bigint,bigint,uuid) to authenticated;

comment on function public.create_transfer_with_goal_v110(text,text,date,uuid,uuid,bigint,bigint,uuid)
is 'V1.1.0 atomic transfer wrapper: posts the ledger transfer and optionally adds the destination amount to one compatible Savings Goal.';
