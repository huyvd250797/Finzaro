# Changelog

### V0.0.9 — Deploy build fix

- Fixed TypeScript inference in `app/api/reports/export/route.ts`: CSV rows now explicitly accept both `string` and `number` cells.
- Resolves Vercel `TS2322` on the source/destination minor-unit amount columns during `next build`.
- No database migration or environment-variable changes are required.

## V0.0.9 — Savings Goals

- Added real Supabase `savings_goals` and `savings_goal_entries` with per-user RLS.
- Added target amount/date, currency, linked account, icon and archive lifecycle.
- Added contribution, withdrawal and signed manual-adjustment history.
- Added progress %, remaining amount, completed/on-track/behind/overdue states.
- Added monthly-required saving calculation and completion-date forecast when enough contribution history exists.
- Added optional traceability from a Goal Entry to one matching Transaction Ledger transaction with DB-level currency/account/direction validation.
- Kept Savings Goals as a planning/earmarking layer so goal progress never silently mutates Account balances.
- Added Savings Goals page, instant create/edit/progress modals and pending button states.
- Added Dashboard Savings Goals summary and mobile navigation shortcut.
- Preserved PWA Auth Bootstrap, 5xx recovery and proactive update prompt.
- Updated current version to `V0.0.9 · Savings Goals`.
- Defined V0.0.10 Interest & Deposit Manager as the next release.

## V0.0.8 — Reports & Financial Insights

- Rebuilt Reports from real Account + Transaction Ledger data.
- Added period/currency/account/category/type filters.
- Added income, expense, net cash flow, savings rate and average expense analytics.
- Added spending-by-category and spending-by-account breakdowns.
- Added Budget vs Actual and 30-day Recurring Commitments.
- Added rule-based Financial Insights.
- Added authenticated CSV report export.
- Fixed iPhone Home Screen launch: PWA now boots through `/pwa` and can login inside the installed app without Safari session.
- Hardened optional auth and proxy so missing PWA cookies redirect to Login instead of causing server error.
- Added PWA navigation 5xx recovery screen.
- Updated version to `0.0.8`.

## 0.0.7 — Recurring Transactions & Financial Calendar

- Added Supabase `recurring_rules` and `recurring_occurrences` with per-user RLS.
- Added weekly/monthly/yearly schedule projection with interval support and end dates.
- Added recurring Income, Expense and Transfer rules with category/account ownership validation.
- Added Financial Calendar month view with Upcoming, Due, Overdue, Paid and Skipped states.
- Added authenticated `post_recurring_occurrence_v007` RPC that creates a real Transaction Core ledger transaction when a due item is confirmed.
- Added undo flow that reverses the linked ledger transaction when applicable.
- Added pause/resume lifecycle for recurring rules.
- Added upcoming recurring summary to Dashboard and mobile navigation shortcut to Financial Calendar.
- Optimized authenticated server work by request-deduplicating `requireUser()` and removing the redundant `getUser()` round-trip.
- Added instant local modal opening for high-frequency create flows to eliminate ~1s perceived form-opening delay.
- Added `useFormStatus()` loading labels/spinners for Login, Register, Create Account, Transaction, Category, Budget and Recurring actions.
- Added route navigation progress and dashboard loading skeletons for immediate visual feedback.
- Preserved proactive iPhone PWA update prompt and centralized version metadata.
- Updated current version to `V0.0.7 · Recurring Transactions & Financial Calendar`.
- Defined V0.0.8 Reports & Financial Insights as the next release.

## 0.0.6 — Budget Engine

- Added real Supabase `budgets` with monthly/category/currency scope and per-user RLS.
- Added minor-unit budget amounts, first-day-of-month validation and safe amount constraints.
- Added parent-category budget rollup across subcategories using real Expense ledger entries.
- Added active ancestor/descendant overlap protection to prevent budget double counting.
- Added category re-parenting guard so hierarchy changes cannot create overlapping active budgets.
- Added create/edit/archive/restore Budget lifecycle and month navigation.
- Added copy-from-previous-month flow for empty target months.
- Added Near Limit (>=80%) and Over Budget (>100%) states, remaining amount and progress bars.
- Added multi-currency budget separation without implicit FX conversion.
- Replaced Budget preview with authenticated Budget Engine data.
- Added current-month Budget summary to Dashboard.
- Preserved V0.0.5 proactive PWA update prompt for iPhone Add-to-Home-Screen installs.
- Updated centralized in-app version to `V0.0.6 · Budget Engine`.
- Defined V0.0.7 Recurring Transactions & Financial Calendar as the next release.

## 0.0.5 — Category Engine

- Added user-owned structured `categories` with RLS, hierarchy, default categories and archive lifecycle.
- Added allow-listed Lucide icon selection for every category.
- Added custom categories and subcategories for Income and Expense.
- Added automatic default-category bootstrap for existing users and future signups.
- Added `transactions.category_id` while preserving `category_label` as a historical snapshot.
- Migrated existing V0.0.4 free-text category labels into structured categories.
- Added V0.0.5 category-aware atomic transaction RPCs and revoked authenticated access to the V0.0.4 write RPCs.
- Added Category management page and Category link in desktop/mobile navigation.
- Added category icons to transaction history and Dashboard expense breakdown.
- Added transaction filtering by category.
- Added `/api/version`, service-worker waiting lifecycle and in-app **Cập nhật ngay** PWA update prompt.
- Added no-store delivery for `/sw.js` and explicit service-worker activation on user confirmation.
- Updated centralized in-app version to `V0.0.5 · Category Engine`.
- Defined V0.0.6 Budget Engine as the next release.

## 0.0.4 — Transaction Core

- Added real Supabase `transactions` and `transaction_entries` ledger tables.
- Added Income, Expense and Transfer flows backed by authenticated PostgreSQL functions.
- Added atomic ledger + account-balance updates and transaction deletion with balance reversal.
- Added read-only authenticated grants for ledger tables; direct client writes are blocked.
- Hardened account grants so current balance/currency can no longer be edited directly after Transaction Core.
- Added opening-balance enforcement for newly created accounts.
- Replaced demo transaction history with real Supabase data and filters.
- Connected Dashboard monthly Income, Expense, Net Cash Flow, six-month chart, category snapshot and Recent Transactions to real ledger data.
- Added same-currency and explicit cross-currency transfers without implicit FX conversion.
- Updated account editing so balance changes must flow through transactions.
- Updated centralized in-app version to `V0.0.4 · Transaction Core`.
- Added SQL Editor setup/verification scripts and Transaction Core pgTAP + Node smoke tests.
- Defined V0.0.5 Category Engine as the next release.

## 0.0.3 — Account Core

- Added real Supabase `accounts` schema for cash, bank, e-wallet and savings accounts.
- Added per-user account RLS policies and ownership index.
- Added minor-unit `BIGINT` opening/current balance model with safe-integer validation.
- Replaced demo Accounts page with authenticated Supabase data.
- Added create, edit, archive and restore account flows.
- Connected Dashboard Total Balance and account list to real account rows.
- Added multi-currency grouping and avoided invalid cross-currency totals.
- Added centralized `APP_VERSION` metadata and in-app version display.
- Added SQL Editor migration/verification scripts and Account Core setup documentation.
- Added Account Core smoke tests.
- Defined V0.0.4 Transaction Core as the next release.

## 0.0.2 — Authentication

- Replaced mock login with real Supabase email/password authentication.
- Added Register, Login and Logout server actions.
- Added cookie-based SSR session handling with Next.js 16 `proxy.ts`.
- Added server-side dashboard protection using verified Supabase claims.
- Added confirmation endpoint supporting token-hash and PKCE code flows.
- Added forgot-password and reset-password flows.
- Added generic auth callback endpoint for future OAuth/PKCE expansion.
- Connected Settings to authenticated `profiles` and `user_preferences` rows.
- Added RLS-backed profile and preference update actions.
- Added signed-in identity and Logout control to the application header.
- Updated landing page for account-based onboarding.
- Hardened the PWA service worker to never cache authenticated navigation HTML.
- Added Supabase Auth URL/template configuration documentation.
- Added optional SQL Editor verification script; no new V0.0.2 schema migration is required.
- Added auth scope/security smoke tests.

## 0.1.1 — DEV Database Environment

- Added Supabase CLI as a project-scoped dev dependency and committed `supabase/config.toml`.
- Added reproducible migration + seed workflow for the Finzaro DEV database.
- Added `supported_currencies`, `profiles` and `user_preferences` foundation tables.
- Added automatic profile/preferences bootstrap on future Supabase Auth sign-up.
- Added RLS policies for user-owned profile/preferences data.
- Added typed browser/server/public Supabase clients and baseline generated-style database types.
- Added current Supabase publishable-key environment naming.
- Added runtime database health endpoint and Settings diagnostics card.
- Added local pgTAP foundation tests plus Node smoke tests for database scope/security.
- Added DEV/Preview/Production environment documentation and Vercel configuration instructions.

## 0.1.0 — Foundation & PWA

- Added Finzaro fintech design system and responsive shell.
- Added landing page and mock authentication UI.
- Added overview, accounts, transactions, budgets preview, reports preview and settings routes.
- Added PWA manifest, install icons, service worker and offline fallback.
- Added dark/light mode and demo financial dataset.
- Added Vercel config, CI workflow, tests and deployment documentation.
## V0.0.9 deploy fix — authenticated prerender / ByteString

- URL-encode unauthenticated Vietnamese redirect messages with `URLSearchParams` before Next.js writes the `Location` header.
- Mark the authenticated dashboard layout as `force-dynamic` so protected pages are not prerendered during production build without a user session.
- Fixes Vercel build failure on `/goals`: `Cannot convert argument to a ByteString ... value of 273`.

