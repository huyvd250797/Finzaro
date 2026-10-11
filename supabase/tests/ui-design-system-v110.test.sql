begin;
select plan(3);
select has_function(
  'public',
  'create_transfer_with_goal_v110',
  array['text','text','date','uuid','uuid','bigint','bigint','uuid']::text[],
  'V1.1.0 atomic Savings transfer + Goal RPC exists'
);
select has_function(
  'public',
  'create_financial_transaction_v071',
  array['text','text','uuid','text','date','uuid','uuid','bigint','bigint','text','uuid','uuid','bigint','bigint','bigint','text','text','numeric','integer','date','text','text','bigint']::text[],
  'underlying V0.7.1 transaction RPC remains available'
);
select has_function(
  'public',
  'delete_financial_transaction_v071',
  array['uuid']::text[],
  'rollback-aware transaction delete RPC remains available'
);
select * from finish();
rollback;
