# Finzaro V0.8.0 — Release Candidate

Finzaro is a personal-finance PWA built with Next.js, Supabase and Vercel. V0.8.0 is the Release Candidate before V1.0.0: the finance-module feature set is frozen, while existing data is made easier to inspect through a redesigned Reports experience and a broader Category icon library.

## V0.8.0 highlights

- Reports hub at `/reports` with **Tổng quan / Lịch / Phân tích**.
- Monthly and yearly Income/Expense overview, net cashflow and category distribution.
- Calendar view shows **Thu màu xanh lá + Chi màu đỏ in the same day cell**; `0đ` is not rendered.
- Category drill-down shows 6-month or 12-month trends and the underlying transactions.
- Existing advanced filters, Cash Flow Trend, Financial Insights, Budget vs Actual and Recurring commitments remain available at `/reports/analysis`.
- Reports continue to exclude Loan/Credit Card funding from real Income.
- Mobile taskbar now gives Reports direct access; recurring schedules remain under the module sheet.
- Category icon picker now contains **84 icons**, Vietnamese labels and search.

## Database upgrade

If the database is already on V0.7.5, run:

`supabase/sql-editor/V0.8.0_release_candidate.sql`

Optional verification:

`supabase/sql-editor/V0.8.0_release_candidate_verify.sql`

The V0.8.0 migration only expands the Category icon allow-list and does not alter financial values or ledger history.

If the database is older, apply missing migrations in order, including V0.7.1 and V0.7.5 first.

## Optional SSI FastConnect configuration

Manual Investment Asset valuation works without SSI. To enable automatic Vietnam stock pricing, add these **server-only** Vercel environment variables:

```env
SSI_FASTCONNECT_API_KEY=...
SSI_FASTCONNECT_API_SECRET=...
SSI_FASTCONNECT_CLIENT_ID=...
```

Do not use `NEXT_PUBLIC_` for these secrets. See `docs/V0.7.0_ADVANCED_DEBT_STRATEGY_SSI_MARKET_DATA_SETUP.md`.

## Deploy

1. Apply any missing database migrations, then run `V0.8.0_release_candidate.sql`.
2. Optionally configure SSI FastConnect server environment variables in Vercel.
3. Run `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` in a dependency-complete environment.
4. Push source to GitHub and deploy/redeploy on Vercel.
5. Open the installed PWA and use the existing **Cập nhật ngay** prompt when available.

## Next planned release

**Finzaro V1.0.0 — Production Release**: no broad feature expansion; final end-to-end verification, validation/error-state consistency, security review and production readiness.
