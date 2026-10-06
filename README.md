# Finzaro V0.0.3 — Account Core

Finzaro is a PWA-first personal finance application built with Next.js, Supabase and Vercel. V0.0.3 upgrades the authenticated V0.0.2 foundation with real user-owned financial accounts and real account balances on the Dashboard.

## Release scope

V0.0.3 includes:

- Real `accounts` table in Supabase
- Cash, bank, e-wallet and savings account types
- Create and edit account flows
- Archive / restore lifecycle instead of destructive deletion in the UI
- Opening balance + current balance stored in minor units (`BIGINT`)
- Per-account currency
- Per-user Row Level Security
- Real Accounts page backed by Supabase
- Dashboard Total Balance backed by real accounts
- Multi-currency safety: totals are grouped by currency and the headline total only sums the user's default currency
- Account empty states and first-account onboarding
- Central application version constants in `lib/app-version.ts`
- Current Finzaro version displayed in the authenticated header, sidebar, auth UI and Settings
- V0.0.3 SQL Editor script and verification query
- Account Core smoke tests

Transactions, income, expense and transfer logic remain demo-only until V0.0.4.

## Required database step — SQL Editor workflow

If V0.1.1 foundation was already applied, **do not run it again**.

Open Supabase:

```text
Supabase Dashboard
→ SQL Editor
→ New query
```

Copy the full content of:

```text
supabase/sql-editor/V0.0.3_account_core.sql
```

Paste it into SQL Editor and click **Run**.

The script creates:

```text
public.accounts
├── id
├── user_id
├── name
├── account_type
├── currency_code
├── institution_name
├── opening_balance_minor
├── current_balance_minor
├── is_archived
├── created_at
└── updated_at
```

It also enables RLS and creates ownership policies for SELECT / INSERT / UPDATE / DELETE.

Optional verification query:

```text
supabase/sql-editor/V0.0.3_account_core_verify.sql
```

Detailed guide: [`docs/V0.0.3_ACCOUNT_CORE_SETUP.md`](docs/V0.0.3_ACCOUNT_CORE_SETUP.md)

## Environment variables

V0.0.3 does not add new environment variables. Keep the same values configured for Authentication:

```dotenv
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SITE_URL=https://your-finzaro.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

No service-role key is required.

## Account balance model

Money is stored in minor units:

```text
VND 1,500,000  → 1500000
USD 125.50     → 12550
```

The database uses `BIGINT`; the app validates values so they stay inside JavaScript's safe integer range.

During V0.0.3, editing an account balance updates both `opening_balance_minor` and `current_balance_minor`. Starting in V0.0.4, transactions will become the source of balance changes.

## Multi-currency behavior

Finzaro does not add VND + USD + EUR as if they were the same currency.

The Accounts page:

- shows totals by currency;
- shows one headline total for the user's default currency;
- avoids implicit FX conversion.

Exchange-rate conversion is intentionally deferred to a later finance module.

## Account routes

```text
/accounts
/accounts?new=1
/accounts?edit=<ACCOUNT_ID>
/accounts?archived=1
```

All account queries and mutations are user-scoped and additionally protected by Supabase RLS.

## Current version display

Version metadata lives in:

```text
lib/app-version.ts
```

Current release:

```text
Finzaro V0.0.3 · Account Core
```

The version is visible inside the app header, desktop sidebar, authentication shell and Settings page.

## Install / quality check

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Or:

```bash
npm run check
```

## GitHub → Vercel

After running the SQL migration in Supabase SQL Editor:

```bash
git add .
git commit -m "feat: Finzaro V0.0.3 Account Core"
git push
```

Vercel can redeploy from the connected GitHub repository. No additional V0.0.3 ENV variables are required.

## Recommended acceptance test

```text
1. Login
2. Open Accounts
3. Create a VND bank account
4. Confirm the account appears in Accounts
5. Confirm Dashboard Total Balance changes
6. Edit the account name/balance
7. Archive the account
8. Confirm Dashboard excludes archived account
9. Restore the account
10. Confirm another Supabase user cannot read the first user's account
```

## Security baseline

- Browser/server app clients use only the Supabase publishable key.
- Dashboard identity is verified server-side.
- `accounts.user_id` references `auth.users`.
- RLS enforces `auth.uid() = user_id`.
- Account actions also scope mutations by authenticated `user_id`.
- No authenticated HTML is cached by the PWA service worker.
- Multi-currency amounts are never silently combined.

## Next release

### Finzaro V0.0.4 — Transaction Core

Planned scope:

- Real `transactions` / ledger schema
- Income, expense and transfer transactions
- Transaction CRUD
- Transfer between two Finzaro accounts without counting it as spending
- Atomic balance updates
- Category foundation for transaction classification
- Recent Transactions on Dashboard from Supabase
- Income / Expense / Net Cash Flow cards from real data
- Transaction history filters
- RLS and integrity rules linking transactions to user-owned accounts
