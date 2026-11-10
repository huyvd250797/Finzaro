# Finzaro V1.7.0 — Calendar, Reports & Overview UX Redesign

**V1.7.0 combines the V1.5.0, V1.6.0 and V1.7.0 UI/UX stages** on the fixed V1.4.1 baseline. A single final source package is distributed. The product remains six modules and 3 transaction types: Thu, Chi, Chuyển.

Deployment checklist: [`DEPLOY_V1.7.0.md`](DEPLOY_V1.7.0.md). QA evidence: [`docs/V1.7.0_QA.md`](docs/V1.7.0_QA.md).

## Product overview

Finzaro is now a **simple personal income, expense and account-balance tracker**. This release removes 13 advanced financial modules from the running product. Source base: V1.1.9. The original financial history is **not deleted**.

## Six modules in the app

| Module | Route | Purpose |
| --- | --- | --- |
| Tổng quan | `/overview` | Three KPIs (Thu / Chi / Ròng), cash balance, spending trends, recent ordinary transactions |
| Giao dịch | `/transactions` | Ordinary Thu / Chi / Chuyển between standard accounts; edit ordinary Thu/Chi, safely delete transactions |
| Tài khoản & Ví | `/accounts` | Cash, bank and e-wallet accounts, live balances |
| Danh mục | `/categories` | Color/icon, category grid, drag-to-reorder |
| Báo cáo & Lịch | `/reports`, `/reports/calendar`, `/reports/analysis` | Monthly/yearly summaries, daily calendar, category breakdown and CSV |
| Cài đặt | `/settings` | Profile, currency and app preferences |

Mobile navigation: **Tổng quan · Giao dịch · + Thêm GD · Báo cáo · Thêm**. The last menu offers Accounts, Categories and Settings. The 13 removed modules are not navigable; their old URLs redirect to `/overview`.

## Accounting safety and historical data

**V1.4.0 includes the V1.2.3 + V1.3.0 + V1.4.0 milestones in one source release.** The V1.2.0 restricted ledger RPC schema remains unchanged, so there is no new SQL migration.

**Do not delete tables or records from the former module set.** The V1.2.0 migration is additive: it creates a safe marker table and constrained transaction RPCs. Historical credit-card/loan/deposit/goal/investment/recurring records remain untouched and are no longer writable through the ordinary UI.

- Standard Income/Expense: selectable only against active `cash`, `bank`, `ewallet` accounts; category must match transaction type.
- Standard Transfer: only between those account types, never counted as Income or Expense. Same-currency transfers must balance exactly.
- Special historical transactions: excluded from normal cashflow totals, retained in the readonly historical list (`/transactions?legacy=1`) and database.
- Historical accounts of type `savings`: still visible for archival review, not editable/transferrable in the simplified app, and **excluded from the new regular-account balance total**. Reconciliation of any assets in those accounts requires a separate, explicitly approved migration.
- Database writes use `create_simple_transaction_v120`, `update_simple_transaction_v120` and `delete_simple_transaction_v120`; former financial creation/edit/deletion RPCs are revoked from direct use by authenticated clients. Transaction mutations are atomic via the existing ledger DB routines.
- The reports do not reclassify old borrowings, card advances, debt repayments or deposit funding as ordinary Income/Expense.

**Important:** This release changes what is included in the simplified visible account total. It does not rewrite saved balances. Compare opening/closing balances for each retained `cash/bank/ewallet` account before approving production rollout.

## Installation / migration

See [`DEPLOY_V1.2.2.md`](DEPLOY_V1.2.2.md) for the deploy fix and [`DEPLOY_V1.2.1.md`](DEPLOY_V1.2.1.md) for reporting improvements and [`DEPLOY_V1.2.0.md`](DEPLOY_V1.2.0.md) for the required baseline migration.

1. Back up the Supabase database and export a read-only transaction/account snapshot.
2. Ensure previous schema migrations through V1.1.2 have been applied.
3. Run `supabase/sql-editor/V1.2.0_simple_expense_management.sql` in Supabase SQL Editor.
4. Run `supabase/sql-editor/V1.2.0_simple_expense_management_verify.sql` to verify the marker table and RPCs.
5. Install dependencies (`npm install`), then run `npm run check` to test/lint/typecheck/build in an environment with network access and valid `.env` settings.
6. Deploy the V1.7.0 source ZIP root to Vercel and clear build cache once. Verify PWA badge `V1.7.0`.
7. Smoke-test all three transaction types, deletion rollback, calendar/day edit, Reports, category icon/color, account balances and archived historical records.

This ZIP does not include `node_modules`, compiled `.next` output or a database backup. Migration has **not** been run against your real Supabase instance. No customer data was deleted by preparing this release.

## Environment

Copy `.env.example` to `.env.local` and fill in Supabase app keys. The `prebuild` validator checks required public variables. No SSI/market-data API keys are needed in V1.2.0.

## Testing

`npm run test` runs the V1.2.0/1.2.1/1.2.2 compatibility regression suites plus the V1.4.0 UX/performance regressions and still-valid PWA/auth/calculator tests. Historical advanced-module tests are preserved in `tests/legacy/` for traceability but are no longer part of the simplified product's active test contract.

See [`docs/VERSIONING.md`](docs/VERSIONING.md) for patch version policy. The next changed source package must be `V1.7.1` or later; do not reuse `V1.4.0`.


## V1.4.1 TypeScript deployment patch

The three RPC actions for create, update, and delete now validate the RPC envelope before reading `.error`, resolving the TypeScript TS2339 `unknown` regression while preserving the atomic V1.2.0 SQL functions and all V1.4.0 functionality. See `DEPLOY_V1.4.1.md`. No new SQL migration.


## V1.7.0 UI/UX consolidation

- **Calendar:** 7 visible date columns, compact integer Thu/Chi (`+1,25tr`, `-850k`), no zero labels; tapping dates filters the existing month locally. Double-tap (or selected-day Add action) opens a date-prefilled transaction form. Swiping day items exposes Edit/Delete; saving returns to that month and date.
- **Reports:** category color is the source of truth for every pie segment and legend item. Select any slice or legend entry to see share and amount, then choose `Chi tiết` to drill down. No center overlay masks the pie.
- **Overview:** merged balance and 3 KPI cards, compressed headings and controls, compact top-5 categories and recent transactions. Navigation fixed to the bottom with a fully visible Add control.
- **Simplified scope:** exactly six active modules. Discontinued routes use safe redirects and their application code is no longer shipped. Financial history and SQL migrations are untouched.

See [`DEPLOY_V1.7.0.md`](DEPLOY_V1.7.0.md). No new SQL migration for V1.7.0. Run `npm run check` on a dependency-complete system with valid environment variables before deploying.

Security compatibility: Next.js / eslint-config-next `16.4.6` and React / React DOM `19.3.1` replace known-vulnerable pre-October versions in the source baseline. Keep dependency versions aligned and clear Vercel build cache when switching.
