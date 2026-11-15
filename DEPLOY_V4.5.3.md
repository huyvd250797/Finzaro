# Finzaro V4.5.3 — Financial Comparison Logic Fix

## Upgrade source

- **Baseline:** Finzaro V4.5.2 — Category Management UX Polish. This preserves the exclusive Chi/Thu category tabs, edit modal and long-press sorting introduced in V4.5.2, even if the screenshots or a separately uploaded source archive still display V4.5.1.
- **Release:** V4.5.3, package/app metadata synchronized.
- **Scope:** Correct sign, percent and red/green status of the three Dashboard day/month/year comparison badges. The patch changes the shared calculation and its card presentation only; it does not change database queries or money posted to accounts.

## Comparison logic

- **Thu nhập:** `difference = current - previous`. Increase is positive (green), decrease is negative (red).
- **Chi tiêu:** `difference = previous - current`. Spending more is negative (red), spending less is positive (green).
- **Percentage** when `previous > 0`: `difference / previous × 100`, rounded for display to up to two decimal places.
- **Zero baseline display convention:** If `previous = 0` and `current > 0`, the percentage is `+100%` for income or `-100%` for expense. This is an explicitly defined **UI convention**; conventional mathematical percentage change from zero is undefined. The Dashboard supplies a tooltip clarifying the convention. If both amounts are zero, show a neutral `0%`.
- For equal amounts the displayed change is `0 đ (0%)`, neutral, never a negative zero.

Examples:

| Flow | Previous | Current | Comparison | Status |
|---|---:|---:|---|---|
| Chi tiêu hôm nay | 0 | 25,000 | -25,000 đ (-100%) | Red |
| Chi tiêu tháng này | 8,000,000 | 7,000,000 | +1,000,000 đ (+12.5%) | Green |
| Chi tiêu năm nay | 15,000,000 | 20,000,000 | -5,000,000 đ (-33.33%) | Red |
| Thu nhập tháng này | 30,000,000 | 20,000,000 | -10,000,000 đ (-33.33%) | Red |
| Thu nhập năm nay | 20,000,000 | 30,000,000 | +10,000,000 đ (+50%) | Green |

## Deployment

1. Keep the existing Supabase database and its migrations through V4.5.1. **V4.5.3 adds no SQL migration; no separate TXT is required.**
2. Replace the source with the complete V4.5.3 ZIP. Do not merge V4.5.1 into the patched source: it would remove V4.5.2's category management improvements.
3. Commit to GitHub, deploy that commit on Vercel, and check logs show `finzaro@4.5.3`.
4. Confirm **all** `npm run check` stages pass (lint, typecheck, tests, production build). This quality gate remains enabled.
5. On iPhone Safari/PWA, verify the Dashboard's Chi/Thu toggles independently update the comparison color and sign on day, month and year cards. Check a zero prior period and equal periods. Hard-refresh or install-update if the PWA continues showing older code/version.

## Validation and limitations

- Unit and regression tests: see `tests/v453-financial-comparison-logic.test.mjs`.
- Run `npm test` and `node scripts/check-release.mjs` after replacing source. Source-level TypeScript syntax can also be checked independently.
- **Full project ESLint, TypeScript semantic typecheck, and Next.js production build cannot be certified by source-only tests** if npm dependencies are unavailable in the packaging environment. Confirm these steps on Vercel before production use.
