# Acceptance — V0.1.0 Foundation & Secure Account

## Product scope

- [x] Mobile-first PWA shell.
- [x] Signup, login, logout, forgot/reset password.
- [x] Profile foundation.
- [x] Bottom navigation: Tổng quan / Giao dịch / + Thêm / Kế hoạch / Công cụ.
- [x] Light/dark themes.
- [x] Banking package reserved only; no banking calculator implemented.

## Data & security

- [x] PostgreSQL/Supabase foundation migration.
- [x] `profiles`, `workspaces`, `workspace_members`, `accounts`, `categories`, `transactions`, `transaction_lines`, `audit_logs`.
- [x] Money uses `NUMERIC(20,2)`.
- [x] No mutable `accounts.balance` column.
- [x] Per-workspace idempotency key for transactions.
- [x] RLS enabled on all user/finance tables.
- [x] Owner/member/viewer helper policies.
- [x] User bootstrap trigger creates profile, personal workspace and starter categories.
- [x] App audit hooks for login/logout/profile/password changes; Supabase Auth logs remain provider-level source.

## PWA

- [x] Web manifest.
- [x] 192px and 512px icons.
- [x] Service worker registration.
- [x] Privacy-safe offline fallback.
- [x] Authenticated pages/API data are not cached in V0.1.0.

## Design system gate

- [x] Button, input, field, card.
- [x] Dialog.
- [x] Bottom sheet.
- [x] Money input returning decimal string rather than JS Number.
- [x] Date input.
- [x] Toast provider.
- [x] Empty/error/loading states.

## Delivery & operations

- [x] Vercel configuration.
- [x] GitHub CI: lint, typecheck, financial schema guards, build.
- [x] Manual controlled staging database migration workflow.
- [x] Optional Sentry configuration.
- [x] RLS owner/non-owner smoke-test template.

## Must be verified after connecting a real Supabase project

- [ ] Mobile signup → email confirm → authenticated dashboard.
- [ ] Login/logout persistence on installed PWA.
- [ ] Password recovery from production email link.
- [ ] User A cannot read User B workspace data.
- [ ] Staging migration workflow runs with project secrets.
- [ ] Sentry receives a test event when DSN is configured.
- [ ] Install prompt/standalone launch verified on target mobile browsers.

Only after these environment-dependent checks pass should development branch to V0.2.0 Income & Expense Core.
