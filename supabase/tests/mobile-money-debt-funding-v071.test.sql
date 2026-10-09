-- Finzaro V0.7.1 schema smoke assertions (run through Supabase pgTAP tooling if enabled).
begin;
select plan(6);
select has_table('public', 'liability_funding_events', 'liability_funding_events exists');
select has_column('public', 'liability_funding_events', 'funding_type', 'funding type exists');
select has_column('public', 'liability_funding_events', 'credit_card_id', 'credit card funding reference exists');
select has_column('public', 'liability_funding_events', 'loan_id', 'loan funding reference exists');
select has_function('public', 'create_financial_transaction_v071', 'create v071 RPC exists');
select has_function('public', 'delete_financial_transaction_v071', 'delete v071 RPC exists');
select * from finish();
rollback;
