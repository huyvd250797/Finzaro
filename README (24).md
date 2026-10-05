# Finzaro — V0.1.2

## V0.1.2 deployment hotfix

This patch fixes Vercel TypeScript build errors in Sentry initialization and the Next.js PWA manifest icon purpose type.


**Foundation & Secure Account** for a mobile-first personal finance PWA.

This release intentionally stops before real income/expense entry. Its job is to establish a trustworthy foundation so V0.2.0 can add Money Core without replacing auth, RLS, navigation, PWA shell or core data contracts.

## Included

- Next.js 16 App Router + React + TypeScript + Tailwind CSS.
- Supabase Auth with SSR cookie sessions and Next.js 16 `proxy.ts` refresh/authorization.
- Sign up, sign in, sign out, forgot/reset password, email confirmation endpoint.
- PostgreSQL/Supabase migration for profiles, workspaces, members, accounts, categories, transactions, transaction lines and audit logs.
- Row Level Security for owner/member/viewer boundaries.
- Money stored as PostgreSQL `NUMERIC(20,2)`; no mutable `accounts.balance` column.
- Transaction idempotency key, version, reversal reference and audit foundation.
- Mobile-first shell, bottom navigation, desktop navigation, light/dark theme.
- Installable PWA manifest, icons, service worker and privacy-safe offline fallback.
- Profile settings and security placeholders for MFA/passkey expansion.
- Optional Sentry integration.
- GitHub CI plus manual staging database migration workflow.
- Reserved `domain-money`, `domain-banking`, `ui`, `db` and `shared` packages.

## Quick start — deploy-first

1. Create a **new Supabase project** for development/staging.
2. Run `supabase/migrations/202610050001_foundation.sql` in Supabase SQL Editor, or use Supabase CLI.
3. Configure Supabase Auth URLs and the signup confirmation template using `docs/SETUP_SUPABASE.md`.
4. Push this repository to GitHub.
5. Import the repository in Vercel.
6. Add these environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - optional Sentry variables from `.env.example`
7. Deploy. No custom Vercel build command is required.

See `docs/DEPLOY_VERCEL.md` for the exact sequence.

## Optional local validation

```bash
cp .env.example .env.local
npm install
npm run dev
```

Quality gate:

```bash
npm run check
```

## Database rule that must not be broken

`accounts` does **not** store an authoritative mutable balance. Balance will be derived/rebuilt from confirmed ledger data. All authoritative money amounts use PostgreSQL `NUMERIC`, while domain boundaries represent decimals as strings until a decimal-safe engine is introduced.

## PWA offline scope in V0.1.0

The service worker caches only the offline page and public icons. Authenticated HTML/API responses are not cached. Offline transaction queues are intentionally deferred to V0.6.0.

## Version path

- **V0.1.1:** Foundation & Secure Account — Sentry/Next.js 16 deployment hotfix.
- **V0.1.0:** Foundation & Secure Account — initial package.
- **V0.2.0:** Income & Expense Core.
- **V0.3.0:** Accounts, Wallets & Transfers.
- **V0.4.0:** Budget & Spending Control.
- **V0.5.0:** Dashboard & Financial Analytics.

## Repository layout

```text
src/app/                 Next.js routes
src/components/          UI, shell, auth, PWA, theme
src/lib/supabase/        Browser/server clients + Proxy session handling
packages/domain-money/   Money contract reserved for the engine
packages/domain-banking/ Banking contract reserved; no calculator in V0.1.0
packages/db/             Schema source and RLS smoke test
supabase/migrations/     Supabase CLI versioned migrations
.github/workflows/       CI and staging migration pipeline
docs/                    Deployment and Supabase setup
```

## Security notes

- Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable.
- V0.1.0 does not store bank passwords, PINs or card CVV.
- RLS is required even when requests originate from server components.
- Supabase Auth logs are the authoritative provider-level authentication log; `audit_logs` is the application audit foundation.
- Production database migrations should be versioned and applied through a controlled environment, never by ad-hoc schema edits.
