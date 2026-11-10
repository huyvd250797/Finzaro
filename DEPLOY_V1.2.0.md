# Finzaro V1.2.0 — Production deployment and data preservation

## Change boundary

V1.2.0 is a product-scope reduction from V1.1.9, **not a destructive database reset**. The 13 advanced feature areas are removed from navigation, routes, forms, queries and normal user workflows. Legacy rows must remain backed up and intact.

## Release preflight

1. Create an external, restorable Supabase Postgres backup and record its timestamp. Keep the backup outside this ZIP. Export `accounts`, `transactions`, `transaction_entries`, `categories` and affected legacy finance tables separately when feasible.
2. Record per-account `opening_balance_minor` and `current_balance_minor`, number of transactions and entries, and current reports for a reference month.
3. Verify all production schema versions through V1.1.2 are already installed. In particular the ledger RPCs `create_financial_transaction_v071`, `update_financial_transaction_v012` and `delete_financial_transaction_v112` must exist.
4. Schedule a brief write-free deployment window. Apply the SQL **before** enabling V1.2.0 frontend. The SQL revokes direct invocation rights to old mutation RPCs; old frontend transactions can fail during this crossover. Prefer a coordinated migration + deployment.
5. In Supabase SQL Editor run `supabase/sql-editor/V1.2.0_simple_expense_management.sql`, then its read-only `_verify.sql` companion. It adds one marker table with RLS and three constrained wrappers; no `DROP TABLE`, no historical `DELETE`, no historical `UPDATE`.
6. Install the exact packages from `package.json`, run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` with actual Supabase environment variables. Do **not** bypass a failing build.
7. Push the ZIP root content to GitHub/Vercel, clear Vercel build cache once, confirm the deployed badge and `/api/version` report `1.2.0`.
8. Audit all three basic write flows and their reversals on a test user. Perform separate checks on a user with legacy loan/card/deposit history and a user with ordinary income/expense only.

## Critical acceptance checklist

- [ ] Exactly six user-facing modules; no links/API routes for removed features.
- [ ] Create Thu and Chi changes only the selected standard account; both appear in normal Reports.
- [ ] Chuyển decrements source, increments destination, leaves report income/expense unchanged, and disallows mismatched amounts for same currency.
- [ ] Edit ordinary Thu/Chi only, and delete returns the old balance.
- [ ] Legacy linked rows (loan/card/deposit/goal/recurring) cannot be mutated using new ordinary APIs.
- [ ] Historical finance rows and their counts are unchanged by deploying the source + migration.
- [ ] Per-account balances of all retained cash/bank/e-wallet accounts reconcile to the pre-release baseline before any new user transactions.
- [ ] The Overview / Accounts balance excludes retired `savings` account types consistently.
- [ ] Calendar shows income and expense separately; category colors match user configuration; PWA tabs, safe-area, calculator work.
- [ ] Production lint/typecheck/build/test and smoke test all pass.

## Legacy limitations

- `savings` account type is preserved as readonly historical data. Money remaining in a legacy savings account is **not converted into cash/bank automatically**. An explicit transfer/reconciliation plan is needed if a legacy balance is to be integrated into the simple accounts.
- Historical advanced financial module tables remain in Supabase; immediate dropping would orphan transaction history and break integrity. In this release, their UI and active callable paths are removed instead.
- Existing old browser/PWA builds may still display stale screens until refreshed; validate `/api/version` before testing.
- Dropped business features cannot be restored by simply renaming V1.2.0 source files; use a full known-good backup and a coordinated DB permissions rollback in a maintenance window.

## Rollback

Stop write traffic. If the release fails on a test user, restore the previous V1.1.9 source and revert only the permissions introduced by V1.2.0 (or apply a reviewed DB rollback script) so old transaction RPCs work again. Do **not** drop historical tables as part of rollback. If any real new transaction has been written under V1.2.0, first reconcile these new transactions before switching to the older frontend.

## Verification limits

No external Supabase account access or Vercel environment was used to run the migration, semantic typecheck or production build in this sandbox. Automated static/regression tests and TS/TSX syntax scanning are not a substitute for a production smoke test. The resulting ZIP is an implementation package, not proof that production deployment has succeeded.
