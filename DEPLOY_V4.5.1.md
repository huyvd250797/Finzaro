# Finzaro V4.5.1 — Dashboard Period Comparison

## Scope

- Baseline: complete V4.5.0 source ZIP, with the three Chi/Thu toggle cards, expense/income categories and account balance privacy.
- Added **comparison to prior day/month/year** for both income and expense. Render delta and percentage small and right-aligned with the main amount.
- Green positive, red negative, neutral unchanged. Example: current 20,000,000 VND vs previous 30,000,000 VND => `−10.000.000 đ (−33,33%)`.
- If baseline = 0 and current > 0 => `+... đ (—%)` with accessible explanation; division by zero never treated as +100%. If both = 0 => `0 đ (0,00%)`.

## Required database migration (TXT copy-and-paste)

1. Make sure V4.5.0's `dashboard_snapshot_v450` migration has already run.
2. Back up Supabase and run `Finzaro-V4.5.1-Period-Comparison-Migration.txt` in **Supabase SQL Editor**; identical SQL lives in `supabase/migrations/20261115090000_dashboard_period_comparison_v451.sql` in source ZIP.
3. Verify `public.dashboard_period_comparison_v451(text,date)` exists. Only `authenticated` may execute it; the function uses `security invoker`, `auth.uid()` and explicitly filters `user_id` in transactions/entries. It does not write financial data.
4. The query aggregates prior complete calendar periods in the selected currency from standard income/expense postings. It is one query for all 6 values.

## Deployment

1. Replace entire GitHub source with V4.5.1 (do not overlay old `node_modules` or historical build output). Confirm `package.json` / `lib/app-version.ts` = **4.5.1**.
2. Run `npm install` and `npm run check` (`lint → typecheck → test → build`) on a development or CI machine with npm dependencies installed.
3. Deploy a **new commit** to Vercel. Confirm the build log starts `finzaro@4.5.1`, not a prior version. Do not disable lint or ignore TypeScript errors.
4. Smoke-test three cards in both Chi/Thu modes on iPhone Safari/PWA and desktop; compare to actual transactions in the prior complete periods.

## Definition of comparable periods

| Current card | Comparison | Boundaries |
| --- | --- | --- |
| Hôm nay | Hôm qua | Yesterday at local configured timezone, full day |
| Tháng này | Tháng trước | First through last calendar day of prior month |
| Năm nay | Năm trước | January 1 through December 31 of prior year |

All dates follow user's configured Dashboard timezone `currentDateKey`; SQL is passed that exact calendar date. The existing current-month/year cards may include future-dated transactions within the period; their semantics have **not changed** in this patch. Comparisons are full previous calendar periods. Transfer, loan/nonstandard and other-currency transactions are excluded by the same existing financial-flow policy.

## Troubleshooting

- Missing RPC `42883`/`PGRST202`: strict ledger compatibility path loads the complete previous calendar year, so data remains correct but Dashboard may be slower. Apply the TXT migration for the fast path.
- Other RPC errors (RLS, timeout, database failure): Dashboard shows the existing error alert; previous totals are **not silently replaced with zero**.
- Current/previous values differ from desired accounting: verify transaction dates, transaction purpose, selected currency and the definition of full previous period.

## Quality verification

- Automated regression `node --test tests/*.test.mjs`: 270/270 tests passed in the authoring environment.
- Source release preflight: six standard modules and local import targets validated.
- Full npm lint/typecheck/Next production build could not be executed in this authoring environment because `node_modules` was unavailable. **Vercel build and iPhone QA are required before production sign-off.**
