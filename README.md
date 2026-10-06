# Finzaro V0.0.4 — Transaction Core

Finzaro is a PWA-first personal finance application built with Next.js, Supabase and Vercel. V0.0.4 upgrades Account Core with a real transaction ledger: Income, Expense and Transfer now change account balances atomically inside PostgreSQL.

## Release scope

V0.0.4 includes:

- Real `transactions` and `transaction_entries` tables in Supabase
- Signed ledger entries in currency minor units (`BIGINT`)
- Income transactions that increase one account balance
- Expense transactions that decrease one account balance
- Account-to-account transfers without counting them as income/expense
- Same-currency and cross-currency transfer support without silently inventing FX rates
- Atomic PostgreSQL functions for transaction creation and deletion/reversal
- Direct client mutation of ledger rows blocked; authenticated users receive read-only table grants
- Account balance/currency hardening: normal API clients can no longer edit ledger-maintained balance columns
- Existing V0.0.3 account balances promoted to the V0.0.4 opening ledger baseline
- Transaction history with search, type/account/date filters
- Real Recent Transactions on Dashboard
- Real monthly Income / Expense / Net Cash Flow cards
- Real six-month cash-flow chart
- Real expense-by-category snapshot for the current month
- Transaction deletion with automatic account-balance reversal
- Per-user RLS for transaction headers and entries
- Current release display: `Finzaro V0.0.4 · Transaction Core`
- SQL Editor migration + verification script
- Transaction Core smoke tests and pgTAP schema tests

## Required database step — SQL Editor workflow

This release assumes these earlier scripts were already applied:

```text
V0.1.1 foundation
V0.0.3 Account Core
```

Do **not** rerun the old files.

Open:

```text
Supabase Dashboard
→ SQL Editor
→ New query
```

Copy all content from:

```text
supabase/sql-editor/V0.0.4_transaction_core.sql
```

Paste it into SQL Editor and click **Run**.

Optional verification:

```text
supabase/sql-editor/V0.0.4_transaction_core_verify.sql
```

Detailed steps: [`docs/V0.0.4_TRANSACTION_CORE_SETUP.md`](docs/V0.0.4_TRANSACTION_CORE_SETUP.md)

## Ledger model

V0.0.4 separates the business transaction from its account movements:

```text
transactions
    │
    └── transaction_entries
            ├── signed amount_minor
            ├── account_id
            ├── currency_code
            └── entry_role
```

Examples:

```text
Income 1,000,000 VND
  Account A  +1,000,000

Expense 250,000 VND
  Account A    -250,000

Transfer 2,000,000 VND
  Account A  -2,000,000
  Account B  +2,000,000
```

Transfers are therefore excluded from income/expense analytics by transaction type instead of being mistaken for spending.

## Atomic balance updates

The application does not insert ledger rows and update account balances in separate browser requests.

Writes use:

```text
create_financial_transaction_v004(...)
delete_financial_transaction_v004(...)
```

Each function performs ledger + account balance changes inside one PostgreSQL transaction. If any statement fails, the database rolls the whole operation back.

## Account balance hardening

Before V0.0.4, Account Core could manually edit `current_balance_minor` because no transaction ledger existed.

V0.0.4 changes that rule:

```text
Create account
→ opening balance is accepted once
→ current balance starts at opening balance

After creation
→ name/type/institution/archive state remain editable
→ currency and balance are locked from normal authenticated API updates
→ Income/Expense/Transfer maintain current balance
```

This prevents UI or direct Data API calls from silently breaking the ledger invariant.

## Multi-currency transfers

If source and destination use the same currency, the destination amount can be left blank and Finzaro uses the source amount.

If currencies differ, enter both actual values:

```text
Source:      100 USD
Destination: 2,620,000 VND
```

Finzaro records exactly what happened. V0.0.4 does **not** infer an exchange rate or perform automatic currency conversion.

## Transaction routes

```text
/transactions
/transactions?new=expense
/transactions?new=income
/transactions?new=transfer
```

History filters are server-rendered using query parameters:

```text
q
 type
account
from
to
```

## Dashboard behavior

The dashboard now reads real ledger data for:

- Income this month
- Expense this month
- Net cash flow
- Six-month cash-flow graph
- Expense category snapshot
- Recent transactions

Headline financial totals use the user's default currency only. Finzaro still does not add unrelated currencies together without an FX module.

## Environment variables

V0.0.4 adds **no new environment variables**. Keep the existing Authentication configuration:

```dotenv
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SITE_URL=https://your-finzaro.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

No secret/service-role key is required.

## Current version display

Version metadata is centralized in:

```text
lib/app-version.ts
```

Current release:

```text
Finzaro V0.0.4 · Transaction Core
```

It is displayed in the app header, sidebar, authentication shell and Settings.

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

After applying the V0.0.4 SQL in Supabase:

```bash
git add .
git commit -m "feat: Finzaro V0.0.4 Transaction Core"
git push
```

The connected Vercel project can redeploy directly. No new V0.0.4 ENV values are required.

## Recommended acceptance test

Start with two VND accounts, for example Bank = 10,000,000 and Cash = 1,000,000.

```text
1. Create Income +5,000,000 into Bank
   → Bank becomes 15,000,000
   → monthly Income +5,000,000

2. Create Expense 1,200,000 from Bank
   → Bank becomes 13,800,000
   → monthly Expense +1,200,000

3. Transfer 2,000,000 Bank → Cash
   → Bank becomes 11,800,000
   → Cash becomes 3,000,000
   → Income/Expense cards do not change

4. Delete the transfer
   → Bank returns to 13,800,000
   → Cash returns to 1,000,000

5. Login as another user
   → no transaction or ledger entry from the first user is visible
```

## Security / integrity baseline

- Browser/server app clients use only the Supabase publishable key.
- Every transaction and entry has `user_id` ownership.
- RLS allows users to read only their own ledger.
- Direct INSERT/UPDATE/DELETE on transaction tables is not granted to authenticated clients.
- Ledger writes execute through ownership-checking PostgreSQL functions.
- Account balances are updated in the same DB transaction as ledger entries.
- Direct account balance/currency mutation is removed from authenticated table grants.
- Hard-deleting accounts through the normal client is removed; archive/restore remains the lifecycle action.
- PWA authenticated navigation HTML remains uncached.

## Next release

### Finzaro V0.0.5 — Category Engine

V0.0.4 intentionally stores `category_label` as a snapshot so transaction recording can work before the category model exists. V0.0.5 will normalize this into a user-customizable Category Engine.

Planned scope:

- `categories` table with per-user ownership and RLS
- System starter categories for Income and Expense
- Custom categories created by each user
- Category type separation: Income vs Expense
- Parent/subcategory hierarchy foundation
- Category icon and presentation metadata
- Active/archive lifecycle
- Transaction `category_id` foreign key while preserving historical labels safely
- Category management UI
- Category picker in transaction creation
- Category-based filtering and analytics
- Migration path for V0.0.4 free-text category labels
- Preparation for V0.0.6 Budget Engine, where budgets can target structured categories

The release after that is expected to focus on **Budget Engine**, using the normalized categories and real transaction ledger produced by V0.0.4/V0.0.5.
