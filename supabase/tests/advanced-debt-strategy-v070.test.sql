-- Finzaro V0.7.0 schema smoke assertions (run through Supabase pgTAP tooling if enabled).
begin;
select plan(6);
select has_table('public', 'debt_strategy_plans', 'debt_strategy_plans exists');
select has_column('public', 'investment_assets', 'ticker_symbol', 'ticker symbol exists');
select has_column('public', 'investment_assets', 'average_buy_price_minor', 'average buy price exists');
select has_column('public', 'investment_assets', 'market_price_minor', 'market price exists');
select has_column('public', 'investment_assets', 'market_data_provider', 'market provider exists');
select has_column('public', 'investment_assets', 'auto_price_enabled', 'auto-price flag exists');
select * from finish();
rollback;
