# Finzaro V1.1.5 — Reports Render & Pie Stability Fix

Finzaro is a personal-finance PWA built with Next.js, Supabase and Vercel. V1.1.5 fixes the remaining Reports render crash by replacing the SVG pie renderer, hardening report formatting/timezone handling and isolating visualization failures from the Reports route.

## V1.1.5 highlights

- Replaced the V1.1.x SVG pie renderer with a defensive `conic-gradient` renderer that still supports tapping a slice to inspect category, percentage and amount.
- Added a local visualization error boundary so a chart problem can never blank the entire Reports page.
- Hardened report amount formatting, timezone parsing and transaction entry reads against malformed/legacy data.
- Reports remain force-dynamic and retain the V1.1.4 multi-strategy ledger recovery path.

- Reports now try direct ledger reads, the canonical Transactions loader, then a legacy-core reader before giving up.
- All Reports routes are force-dynamic and do not reuse authenticated RSC output.
- Installed PWA clients hard-refresh once when `/api/version` reports a newer server version.

- **Transfer → Tiền gửi** now reads real records from the `deposits` module instead of treating `accounts.account_type="savings"` as the same thing.
- A Deposit transfer atomically decreases the source Account and increases the Deposit principal. **Thêm vào mục tiêu** can also advance an existing same-currency Goal in the same PostgreSQL transaction.
- Deposit funding stores rollback metadata so deleting the transaction reverses the Account, Deposit and exact Goal contribution.
- Reports now read `transactions` + `transaction_entries` directly and do **not** depend on `report_flow_rows_v112` at runtime.
- Optional Account/Category/Currency metadata is best-effort; a metadata/schema-cache mismatch can no longer blank the entire Reports module.
- Transaction queries automatically retry a legacy-safe field projection when newer optional columns are unavailable in the PostgREST schema cache.
- Existing V1.1.0 visual work remains: larger Calendar cells, green Income/red Expense, full interactive pie, and the compact three-KPI Overview row.
- Next.js 16.4.0 / React 19.3.0 / Node 22.x security stack remains unchanged.

## Database migration

V1.1.5 adds **no new migration**. The existing V1.1.2 migration is still required for Deposit funding and Goal rollback:

`supabase/sql-editor/V1.1.2_transfer_deposit_reports_reliability.sql`

Then run:

`supabase/sql-editor/V1.1.2_transfer_deposit_reports_reliability_verify.sql`

The earlier V1.1.0 migration is still required if it has not already been applied:

`supabase/sql-editor/V1.1.0_ui_design_system_visual_polish.sql`

The V1.1.2 migration does not rewrite historical financial rows. V1.1.3 no longer requires its report RPC at runtime; the V1.1.2 migration remains necessary for Deposit-funding transaction integrity.

## Environment

Copy `.env.example` when configuring local/Vercel environments. Required public variables:

```env
NEXT_PUBLIC_FINZARO_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`npm run build` runs the environment validator first and fails early when required Supabase values are missing or placeholders remain.

### Optional SSI FastConnect

Manual Investment Asset valuation works without SSI. To enable automatic Vietnam stock pricing, configure these **server-only** variables:

```env
SSI_FASTCONNECT_API_KEY=...
SSI_FASTCONNECT_API_SECRET=...
SSI_FASTCONNECT_CLIENT_ID=...
```

Never prefix SSI secrets with `NEXT_PUBLIC_`.

## Production deploy

1. Confirm all earlier migrations through V1.1.0 are applied.
2. Run `supabase/sql-editor/V1.1.2_transfer_deposit_reports_reliability.sql`.
3. Run `supabase/sql-editor/V1.1.2_transfer_deposit_reports_reliability_verify.sql`.
4. Configure Vercel Production environment variables.
5. Run `npm install` in a dependency-complete environment.
6. Run `npm run check` (`lint → typecheck → tests → production build`).
7. Push to GitHub and deploy/redeploy on Vercel.
8. Smoke-test Account → Deposit transfer, optional Goal contribution, deletion rollback, Reports Overview/Calendar/Analysis, and PWA update.

V1.1.5 patch notes: `docs/V1.1.5_REPORTS_RENDER_PIE_STABILITY_FIX.md`.

V1.1.2 Deposit transfer notes remain at `docs/V1.1.2_DEPOSIT_TRANSFER_REPORTS_RELIABILITY_FIX.md`.

Full V1.1.0 UI/UX notes remain at `docs/V1.1.0_UI_DESIGN_SYSTEM_VISUAL_POLISH.md`.

## Next line

After V1.1.5, the planned UX sequence remains V1.2.0 Mobile UX Optimization, V1.3.0 Transaction UX Redesign and V1.4.0 Quick Actions. Any modified source package must increment the version again.

## V1.0.2 Next.js security patch

- Upgrades `next` from `16.0.0` to `16.4.0` to clear Vercel's vulnerable Next.js deployment block and include the security fixes shipped across the 16.x line.
- Upgrades `eslint-config-next` to `16.4.0` so framework and lint tooling stay on the same release.
- Keeps React / React DOM at `19.3.0`, which is the React line used by Next.js 16.4.
- Removes `--legacy-peer-deps`; dependency conflicts are no longer intentionally masked during Vercel install.
- No database migration or financial-data change is required.

## V1.0.1 deployment fix

- Aligns `react`, `react-dom`, `@types/react`, and `@types/react-dom` to 19.3.0.
- Aligns TypeScript to 5.9.3 and pins Vercel/CI runtime to Node 22.x / npm 10.x.
- Vercel install bypasses expensive peer-dependency backtracking with `--legacy-peer-deps`, while direct React packages remain explicitly aligned.
- No database migration is required.
