begin;

select plan(12);

select has_table('public', 'transactions', 'transactions exists');
select has_table('public', 'transaction_entries', 'transaction_entries exists');
select has_column('public', 'transactions', 'transaction_type', 'transaction type exists');
select has_column('public', 'transactions', 'transaction_date', 'transaction date exists');
select has_column('public', 'transaction_entries', 'amount_minor', 'signed amount exists');
select has_column('public', 'transaction_entries', 'account_id', 'entry account exists');
select policies_are('public', 'transactions', array['users can read own transactions'], 'transaction read policy exists');
select policies_are('public', 'transaction_entries', array['users can read own transaction entries'], 'entry read policy exists');
select has_function('public', 'create_financial_transaction_v004', array['text','text','text','text','date','uuid','uuid','bigint','bigint'], 'transaction creation function exists');
select has_function('public', 'delete_financial_transaction_v004', array['uuid'], 'transaction deletion function exists');
select has_trigger('public', 'accounts', 'accounts_enforce_opening_balance_v004', 'account opening balance trigger exists');
select col_is_fk('public', 'transaction_entries', 'account_id', 'entry account is a foreign key');

select * from finish();
rollback;
