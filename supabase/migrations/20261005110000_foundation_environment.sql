-- Finzaro V0.1.1 — DEV Database Environment
-- Foundation only: reference data, profile/preferences lifecycle, RLS.
-- Accounts/transactions intentionally remain for V0.3/V0.4.

create table if not exists public.supported_currencies (
  code text primary key,
  name text not null,
  symbol text not null,
  decimal_digits smallint not null default 2 check (decimal_digits between 0 and 4),
  is_active boolean not null default true,
  constraint supported_currencies_code_format check (code ~ '^[A-Z]{3}$')
);

comment on table public.supported_currencies is 'Reference currencies available to Finzaro users.';

-- Required reference data belongs in the migration so a linked DEV project is safe
-- immediately after `supabase db push`, even if seed files are not applied remotely.
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

alter table public.supported_currencies enable row level security;

create policy "supported currencies are publicly readable"
on public.supported_currencies
for select
to anon, authenticated
using (is_active = true);

revoke all on table public.supported_currencies from anon, authenticated;
grant select on table public.supported_currencies to anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 100)
);

comment on table public.profiles is 'User-owned profile data paired 1:1 with auth.users.';

create table if not exists public.user_preferences (
  id uuid primary key references auth.users(id) on delete cascade,
  currency_code text not null default 'VND' references public.supported_currencies(code),
  locale text not null default 'vi-VN',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_locale_length check (char_length(locale) between 2 and 32),
  constraint user_preferences_timezone_length check (char_length(timezone) between 3 and 64)
);

comment on table public.user_preferences is 'User-owned default currency, locale and timezone.';

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;

create policy "users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "users can read own preferences"
on public.user_preferences
for select
to authenticated
using ((select auth.uid()) = id);

create policy "users can insert own preferences"
on public.user_preferences
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "users can update own preferences"
on public.user_preferences
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_preferences from anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_preferences to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(nullif(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''), ''), 100)
  );

  insert into public.user_preferences (id)
  values (new.id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
