# Finzaro V2.0.1 — Performance & Transaction Experience

**Base source:** V2.0.0. **Version shipped:** V2.0.1. Keeps six simple-finance modules. No new SQL migrations required (V1.2.0's `create_simple_transaction_v120` RPC remains mandatory).

## Changes

- Removes unconditional 700 ms full-screen splash (the app renders as soon as HTML/JS is ready).
- Overview now streams **current-month balance and KPIs** separately from **six-month trends** and **recent transactions** via React Suspense. The profile name is also streamed without blocking the shell.
- Turns off eager router prefetch on main navigation to avoid competing initial data requests. No unverified performance numbers are claimed.
- Calendar day cells reduced from 108/120 px to 76/90 px, maintaining two colored lines.
- Expense rose/red, income emerald/green, transfer sky/blue across create-entry launchers and calendar.
- Transaction history grouped by `transaction_date` with unambiguous date heading and per-day count; `created_at` is not used for grouping.
- New Copy action on eligible simple transactions (transaction history and calendar). Select one or multiple dates (max 20) using the calendar. The original remains untouched; creates are made by the existing atomic `create_simple_transaction_v120` RPC.
- Server enforces owner scope, valid dates, valid accounts/categories, excludes archived accounts and legacy non-simple transactions. Partial success returns successful dates; retries skip those dates in the same action-state session. **Multi-day copy is not all-or-nothing** because the existing RPC is atomic per date, not for the entire batch.
- Shared bottom-sheet presentation slides up when opening and down when closing, with a dedicated drag handle (drag down at least 75 px), click-outside and Escape. Supports reduced motion. Used by quick-add, account/category forms, calendar quick-add and calculator.
- Mobile header and desktop sidebar display Logo – Finzaro – V2.0.1 together. Settings and API version are also aligned.

## Deploy to Vercel

1. Keep Supabase URL and publishable key in Vercel project Environment Variables. Do not commit `.env.local`.
2. **Delete obsolete files**, do not merely overlay source in GitHub. V2.0.1 continues to call `source:sync` in `prebuild` to remove known retired paths, but Git repository should be synchronized accurately.
3. Run `npm install --no-audit --no-fund` on a machine with npm network access. This source ZIP does not contain `node_modules` or `package-lock.json`; using npm install is expected under existing Vercel project settings.
4. Run `npm run release:check`, `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build` before going live. The last three compile/lint operations require real dependencies and must be verified in CI/Vercel; do not disable Next type errors.
5. Commit/push the complete source and deploy without build cache if stale modules are suspected.
6. Check `GET /api/version` returns `2.0.1`, then verify login, Overview, Transaction History, calendar, multi-day copies, balances, cash transfers and report figures.
7. Test both light/dark, mobile PWA safe-area, swipe-down (grab handle), and PWA service worker refresh after updating.

## Regression and data integrity

- A copied transaction is a **new ledger transaction**; copying to multiple dates intentionally changes account balances for every selected date. Never clone legacy loan/deposit/card entries.
- For a multi-date partial error, the form tracks already-successful date(s). Retry **without reloading the form** so successful dates are not repeated. On accidental reload, check history before a fresh retry.
- Cross-currency transfers copy both original source and destination currency amounts, subject to live RPC/account checks.
- The copy source is fetched on the server with `user_id` ownership checks; the browser only sends source transaction ID and requested target dates.
- No database tables, RLS policies, account opening balances, historical financial data or Supabase RPC definitions are deleted.

## Validation in build environment

- `npm run release:check` (dependency-free) validates source tree and imports.
- `npm test` validates regression tests when Node 22 is installed. Tests do not replace full Next.js semantic build.
- Full `npm run build` could not be run in the ChatGPT container because registry.npmjs.org returned `EAI_AGAIN`. Complete on Vercel and inspect any first error above `BUILD_UTILS_SPAWN_1`.
