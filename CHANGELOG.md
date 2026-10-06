# Changelog

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
