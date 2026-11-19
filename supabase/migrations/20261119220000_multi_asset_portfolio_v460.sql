-- Finzaro V4.6.0 — Multi-Asset Portfolio. Additive: historical investment_assets remain untouched.
-- Units: gold quantity in CHI (0.1 chi = 1 phan), stock in shares, crypto in tokens.
-- Money: stock/gold quote VND per share/chi; crypto quote USDT per token.
create table if not exists public.portfolio_positions_v460 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('gold','stock','crypto')),
  symbol text not null check (symbol ~ '^[A-Z0-9][A-Z0-9._-]{0,19}$'),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  variant text not null default '' check (variant in ('','pnj_ring','sjc_bar','other_ring')),
  exchange text not null default '' check (exchange in ('','HOSE','HNX','UPCOM')),
  quote_currency text not null check (quote_currency in ('VND','USDT')),
  provider text not null default 'manual' check (provider in ('manual','binance','ssi','pnj')),
  quantity numeric(30,12) not null default 0 check (quantity >= 0),
  cost_total numeric(30,8) not null default 0 check (cost_total >= 0),
  manual_price numeric(30,8) check (manual_price is null or manual_price > 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_unit_v460 check (
    (kind='gold' and quote_currency='VND' and variant<>'' and exchange='' and provider in ('manual','pnj')) or
    (kind='stock' and quote_currency='VND' and exchange<>'' and variant='' and provider in ('manual','ssi')) or
    (kind='crypto' and quote_currency='USDT' and variant='' and exchange='' and provider in ('manual','binance'))
  ),
  constraint portfolio_gold_granularity_v460 check (kind <> 'gold' or quantity * 10 = trunc(quantity * 10))
);
create index if not exists portfolio_positions_v460_owner_idx on public.portfolio_positions_v460(user_id, archived, kind);
create table if not exists public.portfolio_trades_v460 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.portfolio_positions_v460(id) on delete restrict,
  side text not null check(side in ('buy','sell')),
  quantity numeric(30,12) not null check(quantity > 0),
  unit_price numeric(30,8) not null check(unit_price > 0),
  fee numeric(30,8) not null default 0 check(fee >= 0),
  realized_gain numeric(30,8),
  traded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists portfolio_trades_v460_owner_idx on public.portfolio_trades_v460(user_id, position_id, traded_at desc);
create table if not exists public.portfolio_fx_v460 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usdt_vnd numeric(30,8) not null check (usdt_vnd > 0 and usdt_vnd < 1000000),
  source text not null default 'manual' check(source='manual'),
  updated_at timestamptz not null default now()
);
create table if not exists public.portfolio_snapshots_v460 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  estimated_value_vnd numeric(30,2) not null check(estimated_value_vnd >= 0),
  missing_quotes integer not null default 0 check(missing_quotes >= 0),
  created_at timestamptz not null default now(),
  unique(user_id,snapshot_date)
);
create index if not exists portfolio_snapshots_v460_history_idx on public.portfolio_snapshots_v460(user_id,snapshot_date desc);
alter table public.portfolio_positions_v460 enable row level security;
alter table public.portfolio_trades_v460 enable row level security;
alter table public.portfolio_fx_v460 enable row level security;
alter table public.portfolio_snapshots_v460 enable row level security;
create policy "portfolio own positions select v460" on public.portfolio_positions_v460 for select to authenticated using (user_id=(select auth.uid()));
create policy "portfolio own trades select v460" on public.portfolio_trades_v460 for select to authenticated using (user_id=(select auth.uid()));
create policy "portfolio own fx select v460" on public.portfolio_fx_v460 for select to authenticated using (user_id=(select auth.uid()));
create policy "portfolio own snapshot select v460" on public.portfolio_snapshots_v460 for select to authenticated using (user_id=(select auth.uid()));
create policy "portfolio own fx insert v460" on public.portfolio_fx_v460 for insert to authenticated with check(user_id=(select auth.uid()));
create policy "portfolio own fx update v460" on public.portfolio_fx_v460 for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "portfolio own snapshot insert v460" on public.portfolio_snapshots_v460 for insert to authenticated with check(user_id=(select auth.uid()));
create policy "portfolio own snapshot update v460" on public.portfolio_snapshots_v460 for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.portfolio_positions_v460, public.portfolio_trades_v460, public.portfolio_fx_v460, public.portfolio_snapshots_v460 from public, anon, authenticated;
grant select on public.portfolio_positions_v460, public.portfolio_trades_v460, public.portfolio_fx_v460, public.portfolio_snapshots_v460 to authenticated;
grant insert(user_id,usdt_vnd,source) on public.portfolio_fx_v460 to authenticated;
grant update(usdt_vnd,source,updated_at) on public.portfolio_fx_v460 to authenticated;
grant insert(user_id,snapshot_date,estimated_value_vnd,missing_quotes) on public.portfolio_snapshots_v460 to authenticated;
grant update(estimated_value_vnd,missing_quotes,created_at) on public.portfolio_snapshots_v460 to authenticated;

-- Portfolio writes are atomic and serialized per position; never touch account/transaction ledgers.
create or replace function public.portfolio_create_v460(
 p_kind text, p_symbol text, p_name text, p_variant text, p_exchange text,
 p_provider text, p_quantity numeric, p_buy_price numeric, p_fee numeric, p_manual_price numeric default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_id uuid; v_kind text:=lower(btrim(coalesce(p_kind,'')));
 v_symbol text:=upper(btrim(coalesce(p_symbol,'')));
 v_quote text;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_quantity is null or p_quantity <= 0 or p_quantity>1000000000000 or p_buy_price is null or p_buy_price<=0 or p_buy_price>1000000000000 or p_fee is null or p_fee<0 or p_fee>1000000000000 then
   raise exception 'Invalid quantity, buy price or fee' using errcode='22023'; end if;
 if p_manual_price is not null and (p_manual_price<=0 or p_manual_price>1000000000000) then raise exception 'Invalid manual price' using errcode='22023'; end if;
 if v_kind='gold' and p_quantity*10<>trunc(p_quantity*10) then raise exception 'Gold accepts 0.1 chi increments' using errcode='22023'; end if;
 if v_kind='stock' and p_quantity<>trunc(p_quantity) then raise exception 'Shares must be whole units' using errcode='22023'; end if;
 v_quote:=case when v_kind='crypto' then 'USDT' else 'VND' end;
 insert into public.portfolio_positions_v460(user_id,kind,symbol,name,variant,exchange,quote_currency,provider,quantity,cost_total,manual_price)
 values(v_uid,v_kind,v_symbol,btrim(p_name),coalesce(p_variant,''),coalesce(p_exchange,''),v_quote,coalesce(p_provider,'manual'),p_quantity,round(p_quantity*p_buy_price+p_fee,8),p_manual_price)
 returning id into v_id;
 insert into public.portfolio_trades_v460(user_id,position_id,side,quantity,unit_price,fee,realized_gain)
 values(v_uid,v_id,'buy',p_quantity,p_buy_price,p_fee,null);
 return v_id;
end; $$;
create or replace function public.portfolio_trade_v460(p_position_id uuid,p_side text,p_quantity numeric,p_unit_price numeric,p_fee numeric)
 returns boolean language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_position public.portfolio_positions_v460%rowtype;
 v_cost_out numeric; v_realized numeric; v_left numeric;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_side not in ('buy','sell') or p_quantity is null or p_quantity<=0 or p_quantity>1000000000000 or p_unit_price is null or p_unit_price<=0 or p_unit_price>1000000000000 or p_fee is null or p_fee<0 or p_fee>1000000000000 then
   raise exception 'Invalid trade' using errcode='22023'; end if;
 select * into v_position from public.portfolio_positions_v460 where id=p_position_id and user_id=v_uid and archived=false for update;
 if not found then raise exception 'Position does not exist' using errcode='42501'; end if;
 if v_position.kind='gold' and p_quantity*10<>trunc(p_quantity*10) then raise exception 'Gold accepts 0.1 chi increments' using errcode='22023'; end if;
 if v_position.kind='stock' and p_quantity<>trunc(p_quantity) then raise exception 'Shares must be whole units' using errcode='22023'; end if;
 if p_side='sell' and p_quantity>v_position.quantity then raise exception 'Insufficient quantity' using errcode='22023'; end if;
 if p_side='buy' then
  update public.portfolio_positions_v460 set quantity=quantity+p_quantity,cost_total=round(cost_total+p_quantity*p_unit_price+p_fee,8),updated_at=now() where id=p_position_id;
  v_realized:=null;
 else
  v_cost_out:=round(v_position.cost_total*(p_quantity/nullif(v_position.quantity,0)),8);
  v_left:=v_position.quantity-p_quantity;
  v_realized:=round(p_quantity*p_unit_price-p_fee-v_cost_out,8);
  update public.portfolio_positions_v460 set quantity=v_left,cost_total=case when v_left=0 then 0 else greatest(0,cost_total-v_cost_out) end,updated_at=now() where id=p_position_id;
 end if;
 insert into public.portfolio_trades_v460(user_id,position_id,side,quantity,unit_price,fee,realized_gain) values(v_uid,p_position_id,p_side,p_quantity,p_unit_price,p_fee,v_realized);
 return true;
end; $$;
create or replace function public.portfolio_update_v460(p_position_id uuid,p_manual_price numeric,p_provider text,p_archived boolean)
 returns boolean language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_kind text;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_manual_price is not null and (p_manual_price<=0 or p_manual_price>1000000000000) then raise exception 'Invalid price' using errcode='22023'; end if;
 select kind into v_kind from public.portfolio_positions_v460 where id=p_position_id and user_id=v_uid for update;
 if not found then raise exception 'Position not found' using errcode='42501'; end if;
 if not ((v_kind='gold' and p_provider in ('manual','pnj')) or (v_kind='stock' and p_provider in ('manual','ssi')) or (v_kind='crypto' and p_provider in ('manual','binance'))) then raise exception 'Unsupported provider' using errcode='22023'; end if;
 update public.portfolio_positions_v460 set manual_price=p_manual_price,provider=p_provider,archived=p_archived,updated_at=now() where id=p_position_id;
 return true;
end; $$;
revoke all on function public.portfolio_create_v460(text,text,text,text,text,text,numeric,numeric,numeric,numeric), public.portfolio_trade_v460(uuid,text,numeric,numeric,numeric), public.portfolio_update_v460(uuid,numeric,text,boolean) from public,anon;
grant execute on function public.portfolio_create_v460(text,text,text,text,text,text,numeric,numeric,numeric,numeric), public.portfolio_trade_v460(uuid,text,numeric,numeric,numeric), public.portfolio_update_v460(uuid,numeric,text,boolean) to authenticated;
comment on table public.portfolio_positions_v460 is 'Finzaro 4.6.0 separate market-priced holdings; previous investment_assets untouched; price never stored as trusted market data here.';
