# Finzaro V0.1.1 — DEV Database Environment

Finzaro is a PWA-first personal finance platform. V0.1.1 upgrades the V0.1 frontend foundation with a reproducible Supabase DEV environment while keeping Accounts and Transactions on demo data until their planned releases.

## What is included

- Next.js 16 + React 19 + TypeScript strict + Tailwind CSS 4
- Existing professional fintech UI and PWA shell from V0.1
- Supabase JS + SSR clients using the current publishable-key model
- Project-scoped Supabase CLI
- Committed `supabase/config.toml`
- Versioned database migration and repeatable seed data
- `profiles` + `user_preferences` foundation for V0.2 Auth
- `supported_currencies` reference table
- Auth-user bootstrap trigger prepared for V0.2
- RLS policies for all user-owned V0.1.1 tables
- Typed database client definitions
- `/api/health/database` runtime connectivity check
- `/settings` Supabase DEV diagnostics
- pgTAP database tests for local Supabase
- GitHub/Vercel-ready environment documentation

## Deliberately not included yet

- Real Login/Register/Logout — V0.2
- Real Accounts table/data access — V0.3
- Real Income/Expense/Transfer ledger — V0.4

This keeps the roadmap boundaries clean.

## Install and quality check

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Or:

```bash
npm run check
```

## Create Finzaro DEV Supabase

The recommended setup is a separate Supabase project named **Finzaro DEV**.

1. Create the project in Supabase.
2. Copy the **Project URL**, **publishable key**, and **project ref**.
3. Install dependencies.
4. Link the project and push the migration:

```bash
npx supabase login
npx supabase link --project-ref YOUR_DEV_PROJECT_REF
npm run db:push
npm run db:types:linked
```

Full instructions: [`docs/SUPABASE_DEV_SETUP.md`](docs/SUPABASE_DEV_SETUP.md)

## Required environment variables

Copy `.env.example` to `.env.local` for local Next.js development:

```dotenv
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_DEV_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

The application build does not read a secret/server key.

## Vercel deployment

Push the project to GitHub and import it in Vercel. Then configure these Vercel environment variables:

```text
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SUPABASE_URL=<Finzaro DEV URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Finzaro DEV publishable key>
```

Redeploy and open `/settings`. The Supabase DEV diagnostic should report a live database connection.

## Database commands

```bash
npm run db:start          # optional local stack; requires Docker-compatible runtime
npm run db:status
npm run db:reset
npm run db:lint
npm run db:test
npm run db:push           # linked remote DEV
npm run db:pull           # linked remote DEV
npm run db:types:local
npm run db:types:linked
```

Supabase local development applies migrations first and seed data afterward. Keep schema changes in `supabase/migrations/`; seed files should contain only reproducible development/reference data.

## Database foundation

```text
auth.users
   │
   ├── 1:1 → profiles
   │
   └── 1:1 → user_preferences
                    │
                    └── currency_code → supported_currencies
```

When V0.2 creates a real Auth user, the `handle_new_user()` trigger automatically creates the matching profile and preference row.

## Security baseline

- User-owned foundation tables have RLS enabled.
- Users can read/update only their own profile/preferences.
- Browser/server session clients use the publishable key.
- No secret/service key is included in V0.1.1.
- `.env*`, Supabase link state and local secrets are ignored by Git.
- Real financial records must never be placed in DEV seed files.

## Environment strategy

See [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md).

Current stage:

```text
Vercel Preview/Development → Finzaro DEV Supabase
```

Before real financial data is stored:

```text
Vercel Preview  → Finzaro DEV
Vercel Production → Finzaro PROD
```

## Next release

### V0.2 — Authentication

- Real Supabase Register/Login/Logout
- Server-side session cookies
- Next.js auth proxy/session refresh
- Protected dashboard routes
- Email confirmation/reset-password flow
- Profile/preferences UI connected to the V0.1.1 tables
- Auth/RLS integration tests
