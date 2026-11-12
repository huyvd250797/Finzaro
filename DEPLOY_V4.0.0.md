# Finzaro V4.0.0 — Premium UX Release

## Scope

Full-source upgrade from Finzaro V3.6.0. This is a UX hardening release, **not** an accounting or database redesign. Six modules unchanged. New dependency count: zero. No new SQL migration; compare the 91 SQL files against the V3.6.0 release.

## Main UX work

1. **UI consistency:** shared premium light/dark tokens and existing card/button/input primitives retained; consistent focus/touch/empty/error treatment.
2. **Mobile layout:** 40px transaction action controls, small-phone second-row actions for 320–390px viewports, retained iOS safe area and sticky transaction Save.
3. **Navigation:** preserve existing V3.6.0 safe URL filters, scroll restoration and delayed navigation indicator. Re-entry animation refined to a short compositor-only translation without fading the data.
4. **Transaction forms:** client validation for missing/zero/non-finite money (server remains authoritative), inline error message, focus and scrolling into the visible sheet, native invalid control handling. The calculator's 114% press effect and delayed release remain intact.
5. **Reports/Calendar:** retain V3.5.0 interactive charts, client-only Thu/Chi toggle and calendar's daily income/expense layout. No changes to calculation/aggregation rules.
6. **Bottom sheet:** retain portal, keyboard-aware VisualViewport and swipe grip. Keep page scroll locked until exit animation ends. Error reveal scrolls **the sheet**, never the blocked underlying page.
7. **Loading:** module-appropriate route skeletons for Accounts, Categories, Transactions, Settings and Financial Statements. Splash waits for real content and does not mistake a route skeleton for a loaded screen.
8. **Theme & accessibility:** follow system theme until explicitly overridden; respond to OS changes and other tabs, preserve reduced-motion/high-contrast focus rules and 40px+ transaction actions.
9. **Empty states:** transaction list offers direct entry to new expense without losing the existing filters/data.
10. **Performance:** no new external dependencies, no heavy animation library, no data prefetch and no new RPC. Preserve existing staged lists, cache/selection and server-side accounting.

## Required deployment checks

1. Back up Supabase and deploy **staging** first. No V4 SQL to run. Existing V3.2.0 Batch Copy migration is still required if environment has never applied it.
2. Set existing environment variables (see `.env.example`). Do not copy secrets into ZIP/source control.
3. Use Node 22.x and npm 10.x, run `npm install --no-audit --no-fund` (this source does not ship a package-lock), then `npm run check` to execute lint, TypeScript, test suite and Next.js production build. **Stop deployment on any failure.**
4. On iPhone Safari and installed PWA: test the form with the software keyboard open and closed; invalid/empty amount; scrolling to error; switching Thu/Chi; sticky Save; cancel; nested keypad; click/swipe/scroll; safe-area with bottom navigation.
5. On Android Chrome and desktop: test the same transaction flows, Escape/Tab in overlays, copy, delete error rollback and Reports/Calendar return state. In Calendar use arrow keys and Home/End to change selected day without requiring a pointer.
6. Validate report figures and account balances before/after a known fixture set. Standard transfer must not count as ordinary income/expense; existing transactions must not duplicate.
7. Inspect DevTools Network/Performance under real device/network conditions for LCP, INP, CLS and the delayed navigation progress. Only claim latency improvements after measuring p50/p95.
8. Rollback: redeploy the V3.6.0 source build without changing Supabase or deleting any data. V4 requires no schema migration reversal.

## Verification completed during packaging

- Node test suite including V4 smoke assertions (155/155).
- TypeScript/TSX/JS **syntax-only** transpilation of 135 files with global TypeScript 5.8.3.
- CSS parsed with tinycss2.
- `node scripts/check-release.mjs` and `npm run release:check`.
- SHA-256 match of 91 SQL files to supplied V3.6.0 source.
- ZIP CRC check after packaging.

**Not verified during packaging:** ESLint, complete TypeScript typechecking, Next.js production build, Supabase staging integration, or Safari iPhone hardware E2E. An offline `npm ci` cannot install this project's dependencies in this environment. Source-only tests do **not** prove production readiness. See `docs/V4.0.0_QA.md`.
