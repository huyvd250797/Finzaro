# Finzaro V3.0.0 — Professional Release

**Source:** Finzaro V2.5.0 user-supplied ZIP (combined source upgrade V2.6.0 + V3.0.0).  
**Release date:** 2026-11-11  
**Database:** No migration; no schema changes; no changes to existing transactions or Supabase RPCs.  
**Dependencies:** No new npm packages; existing Next.js / React / Supabase versions retained.  
**Modules:** Six active modules only: Overview, Transactions, Accounts, Categories, Reports (including Calendar), Settings.

## V2.6.0 — Scale, Motion & Accessibility

- **History scaling:** `/transactions` shows the first **80** entries; **Xem thêm giao dịch** expands to 160/240/etc. Query window is bounded to 1,000 recent transactions for interactive history. Category, type, date and account filters remain available. For older data, narrow the date range; financial report exports retain their existing full-range behavior. Stable secondary `id` ordering prevents ambiguous ordering when transaction timestamps match.
- **Chart scaling:** monthly trends render at most about 32 clickable bars. Data across more than 24 months is grouped into three-month buckets, or longer buckets on very large ranges. **No financial totals are discarded:** chart buckets sum the original rows; Excel/CSV and statement tables still use ungrouped data. Drill-down links open all dates within the selected bucket, clamped to the requested reporting period.
- **Category scaling:** replace repeated scans and `Array.shift()` with a parent-child index and a cursor queue. Complexity for descendants becomes approximately O(number of categories + returned descendants); malformed cycles are guarded.
- **Tactile keypad:** every on-screen calculator key scales **1 → 1.075 → 1** when pressed/released (Pointer Events and native keyboard activation), with no React rerender solely for press animation. The visual transition takes approximately 145 ms, uses transform instead of layout, and is suppressed when the OS requests reduced motion. Desktop number keys, decimal point, arithmetic operators and Backspace are also accepted when calculator is open.
- **Accessibility:** bottom sheets trap Tab/Shift+Tab within the current dialog, use Escape to dismiss, restore focus to their trigger, and initially focus a calculator key when opening the money entry. Focus rings, high-contrast borders and accessible key names are provided; existing pinch zoom and reduced-motion behavior remain supported.
- **Micro-interactions:** short press responses for navigation and action controls, with no expensive page-wide animations.

## V3.0.0 — Professional Release stabilization

- Central version strings updated to `3.0.0`; new release preflight and six-module checks are included.
- Existing financial accounting rules, currency separation, user scope, login, transfer RPCs, report exports and PWA update logic preserved.
- Explicit source-only regression tests added for scalability, chart total parity, keypad press/release and accessible overlay focus.
- No database transaction updates are executed by packaging this source.

## Deployment (Vercel)

1. **Backup** GitHub code and production Supabase metadata/configuration. Keep V2.5.0 ZIP as a rollback source.
2. Extract the ZIP root to the repository (do not upload a parent folder). Keep existing Supabase environment variables; never commit `.env.local` or access tokens.
3. In a network-enabled build environment run:
   ```bash
   npm install --no-audit --no-fund
   npm run release:check
   npm test
   npm run lint
   npm run typecheck
   npm run build
   ```
   **Note:** The uploaded source contains no `package-lock.json`; `npm ci` cannot be used until a valid lockfile is generated and committed. If adding a lockfile later, use `npm ci` in CI.
4. Deploy to a **preview environment first**. Verify all six modules, signed-in RLS behavior, PWA version indicator V3.0.0, Light/Dark, and account balances.
5. Test mobile touch keypad hold/release animation; use hardware keyboard and screen-reader/keyboard focus on desktop. Test Reduced Motion, high contrast, nested bottom sheets, overlays and scroll recovery.
6. Test interactive transaction history with 1,000 / 5,000 / 10,000 seeded transactions. The initial history DOM is bounded, but loading very old dates through the UI requires filters and the interactive list cap remains 1,000 records. **Do not interpret this as benchmarked 10k remote loading.**
7. Test report custom date ranges over 24 months, monthly chart bucket drill-down, monthly statement totals and XLSX/CSV/PDF output consistency; ensure transfers and other currencies do not inflate ordinary Thu/Chi.
8. Only after preview passes, deploy production and monitor Next.js Runtime Logs, Web Vitals and Supabase API timings. On failure, redeploy V2.5.0 source (no database rollback needed).

## Verification status (this package)

- `node scripts/check-release.mjs`: **PASS** (six modules; source imports verified).
- `node --test tests/*.test.mjs`: **109/109 PASS**.
- Global TypeScript `transpileModule` source syntax scan: **114 source files, zero parse errors** (not a typecheck).
- Synthetic six-month cashflow aggregation: **1,000 / 5,000 / 10,000** transactions, totals cross-checked with baseline. Numbers vary by machine; no database involved.
- `npm install --offline`: **blocked (`ENOTCACHED` for `@supabase/ssr`)**. As a consequence **ESLint, full TypeScript typecheck, Next.js production build, and browser/UAT are unverified**. Do not claim production readiness until these steps pass in deployment CI.
