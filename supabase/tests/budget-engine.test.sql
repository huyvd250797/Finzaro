begin;
select plan(8);

select has_table('public', 'budgets', 'budgets table exists');
select has_column('public', 'budgets', 'category_id', 'budgets.category_id exists');
select has_column('public', 'budgets', 'month_start', 'budgets.month_start exists');
select has_column('public', 'budgets', 'amount_minor', 'budgets.amount_minor exists');
select col_is_fk('public', 'budgets', 'category_id', 'budget category is a foreign key');
select col_is_fk('public', 'budgets', 'currency_code', 'budget currency is a foreign key');
select policies_are('public', 'budgets', array['users can insert own budgets', 'users can read own budgets', 'users can update own budgets'], 'budget RLS policies are exact');
select has_trigger('public', 'budgets', 'budgets_validate_v006', 'budget validation trigger exists');

select * from finish();
rollback;
