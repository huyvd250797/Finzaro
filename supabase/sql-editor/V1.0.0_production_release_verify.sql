-- Finzaro V1.0.0 — Production Release verification
-- Read-only verification. This script does not modify schema or financial data.

select
  to_regclass('public.accounts') is not null as accounts_ok,
  to_regclass('public.transactions') is not null as transactions_ok,
  to_regclass('public.transaction_entries') is not null as transaction_entries_ok,
  to_regclass('public.categories') is not null as categories_ok,
  to_regclass('public.loans') is not null as loans_ok,
  to_regclass('public.credit_cards') is not null as credit_cards_ok,
  to_regclass('public.deposits') is not null as deposits_ok,
  to_regclass('public.savings_goals') is not null as savings_goals_ok,
  to_regclass('public.investment_assets') is not null as investment_assets_ok;

select
  (select relrowsecurity from pg_class where oid = 'public.accounts'::regclass) as accounts_rls_ok,
  (select relrowsecurity from pg_class where oid = 'public.transactions'::regclass) as transactions_rls_ok,
  (select relrowsecurity from pg_class where oid = 'public.transaction_entries'::regclass) as transaction_entries_rls_ok,
  (select relrowsecurity from pg_class where oid = 'public.categories'::regclass) as categories_rls_ok;

select
  exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'create_financial_transaction_v071') as transaction_create_rpc_ok,
  exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'delete_financial_transaction_v071') as transaction_delete_rpc_ok,
  exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'apply_credit_card_payment_v0012') as credit_card_payment_rpc_ok,
  exists(select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'post_recurring_occurrence_v007') as recurring_post_rpc_ok;

select
  to_regclass('public.transactions_user_date_idx') is not null as transactions_user_date_idx_ok,
  to_regclass('public.transactions_user_category_date_idx') is not null as transactions_category_date_idx_ok,
  to_regclass('public.loan_payments_user_date_idx') is not null as loan_payments_user_date_idx_ok,
  to_regclass('public.credit_card_payments_user_date_idx') is not null as credit_card_payments_user_date_idx_ok,
  to_regclass('public.asset_valuations_user_date_idx') is not null as asset_valuations_user_date_idx_ok;

select
  count(*) = 1 as category_icon_constraint_ok
from pg_constraint
where conrelid = 'public.categories'::regclass
  and conname = 'categories_icon_allowed_v080';

select count(*) as unsupported_existing_icons
from public.categories
where icon_name not in ('Shapes','Briefcase','Gift','Laptop','Store','TrendingUp','RotateCcw','CircleDollarSign','Utensils','Home','Car','ShoppingBag','ShoppingCart','ReceiptText','HeartPulse','GraduationCap','Gamepad2','Users','MoreHorizontal','Coffee','Plane','Bus','TrainFront','Fuel','Baby','PawPrint','Dog','Shirt','Smartphone','Wifi','CreditCard','Dumbbell','Stethoscope','BookOpen','Film','Music','Landmark','WalletCards','PiggyBank','Building2','Coins','Banknote','CakeSlice','Camera','Donut','PartyPopper','Shield','Soup','Bike','BedDouble','Tv','Wrench','AlarmClock','Ambulance','Apple','Bath','Beer','Cat','Clapperboard','Cloud','Fish','Flower2','HandCoins','HandHeart','Hotel','KeyRound','Library','Mail','MapPin','Medal','Monitor','Moon','Package','Palette','Phone','Pill','School','Scissors','Sparkles','Sun','Ticket','Trophy','Umbrella','Zap');

-- Expected:
-- - every *_ok column above is true
-- - unsupported_existing_icons = 0
