# Finzaro V4.1.4 — Financial Accuracy & Release Gate

> Source upgrade from V4.1.3. Keep current Supabase tables and RPC functions. **No new SQL migration for V4.1.4.** The earlier V3.2.0 Batch Copy and V4.1.2 period-summary migrations must remain installed when those features are used.

## Changes

1. **Category Share Accuracy:** `expenseCategories` uses all categories as the denominator before selecting Top 5, without artificial 4% minimum bar width. Both today and monthly Overview use this percent.
2. **Export Accuracy:** Excel `Danh muc` and `Tai khoan` sheets have a `Loại` (Thu/Chi) column. Filter Thu = only Thu; Chi = only Chi; All = two clearly separated flow types. CSV contains filtered transaction rows; printable/PDF statement shows the same categories/accounts separated by type. `uncategorized` is supported.
3. **Unified Financial Policy:** `features/transactions/financial-flow.ts` is canonical: only `standard` income/expense, matching entry role and selected currency; signs normalized with absolute amount in minor units; transfers/legacy/debt excluded from flow totals. Shared by Overview, Report analytics, drill-down and export.
4. **Reconciliation:** Export blocks if KPI, month rows, category totals or account totals differ. Report Overview and period-snapshot API validate KPI against category/slice/bucket aggregates before returning results. Invalid calendar dates are rejected.
5. **Integrity:** Preserve existing create/update/delete/batch-copy RPC behavior and database schema. Date, type, currency, account and category filters apply to the same report transaction scope.
6. **Release Gate:** `vercel.json` specifies `npm run check` for build. It runs ESLint, TypeScript strict typecheck, Node tests and Next.js production build sequentially. Any failure MUST block a deployment. CI performs the same checks.

## Deploy steps

1. Back up Supabase and create a staging deployment using the current production config **without sharing secrets**.
2. Ensure the previous SQL migrations are applied (V4.1.4 adds none).
3. Install dependencies in a network-enabled Node 22 / npm 10 environment: `npm install --no-audit --no-fund`.
4. Run `npm run check`. Resolve **all** lint, type and build failures before progressing. Do not bypass with `ignoreBuildErrors` or `ignoreDuringBuilds`.
5. In Vercel, confirm that the build command resolves to `npm run check` and is not overridden in Project Settings. Verify environment variables according to `.env.example`.
6. Test these 3 report filters (Thu/Chi/Tất cả) over months, years, custom ranges, accounts and child categories. Compare Dashboard, Reports, modal chart buckets, Excel, CSV and Print. Test VND + a foreign currency separately.
7. Verify copy, edit, delete and transfer accounting plus iOS taskbar/bottom sheet after data mutations.
8. Deploy to production **only if** staging results and Vercel build are green. Confirm the running app displays V4.1.4 and clear PWA caches if stale.

## Rollback

Redeploy V4.1.3 source with the same environment variables. No V4.1.4 SQL rollback is needed. **Do not rollback old migrations required by V3.2/V4.1.2**. No transaction data migration occurs.

## Verified vs unverified at packaging time

- Verified locally: source syntax, CSS parsing, `npm test` (195/195), local-import/release checks, packaged ZIP integrity, original SQL byte comparison.
- **Not verified in this environment:** complete ESLint, strict TypeScript typecheck and Next.js production build; online npm install timed out and offline npm cache lacks `@supabase/ssr`.
- **Not verified:** real Supabase data, actual iPhone Safari/PWA, Vercel staging or production latency. The implementation must not be labeled production-ready until those pass.

Details: `docs/V4.1.4_QA.md`.
