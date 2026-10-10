# Finzaro V1.0.0 — Production Release

Finzaro is a personal-finance PWA built with Next.js, Supabase and Vercel. V1.0.0 promotes the V0.8.0 Release Candidate to the first production baseline. The finance feature set is frozen; this release focuses on correctness, deterministic recovery, deploy safety and long-history reporting.

## Production baseline

- Account, Transaction Ledger, Category, Budget, Recurring, Savings, Deposits, Loans, Credit Cards, Net Worth, Health, Forecast, Cash Flow, Goals, Investments and Debt Strategy remain intact.
- Reports keep the V0.8.0 **Tổng quan / Lịch / Phân tích** experience, monthly/yearly views, category drill-down and green Income/red Expense calendar lines with `0đ` hidden.
- Category picker keeps the expanded 84-icon searchable library.
- Loan/Credit Card funding remains excluded from real Income analytics.
- Reports and CSV export now paginate the complete selected range instead of silently truncating at 10,000 transactions.
- Category usage checks are also paginated rather than capped at 10,000 historical rows.
- Production error boundaries, 404 recovery and hardened security headers are included.
- Runtime dependencies are pinned to exact versions in `package.json` to reduce deploy drift.

## Database status

If the database is already on V0.8.0, **V1.0.0 requires no schema migration**.

Run the read-only production verification script:

`supabase/sql-editor/V1.0.0_production_release_verify.sql`

It verifies core tables, RLS, transaction RPCs, production indexes and the V0.8.0 category-icon constraint. It does not alter financial data.

If the database is older, apply missing migrations in order through V0.8.0 first.

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

1. Confirm V0.8.0 database migration is applied.
2. Run `supabase/sql-editor/V1.0.0_production_release_verify.sql`.
3. Configure Vercel Production environment variables.
4. Run `npm install` in a dependency-complete environment.
5. Run `npm run check` (`lint → typecheck → tests → production build`).
6. Push to GitHub and deploy/redeploy on Vercel.
7. Verify Supabase Auth redirect URLs for the production domain.
8. Smoke-test Login, Transaction, Transfer, Credit Card payment, Loan payment, Savings transfer, Reports Calendar and PWA update.

Full release notes and checklist: `docs/V1.0.0_PRODUCTION_RELEASE.md`.

## Next line

After V1.0.0, Finzaro moves to UI/UX-first releases rather than broad feature expansion: V1.1.0 Design System & Visual Polish, V1.2.0 Mobile UX Optimization and V1.3.0 Transaction UX Redesign.
