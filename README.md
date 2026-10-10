# Finzaro V0.7.5 — Release Stabilization

Finzaro is a personal-finance PWA built with Next.js, Supabase and Vercel. V0.7.5 freezes the current feature set and focuses only on release stability, transaction integrity, mobile/PWA resilience and predictable production deployment.

## V0.7.5 highlights

- No new user-facing feature or module.
- Fixes the money calculator operator edge case without changing canonical amount storage.
- Makes modal/bottom-sheet scroll locking safe when overlays are nested.
- Hardens service-worker installation and cache cleanup so optional icon failures do not block PWA updates and unrelated origin caches are not deleted.
- Keeps V0.7.4 dot-grouped money display and the fully visible, fixed, safe-area-aware mobile taskbar.
- Adds database indexes matching existing user/date history queries for Loan Payments, Credit Card Payments and Asset Valuations.

## V0.7.5 database stabilization

If the database is already on V0.7.1 or later, run:

`supabase/sql-editor/V0.7.5_release_stabilization.sql`

Optional verification:

`supabase/sql-editor/V0.7.5_release_stabilization_verify.sql`

This migration only adds idempotent indexes and does not modify existing financial records.

## V0.7.1 database upgrade

If the database is still on V0.7.0, run first:

`supabase/sql-editor/V0.7.1_mobile_money_debt_funding.sql`

Optional verification:

`supabase/sql-editor/V0.7.1_mobile_money_debt_funding_verify.sql`

## V0.7.0 highlights

- **Advanced Debt Strategy** at `/debt-strategy`.
- Combines active **Loans + Credit Cards** in the user's default currency.
- Simulates **Debt Avalanche** (highest APR first) and **Debt Snowball** (smallest balance first).
- User can enter an extra monthly repayment budget, compare payoff months and estimated interest, view payoff order and save the preferred plan.
- Existing V0.6.0 liability-linked transactions remain unchanged: `Chi tiền` can pay Credit Card/Loan; `Chuyển tiền` remains account-to-account and linked Savings Goal transfers auto-sync progress.
- Stock assets can now store **ticker symbol, exchange, quantity, average buy price, market price and market update time**.
- Optional **SSI FastConnect Market Data** integration automatically refreshes enabled Vietnam stock positions from the server and recalculates Market Value + unrealized gain/loss.
- SSI API Key/Secret are **server-only**. Finzaro never exposes them as `NEXT_PUBLIC_*` and this release does not place stock orders.
- Automated SSI price refresh is throttled in valuation history so repeated refreshes do not generate thousands of valuation rows.
- Vietnam stock quotations are normalized to VND/share before valuation (SSI/market displays commonly quote prices in 1,000-VND units), so quantity × market price produces the correct VND market value.

## Database upgrade

If the database is already on V0.6.0, run only:

`supabase/sql-editor/V0.7.0_advanced_debt_strategy_ssi_market_data.sql`

Optional verification:

`supabase/sql-editor/V0.7.0_advanced_debt_strategy_ssi_market_data_verify.sql`

## Optional SSI FastConnect configuration

Manual Investment Asset valuation works without SSI. To enable automatic Vietnam stock pricing, add these **server-only** Vercel environment variables:

```env
SSI_FASTCONNECT_API_KEY=...
SSI_FASTCONNECT_API_SECRET=...
SSI_FASTCONNECT_CLIENT_ID=...
```

Do not use `NEXT_PUBLIC_` for these secrets. See `docs/V0.7.0_ADVANCED_DEBT_STRATEGY_SSI_MARKET_DATA_SETUP.md`.

Finzaro V0.7.0 uses SSI's current Market Data Securities Summary with periodic server-side refresh. SSI also provides WebSocket push streaming, but current SSI documentation requires an authenticated streaming session/OTP; Finzaro therefore keeps the PWA/Vercel integration server-safe rather than exposing streaming credentials in the browser.

## Deploy

1. Apply any missing V0.7.1 migration, then apply `V0.7.5_release_stabilization.sql`.
2. Optionally configure SSI FastConnect server environment variables in Vercel.
3. Run `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` in a dependency-complete environment.
4. Push source to GitHub and deploy/redeploy on Vercel.
5. Open the installed PWA and use the existing **Cập nhật ngay** prompt when available.

## Next planned release

**Finzaro V0.8.0 — Release Candidate**: no feature expansion; full end-to-end release verification, validation/error-state consistency and production readiness.
