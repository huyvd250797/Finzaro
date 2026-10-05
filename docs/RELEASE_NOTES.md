# V0.1.1 — Sentry / Vercel deployment hotfix

## Fixed

- Updated `withSentryConfig` import for `@sentry/nextjs` v11 from `@sentry/nextjs` to `@sentry/nextjs/config`.
- Pinned `@sentry/nextjs` to `11.4.0` so Vercel builds do not silently move across SDK releases.
- No database schema or application behavior changes.

---

# V0.1.0 — Foundation & Secure Account

## Done

- Mobile-first application shell.
- Supabase SSR authentication and route protection.
- Signup/login/logout/password recovery flows.
- Profile settings.
- Workspace-aware PostgreSQL schema.
- RLS baseline.
- NUMERIC money columns and idempotency contract.
- Ledger-ready transaction lines.
- PWA manifest/service worker/icons.
- Light/dark theme.
- Audit foundation.
- Sentry-ready observability.
- CI and controlled staging migration workflow.

## Intentionally not in this release

- Creating/editing real income/expense transactions.
- Account balance calculations.
- Transfers/reconciliation.
- Budgeting.
- Financial analytics.
- Offline transaction queue.
- Bank rate, savings, loan or credit-card calculators.

These remain on the roadmap and should not be pulled into V0.1.0 without changing its acceptance criteria.
