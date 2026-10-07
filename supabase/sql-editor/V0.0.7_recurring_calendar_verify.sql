-- Finzaro V0.0.7 read-only verification
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('recurring_rules', 'recurring_occurrences')
order by table_name;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('post_recurring_occurrence_v007', 'undo_recurring_occurrence_v007', 'validate_recurring_rule_v007', 'is_recurring_due_date_v007', 'guard_category_recurring_archive_v007', 'guard_account_recurring_archive_v007')
order by routine_name;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('recurring_rules', 'recurring_occurrences')
order by tablename, policyname;

select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in ('recurring_rules_validate_v007', 'categories_guard_recurring_archive_v007', 'accounts_guard_recurring_archive_v007')
order by event_object_table, trigger_name;
