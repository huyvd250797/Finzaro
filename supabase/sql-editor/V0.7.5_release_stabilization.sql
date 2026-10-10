-- Finzaro V0.7.5 — Release Stabilization
-- No feature/schema expansion. Adds indexes that match existing high-frequency
-- user-scoped history queries so Loans, Credit Cards and Asset valuation pages
-- do not fall back to broader scans as history grows.

create index if not exists loan_payments_user_date_idx
  on public.loan_payments (user_id, payment_date desc, created_at desc);

create index if not exists credit_card_payments_user_date_idx
  on public.credit_card_payments (user_id, payment_date desc, created_at desc);

create index if not exists asset_valuations_user_date_idx
  on public.asset_valuations (user_id, valuation_date desc, created_at desc);

comment on index public.loan_payments_user_date_idx is 'V0.7.5: accelerates user-scoped loan payment history.';
comment on index public.credit_card_payments_user_date_idx is 'V0.7.5: accelerates user-scoped credit-card payment history.';
comment on index public.asset_valuations_user_date_idx is 'V0.7.5: accelerates user-scoped asset valuation history.';
