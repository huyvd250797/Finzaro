begin;

select plan(8);

select has_table('public', 'supported_currencies', 'supported_currencies exists');
select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'user_preferences', 'user_preferences exists');
select has_column('public', 'profiles', 'id', 'profiles.id exists');
select has_column('public', 'user_preferences', 'currency_code', 'preferences currency exists');
select policies_are('public', 'profiles', array['users can read own profile', 'users can update own profile'], 'profile RLS policies exist');
select policies_are('public', 'user_preferences', array['users can insert own preferences', 'users can read own preferences', 'users can update own preferences'], 'preferences RLS policies exist');
select results_eq(
  $$ select count(*)::bigint from public.supported_currencies where is_active $$,
  array[5::bigint],
  'five active currencies are seeded'
);

select * from finish();
rollback;
