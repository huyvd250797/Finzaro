-- Finzaro V0.7.0 — Advanced Debt Strategy + SSI Market Data holdings
-- Run after V0.6.0 Investment & Asset Tracking.

-- -----------------------------------------------------------------------------
-- Advanced Debt Strategy preferences
-- -----------------------------------------------------------------------------
create table if not exists public.debt_strategy_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_code text not null references public.supported_currencies(code),
  strategy text not null default 'avalanche',
  extra_monthly_minor bigint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint debt_strategy_plans_strategy_check check (strategy in ('avalanche','snowball')),
  constraint debt_strategy_plans_extra_check check (extra_monthly_minor between 0 and 9007199254740991),
  constraint debt_strategy_plans_notes_check check (notes is null or char_length(notes) <= 1000),
  constraint debt_strategy_plans_user_currency_unique unique (user_id, currency_code)
);

create index if not exists debt_strategy_plans_user_currency_idx on public.debt_strategy_plans (user_id, currency_code);
alter table public.debt_strategy_plans enable row level security;

drop policy if exists "users can read own debt strategy plans" on public.debt_strategy_plans;
create policy "users can read own debt strategy plans" on public.debt_strategy_plans for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "users can insert own debt strategy plans" on public.debt_strategy_plans;
create policy "users can insert own debt strategy plans" on public.debt_strategy_plans for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "users can update own debt strategy plans" on public.debt_strategy_plans;
create policy "users can update own debt strategy plans" on public.debt_strategy_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on table public.debt_strategy_plans from anon, authenticated;
grant select on table public.debt_strategy_plans to authenticated;
grant insert (user_id, currency_code, strategy, extra_monthly_minor, notes) on public.debt_strategy_plans to authenticated;
grant update (strategy, extra_monthly_minor, notes) on public.debt_strategy_plans to authenticated;

drop trigger if exists debt_strategy_plans_set_updated_at on public.debt_strategy_plans;
create trigger debt_strategy_plans_set_updated_at before update on public.debt_strategy_plans for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Stock holding fields for automated market valuation
-- -----------------------------------------------------------------------------
alter table public.investment_assets add column if not exists ticker_symbol text;
alter table public.investment_assets add column if not exists exchange text;
alter table public.investment_assets add column if not exists average_buy_price_minor bigint;
alter table public.investment_assets add column if not exists market_price_minor bigint;
alter table public.investment_assets add column if not exists market_price_updated_at timestamptz;
alter table public.investment_assets add column if not exists market_data_provider text not null default 'manual';
alter table public.investment_assets add column if not exists auto_price_enabled boolean not null default false;

alter table public.investment_assets drop constraint if exists investment_assets_ticker_check;
alter table public.investment_assets add constraint investment_assets_ticker_check check (
  ticker_symbol is null or ticker_symbol ~ '^[A-Z0-9][A-Z0-9._-]{0,19}$'
);
alter table public.investment_assets drop constraint if exists investment_assets_exchange_check;
alter table public.investment_assets add constraint investment_assets_exchange_check check (
  exchange is null or exchange in ('HOSE','HNX','UPCOM','OTHER')
);
alter table public.investment_assets drop constraint if exists investment_assets_average_buy_price_check;
alter table public.investment_assets add constraint investment_assets_average_buy_price_check check (
  average_buy_price_minor is null or average_buy_price_minor between 0 and 9007199254740991
);
alter table public.investment_assets drop constraint if exists investment_assets_market_price_check;
alter table public.investment_assets add constraint investment_assets_market_price_check check (
  market_price_minor is null or market_price_minor between 0 and 9007199254740991
);
alter table public.investment_assets drop constraint if exists investment_assets_market_provider_check;
alter table public.investment_assets add constraint investment_assets_market_provider_check check (
  market_data_provider in ('manual','ssi')
);

create index if not exists investment_assets_user_ticker_idx on public.investment_assets (user_id, ticker_symbol) where ticker_symbol is not null;

grant insert (ticker_symbol, exchange, average_buy_price_minor, market_price_minor, market_price_updated_at, market_data_provider, auto_price_enabled) on public.investment_assets to authenticated;
grant update (ticker_symbol, exchange, average_buy_price_minor, market_price_minor, market_price_updated_at, market_data_provider, auto_price_enabled) on public.investment_assets to authenticated;

create or replace function public.validate_investment_asset_v070()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.asset_type = 'stock' then
    if new.ticker_symbol is not null then new.ticker_symbol := upper(btrim(new.ticker_symbol)); end if;
    if new.exchange is not null then new.exchange := upper(btrim(new.exchange)); end if;
    if new.auto_price_enabled and (new.ticker_symbol is null or new.ticker_symbol = '') then
      raise exception 'Ticker symbol is required when automatic market pricing is enabled.' using errcode = '22023';
    end if;
    if new.auto_price_enabled and new.currency_code <> 'VND' then
      raise exception 'SSI automatic pricing currently supports VND-listed Vietnam equities only.' using errcode = '22023';
    end if;
    if new.average_buy_price_minor is not null and (new.quantity is null or new.quantity <= 0) then
      raise exception 'Stock quantity must be greater than zero when average buy price is supplied.' using errcode = '22023';
    end if;
  else
    new.ticker_symbol := null;
    new.exchange := null;
    new.average_buy_price_minor := null;
    new.market_price_minor := null;
    new.market_price_updated_at := null;
    new.market_data_provider := 'manual';
    new.auto_price_enabled := false;
  end if;
  return new;
end;
$$;
drop trigger if exists investment_assets_validate_market_data_v070 on public.investment_assets;
create trigger investment_assets_validate_market_data_v070 before insert or update on public.investment_assets for each row execute function public.validate_investment_asset_v070();
revoke execute on function public.validate_investment_asset_v070() from public, anon, authenticated;

comment on table public.debt_strategy_plans is 'Finzaro V0.7.0 saved Avalanche/Snowball planning preferences by currency.';
comment on column public.investment_assets.ticker_symbol is 'V0.7.0 exchange symbol used by an external market data provider such as SSI FastConnect.';
comment on column public.investment_assets.market_price_minor is 'Latest market price per unit in minor currency units, refreshed by a server-side market data provider.';

-- Avoid creating thousands of valuation rows when SSI prices refresh repeatedly.
create or replace function public.record_asset_valuation_v070()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_existing uuid;
  v_note text;
begin
  if tg_op = 'INSERT' then
    insert into public.asset_valuations (user_id, asset_id, valuation_date, value_minor, cost_basis_minor, notes)
    values (new.user_id, new.id, new.valuation_date, new.current_value_minor, new.cost_basis_minor, 'Giá trị ban đầu');
    return new;
  end if;

  if new.current_value_minor is not distinct from old.current_value_minor
     and new.cost_basis_minor is not distinct from old.cost_basis_minor
     and new.valuation_date is not distinct from old.valuation_date then
    return new;
  end if;

  if new.market_data_provider = 'ssi' and new.auto_price_enabled and new.market_price_updated_at is distinct from old.market_price_updated_at then
    v_note := 'SSI Market Data';
    select id into v_existing
      from public.asset_valuations
      where asset_id = new.id and valuation_date = new.valuation_date and notes = v_note
      order by created_at desc limit 1;
    if v_existing is null then
      insert into public.asset_valuations (user_id, asset_id, valuation_date, value_minor, cost_basis_minor, notes)
      values (new.user_id, new.id, new.valuation_date, new.current_value_minor, new.cost_basis_minor, v_note);
    else
      update public.asset_valuations
         set value_minor = new.current_value_minor,
             cost_basis_minor = new.cost_basis_minor,
             created_at = now()
       where id = v_existing;
    end if;
  else
    insert into public.asset_valuations (user_id, asset_id, valuation_date, value_minor, cost_basis_minor, notes)
    values (new.user_id, new.id, new.valuation_date, new.current_value_minor, new.cost_basis_minor, 'Cập nhật định giá');
  end if;
  return new;
end;
$$;
drop trigger if exists investment_assets_record_valuation_v060 on public.investment_assets;
drop trigger if exists investment_assets_record_valuation_v070 on public.investment_assets;
create trigger investment_assets_record_valuation_v070 after insert or update on public.investment_assets for each row execute function public.record_asset_valuation_v070();
revoke execute on function public.record_asset_valuation_v070() from public, anon, authenticated;
