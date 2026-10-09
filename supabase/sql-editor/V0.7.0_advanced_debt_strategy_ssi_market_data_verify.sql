-- Finzaro V0.7.0 verification (read-only)
select table_name from information_schema.tables where table_schema='public' and table_name='debt_strategy_plans';
select column_name, data_type from information_schema.columns where table_schema='public' and table_name='investment_assets' and column_name in ('ticker_symbol','exchange','average_buy_price_minor','market_price_minor','market_price_updated_at','market_data_provider','auto_price_enabled') order by column_name;
select policyname, tablename from pg_policies where schemaname='public' and tablename='debt_strategy_plans' order by policyname;
select indexname from pg_indexes where schemaname='public' and indexname in ('debt_strategy_plans_user_currency_idx','investment_assets_user_ticker_idx') order by indexname;
