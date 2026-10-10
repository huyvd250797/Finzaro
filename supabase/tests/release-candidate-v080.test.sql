-- Finzaro V0.8.0 Release Candidate schema smoke assertions.
begin;
select plan(2);

select results_eq(
  $$ select count(*)::bigint from pg_constraint where conrelid = 'public.categories'::regclass and conname = 'categories_icon_allowed_v080' $$,
  array[1::bigint],
  'V0.8.0 category icon allow-list constraint exists'
);

select results_eq(
  $$ select count(*)::bigint from pg_constraint where conrelid = 'public.categories'::regclass and conname = 'categories_icon_allowed_v080' and pg_get_constraintdef(oid) like '%Apple%' and pg_get_constraintdef(oid) like '%Pill%' and pg_get_constraintdef(oid) like '%Zap%' $$,
  array[1::bigint],
  'V0.8.0 category icon allow-list includes expanded icons'
);

select * from finish();
rollback;
