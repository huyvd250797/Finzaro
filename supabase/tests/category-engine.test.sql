begin;

select plan(12);

select has_table('public', 'categories', 'categories exists');
select has_column('public', 'categories', 'icon_name', 'category icon exists');
select has_column('public', 'categories', 'parent_id', 'category parent exists');
select has_column('public', 'transactions', 'category_id', 'structured transaction category exists');
select col_is_fk('public', 'transactions', 'category_id', 'transaction category is a foreign key');
select policies_are('public', 'categories', array['users can insert own categories','users can read own categories','users can update own categories'], 'category RLS policies exist');
select has_function('public', 'ensure_default_categories_v005', array['uuid'], 'default category function exists');
select has_function('public', 'create_financial_transaction_v005', array['text','text','uuid','text','date','uuid','uuid','bigint','bigint'], 'category-aware transaction function exists');
select has_function('public', 'delete_financial_transaction_v005', array['uuid'], 'V0.0.5 delete function exists');
select has_trigger('public', 'categories', 'categories_set_updated_at', 'category updated_at trigger exists');
select has_trigger('public', 'categories', 'categories_validate_parent_v005', 'category hierarchy trigger exists');
select has_index('public', 'categories', 'categories_user_system_key_unique', 'system category uniqueness exists');

select * from finish();
rollback;
