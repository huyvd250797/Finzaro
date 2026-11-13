# Finzaro V4.0.3 — Deployment / Release QA

## Release scope

Base: **V4.0.2** (ZIP provided by user). This patch changes only startup presentation, bottom-sheet initial focus and a daily expense card on Overview.

### Migration / dependencies

- No SQL migration. Existing database schemas, RLS, RPCs and monetary accounting remain unchanged.
- No additional npm dependency.
- All six modules remain intact.
- Do not reset Supabase data or modify production rows.

## Release workflow

1. Back up the currently deployed V4.0.2 branch and database configuration; deploy the complete V4.0.3 source to a staging project.
2. Install dependencies and run `npm run check` (lint, TypeScript, tests and Next.js build). Do **not** ignore `typecheck`/build errors.
3. On iPhone Safari **and** installed PWA, cold-launch from the home-screen icon after stopping the app. The branded Splash should appear as the first **web document** without waiting for an authentication redirect, then route to Overview or Login. Test dark and light appearance, slow network, offline recovery and cache refresh.
4. Tap bottom taskbar `+` from Overview. The grip must be clean (no broad bright green outline); dragging down, close button, Escape/focus behavior and scroll/Save position must remain functional.
5. On Overview, verify today's date in the configured timezone, correct total, categories and recent expense entries. Test 0 expenses, multiple purchases, mixed currencies, transfers, after-midnight/near-midnight and 30+ days of transactions. Compare against the filtered `/transactions?type=expense&from=YYYY-MM-DD&to=YYYY-MM-DD` screen.
6. After creating/editing/deleting an expense, check Overview refreshes and the 'today' summary matches persisted database entries. Ensure bottom nav and Save bar remain locked at viewport/sheet bottom, including overscroll and keyboard-open scenarios.
7. Deploy to production only after staging build and device/browser tests pass. Confirm PWA service worker updates to V4.0.3 and refresh outdated installs if needed.

## Architecture notes

- `/pwa` is now intentionally **public** and contains no account data. Its early HTML response avoids waiting for Supabase `getClaims()` before the splash can paint. It redirects client-side after paint to `/overview`, where authentication is still enforced.
- The service worker may cache only this anonymous splash document; all user-dependent HTML remains network-only.
- iOS may show an OS-owned launch surface before the browser can receive any HTML; no web change can fully control that native interval.
- Overview today expenses are computed from the same monthly ledger used by existing cards, excluding transfers and other currencies. Amounts are in minor units until formatted for display.

## What has been tested in this environment

- Node test suite: `169/169` PASS.
- Source validation: `node scripts/check-release.mjs` PASS after source sync.
- TypeScript AST syntax: `132` TS/TSX/JS source files parsed with no syntax diagnostics.
- CSS parse: PASS.
- Anonymous Splash HTML rendered in headless Chromium at 390×844; preview: `Finzaro-V4.0.3-Startup-Splash-QA.png`.
- SQL file hash comparison with base: no changes.

**Not confirmed here:** full lint, `tsc --noEmit`, Next.js production build, live Supabase / Vercel latency and physical Safari/iPhone PWA. The result must not be described as production-ready until these checks pass.
