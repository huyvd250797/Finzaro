-- Finzaro V4.6.1 — Asset Management UX & Edit.
-- Additive migration. Preserves all V4.6.0 positions and trade history.
-- The opening buy may be corrected. All subsequent buy/sell trades are replayed
-- under the position row lock, so quantity, cost basis and realized gains reconcile.
-- Historical daily portfolio snapshots are immutable past observations.

create or replace function public.portfolio_opening_trades_v461()
returns table(position_id uuid, quantity numeric, unit_price numeric, fee numeric, trade_count bigint)
language sql stable security invoker set search_path = '' as $$
  with numbered as (
    select t.position_id, t.quantity, t.unit_price, t.fee,
      count(*) over (partition by t.position_id) as trade_count,
      row_number() over (partition by t.position_id order by t.traded_at, t.created_at, t.id) as rn
    from public.portfolio_trades_v460 t
    where t.user_id = (select auth.uid())
  )
  select n.position_id, n.quantity, n.unit_price, n.fee, n.trade_count
  from numbered n where n.rn = 1;
$$;
revoke all on function public.portfolio_opening_trades_v461() from public, anon;
grant execute on function public.portfolio_opening_trades_v461() to authenticated;

create or replace function public.portfolio_edit_v461(
  p_position_id uuid, p_name text, p_symbol text, p_variant text, p_exchange text,
  p_provider text, p_manual_price numeric,
  p_initial_quantity numeric, p_initial_buy_price numeric, p_initial_fee numeric
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_position public.portfolio_positions_v460%rowtype;
  v_symbol text := upper(btrim(coalesce(p_symbol, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_variant text := coalesce(p_variant, '');
  v_exchange text := coalesce(p_exchange, '');
  v_opening record;
  v_trade record;
  v_qty numeric := 0;
  v_cost numeric := 0;
  v_out_cost numeric;
  v_gain numeric;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_position from public.portfolio_positions_v460
    where id = p_position_id and user_id = v_uid for update;
  if not found then raise exception 'Tài sản không tồn tại hoặc không có quyền sửa' using errcode = '42501'; end if;

  if char_length(v_name) not between 1 and 120 then
    raise exception 'Tên tài sản cần từ 1 đến 120 ký tự' using errcode = '22023';
  end if;
  if p_initial_quantity is null or p_initial_quantity <= 0 or p_initial_quantity > 1000000000000
    or p_initial_buy_price is null or p_initial_buy_price <= 0 or p_initial_buy_price > 1000000000000
    or p_initial_fee is null or p_initial_fee < 0 or p_initial_fee > 1000000000000
    or p_manual_price is not null and (p_manual_price <= 0 or p_manual_price > 1000000000000) then
    raise exception 'Số lượng, giá mua, phí hoặc giá tham khảo không hợp lệ' using errcode = '22023';
  end if;
  if v_position.kind = 'gold' then
    if v_symbol <> 'GOLD9999' or v_variant not in ('pnj_ring', 'sjc_bar', 'other_ring')
      or v_exchange <> '' or p_provider not in ('pnj', 'manual')
      or p_initial_quantity * 10 <> trunc(p_initial_quantity * 10) then
      raise exception 'Dữ liệu vàng 9999 không hợp lệ; khối lượng tối thiểu 0,1 chỉ' using errcode = '22023';
    end if;
  elsif v_position.kind = 'stock' then
    if v_symbol !~ '^[A-Z0-9]{2,15}$' or v_variant <> '' or v_exchange not in ('HOSE','HNX','UPCOM')
      or p_provider not in ('ssi','manual') or p_initial_quantity <> trunc(p_initial_quantity) then
      raise exception 'Mã, sàn hoặc số lượng cổ phiếu không hợp lệ' using errcode = '22023';
    end if;
  elsif v_position.kind = 'crypto' then
    if v_symbol !~ '^[A-Z0-9]{2,15}$' or v_variant <> '' or v_exchange <> '' or p_provider not in ('binance','manual') then
      raise exception 'Mã crypto hoặc nguồn giá không hợp lệ' using errcode = '22023';
    end if;
  else
    raise exception 'Loại tài sản không được hỗ trợ' using errcode = '22023';
  end if;

  select t.id, t.side into v_opening from public.portfolio_trades_v460 t
    where t.position_id = p_position_id and t.user_id = v_uid
    order by t.traded_at, t.created_at, t.id limit 1 for update;
  if not found or v_opening.side <> 'buy' then
    raise exception 'Không tìm được giao dịch mua ban đầu; không thể chỉnh giá vốn an toàn' using errcode = '22023';
  end if;

  update public.portfolio_trades_v460
    set quantity = p_initial_quantity, unit_price = p_initial_buy_price, fee = p_initial_fee
    where id = v_opening.id and user_id = v_uid and position_id = p_position_id;

  for v_trade in
    select t.id, t.side, t.quantity, t.unit_price, t.fee, t.realized_gain
    from public.portfolio_trades_v460 t
    where t.position_id = p_position_id and t.user_id = v_uid
    order by t.traded_at, t.created_at, t.id for update
  loop
    if v_position.kind = 'gold' and v_trade.quantity * 10 <> trunc(v_trade.quantity * 10) then
      raise exception 'Lịch sử vàng có khối lượng không hợp lệ' using errcode = '22023';
    end if;
    if v_position.kind = 'stock' and v_trade.quantity <> trunc(v_trade.quantity) then
      raise exception 'Lịch sử cổ phiếu có khối lượng không hợp lệ' using errcode = '22023';
    end if;
    if v_trade.side = 'buy' then
      v_qty := v_qty + v_trade.quantity;
      v_cost := round(v_cost + v_trade.quantity * v_trade.unit_price + v_trade.fee, 8);
      if v_trade.realized_gain is not null then
        update public.portfolio_trades_v460 set realized_gain = null where id = v_trade.id and user_id = v_uid;
      end if;
    else
      if v_qty <= 0 or v_trade.quantity > v_qty then
        raise exception 'Số lượng sửa khiến một giao dịch bán trong lịch sử vượt quá số đang sở hữu' using errcode = '22023';
      end if;
      v_out_cost := round(v_cost * (v_trade.quantity / v_qty), 8);
      v_gain := round(v_trade.quantity * v_trade.unit_price - v_trade.fee - v_out_cost, 8);
      v_qty := v_qty - v_trade.quantity;
      v_cost := case when v_qty = 0 then 0 else greatest(0, v_cost - v_out_cost) end;
      if v_trade.realized_gain is distinct from v_gain then
        update public.portfolio_trades_v460 set realized_gain = v_gain where id = v_trade.id and user_id = v_uid;
      end if;
    end if;
    if v_qty > 1000000000000 or v_cost > 9999999999999999999999 then
      raise exception 'Giá trị danh mục vượt giới hạn lưu trữ' using errcode = '22003';
    end if;
  end loop;

  update public.portfolio_positions_v460 set
    name = v_name, symbol = v_symbol, variant = v_variant, exchange = v_exchange,
    provider = p_provider, manual_price = p_manual_price,
    quantity = v_qty, cost_total = v_cost, updated_at = now()
    where id = p_position_id and user_id = v_uid;
  return true;
end;
$$;
revoke all on function public.portfolio_edit_v461(uuid,text,text,text,text,text,numeric,numeric,numeric,numeric) from public, anon;
grant execute on function public.portfolio_edit_v461(uuid,text,text,text,text,text,numeric,numeric,numeric,numeric) to authenticated;
comment on function public.portfolio_edit_v461(uuid,text,text,text,text,text,numeric,numeric,numeric,numeric) is
  'Finzaro V4.6.1: owner-scoped, transactional correction of opening purchase + identity and pricing; replay trades to reconcile current cost basis and realized gains.';
