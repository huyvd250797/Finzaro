# Finzaro

Finzaro v0.1.3 is the clean deployment baseline for the personal-finance PWA.

## Runtime baseline

- Next.js 15.5.27 (Maintenance LTS)
- React / React DOM 19.2.8
- Node.js 22.x
- Supabase Auth + PostgreSQL
- Single Next.js application; no workspace/monorepo layer
- Production build uses standard `next build`
- Build worker concurrency is limited to one CPU for deployment stability

Mobile-first personal finance PWA foundation built with Next.js, TypeScript, Supabase and PostgreSQL.

Current baseline version: **0.1.3**. This cleanup does not add product features or change the application version. It provides a clean source tree for the next development milestone.

## Included baseline

- Next.js App Router + React + TypeScript + Tailwind CSS.
- Supabase Auth with SSR cookie sessions.
- Sign up, sign in, sign out, forgot/reset password and email confirmation routes.
- PostgreSQL/Supabase schema for profiles, workspaces, members, accounts, categories, transactions, transaction lines and audit logs.
- Row Level Security for workspace-based authorization.
- Money stored as PostgreSQL `NUMERIC(20,2)`; no mutable authoritative `accounts.balance`.
- Transaction idempotency/version/reversal fields and ledger-ready transaction lines.
- Mobile-first shell, bottom navigation, desktop navigation and light/dark theme.
- Installable PWA manifest, icons, service worker and safe offline fallback.
- Reusable form/UI primitives needed by the next Money Core milestone.
- GitHub CI and a manual staging database migration workflow.

## Repository layout

```text
src/                    Next.js application source
public/                 PWA icons and service worker
supabase/migrations/    database migration source of truth
supabase/tests/         RLS/security smoke tests
.github/workflows/      CI and staging database workflow
docs/                   architecture, Supabase and Vercel setup
```

There are no npm workspaces and no nested `package.json` files.

## Environment

Copy `.env.example` to `.env.local` for local development and provide:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Development

```bash
npm install
npm run dev
```

Quality gate:

```bash
npm run check
```

Production build:

```bash
npm run build
```

## Database

Apply only the versioned migrations under `supabase/migrations/`. Do not maintain a second migration copy elsewhere in the repository.

Setup instructions: `docs/SETUP_SUPABASE.md`.

## Deployment

The Next.js application lives at the repository root. On Vercel, keep **Root Directory** at the repository root and use the default Next.js framework detection.

Deployment instructions: `docs/DEPLOY_VERCEL.md`.