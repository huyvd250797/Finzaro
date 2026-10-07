begin;
select plan(10);

select has_table('public', 'recurring_rules', 'recurring_rules table exists');
select has_table('public', 'recurring_occurrences', 'recurring_occurrences table exists');
select has_column('public', 'recurring_rules', 'frequency', 'recurring_rules.frequency exists');
select has_column('public', 'recurring_rules', 'start_date', 'recurring_rules.start_date exists');
select has_column('public', 'recurring_occurrences', 'due_date', 'occurrence due_date exists');
select col_is_fk('public', 'recurring_rules', 'category_id', 'recurring category is a foreign key');
select col_is_fk('public', 'recurring_occurrences', 'transaction_id', 'occurrence transaction is a foreign key');
select policies_are('public', 'recurring_rules', array['users can insert own recurring rules', 'users can read own recurring rules', 'users can update own recurring rules'], 'recurring rule policies are exact');
select policies_are('public', 'recurring_occurrences', array['users can read own recurring occurrences'], 'occurrence history is read-only through RLS');
select has_trigger('public', 'recurring_rules', 'recurring_rules_validate_v007', 'recurring validation trigger exists');

select * from finish();
rollback;
