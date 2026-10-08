-- Read-only verification for Finzaro V0.3.0
select table_name from information_schema.tables where table_schema = 'public' and table_name = 'forecast_scenarios';
select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'forecast_scenarios' order by ordinal_position;
select indexname from pg_indexes where schemaname = 'public' and tablename = 'forecast_scenarios' order by indexname;
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'forecast_scenarios' order by policyname;
