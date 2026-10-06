-- Finzaro V0.0.5 Category Engine verification — read only.
select table_name
from information_schema.tables
where table_schema = 'public' and table_name in ('categories', 'transactions')
order by table_name;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'transactions' and column_name in ('category_id', 'category_label')
order by column_name;

select category_type, count(*) as total, count(*) filter (where is_system) as system_total
from public.categories
group by category_type
order by category_type;

select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'categories'
order by policyname;
