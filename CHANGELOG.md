# Changelog

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
