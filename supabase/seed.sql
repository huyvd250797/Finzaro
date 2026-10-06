-- Reference-only seed data. Never put real user or financial data in this file.
insert into public.supported_currencies (code, name, symbol, decimal_digits, is_active)
values
  ('VND', 'Vietnamese Dong', '₫', 0, true),
  ('USD', 'US Dollar', '$', 2, true),
  ('EUR', 'Euro', '€', 2, true),
  ('JPY', 'Japanese Yen', '¥', 0, true),
  ('SGD', 'Singapore Dollar', 'S$', 2, true)
on conflict (code) do update set
  name = excluded.name,
  symbol = excluded.symbol,
  decimal_digits = excluded.decimal_digits,
  is_active = excluded.is_active;
