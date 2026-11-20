-- Finzaro V4.6.2 — public-source quote cache, owner portfolios remain private.
-- Apply after V4.6.0 and V4.6.1. Does not modify transaction/account ledgers.
-- Prices are reference prices; source provider's terms and feed availability apply.
CREATE TABLE IF NOT EXISTS public.portfolio_market_quotes_v462 (
  quote_key text PRIMARY KEY CHECK (length(quote_key) BETWEEN 8 AND 80),
  kind text NOT NULL CHECK (kind IN ('gold','stock','crypto')),
  symbol text NOT NULL CHECK (length(symbol) BETWEEN 2 AND 20),
  variant text NOT NULL DEFAULT '',
  provider text NOT NULL CHECK (provider IN ('pnj','vci','ssi','binance')),
  price numeric(30,8) NOT NULL CHECK (price > 0),
  quote_currency text NOT NULL CHECK (quote_currency IN ('VND','USDT')),
  source text NOT NULL CHECK (length(source) BETWEEN 3 AND 200),
  observed_at timestamptz NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_consistency_v462 CHECK (
    (kind='gold' AND provider='pnj' AND quote_currency='VND') OR
    (kind='stock' AND provider IN ('vci','ssi') AND quote_currency='VND') OR
    (kind='crypto' AND provider='binance' AND quote_currency='USDT')
  )
);
CREATE INDEX IF NOT EXISTS portfolio_market_quotes_v462_latest ON public.portfolio_market_quotes_v462(fetched_at DESC);
ALTER TABLE public.portfolio_market_quotes_v462 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portfolio_market_quotes_v462 FROM PUBLIC, anon, authenticated;
-- No user financial data in this table; server-only writes, read-only to signed-in users.
GRANT SELECT ON public.portfolio_market_quotes_v462 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_market_quotes_v462 TO service_role;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='portfolio_market_quotes_v462' AND policyname='market quotes read v462') THEN
   CREATE POLICY "market quotes read v462" ON public.portfolio_market_quotes_v462 FOR SELECT TO authenticated USING (true);
 END IF;
END $$;
-- Enable push notifications for changes. A fresh project should already have this publication.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
  AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='portfolio_market_quotes_v462') THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_market_quotes_v462;
 END IF;
END $$;

-- New public VCI source for stocks, but retain optional authenticated SSI and manual selection.
ALTER TABLE public.portfolio_positions_v460 DROP CONSTRAINT IF EXISTS portfolio_positions_v460_provider_check;
ALTER TABLE public.portfolio_positions_v460 ADD CONSTRAINT portfolio_positions_v460_provider_check
 CHECK (provider IN ('manual','binance','ssi','pnj','vci'));
ALTER TABLE public.portfolio_positions_v460 DROP CONSTRAINT IF EXISTS portfolio_unit_v460;
ALTER TABLE public.portfolio_positions_v460 ADD CONSTRAINT portfolio_unit_v460 CHECK (
 (kind='gold' AND quote_currency='VND' AND variant<>'' AND exchange='' AND provider IN ('manual','pnj')) OR
 (kind='stock' AND quote_currency='VND' AND exchange<>'' AND variant='' AND provider IN ('manual','ssi','vci')) OR
 (kind='crypto' AND quote_currency='USDT' AND variant='' AND exchange='' AND provider IN ('manual','binance'))
);
-- Transparent default migration: previous SSI-default holdings use public Vietcap quotes.
-- This changes only quote source; quantities, trades, costs and account ledgers are untouched.
UPDATE public.portfolio_positions_v460 SET provider='vci', updated_at=now()
 WHERE kind='stock' AND provider='ssi';

-- Keep owner-safe opening-trade replay but permit Vietcap as a stock market provider.
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
      or p_provider not in ('ssi','vci','manual') or p_initial_quantity <> trunc(p_initial_quantity) then
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
COMMENT ON FUNCTION public.portfolio_edit_v461(uuid,text,text,text,text,text,numeric,numeric,numeric,numeric) IS 'Finzaro V4.6.2: historical replay + public Vietcap source allowed for stock positions.';


-- v460 position update/archiving RPC must also accept the newly supported VCI provider.
-- Without this replacement, restoring or archiving a VCI stock holding fails with
-- "Unsupported provider" even though the table constraint and edit RPC allow it.
create or replace function public.portfolio_update_v460(p_position_id uuid,p_manual_price numeric,p_provider text,p_archived boolean)
 returns boolean language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_kind text;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_manual_price is not null and (p_manual_price<=0 or p_manual_price>1000000000000) then raise exception 'Invalid price' using errcode='22023'; end if;
 select kind into v_kind from public.portfolio_positions_v460 where id=p_position_id and user_id=v_uid for update;
 if not found then raise exception 'Position not found' using errcode='42501'; end if;
 if not ((v_kind='gold' and p_provider in ('manual','pnj')) or (v_kind='stock' and p_provider in ('manual','ssi','vci')) or (v_kind='crypto' and p_provider in ('manual','binance'))) then raise exception 'Unsupported provider' using errcode='22023'; end if;
 update public.portfolio_positions_v460 set manual_price=p_manual_price,provider=p_provider,archived=p_archived,updated_at=now() where id=p_position_id;
 return true;
end; $$;
