# Finzaro V0.2 — Authentication

Finzaro is a PWA-first personal finance platform. V0.2 turns the V0.1.1 Supabase foundation into a real user-authenticated application while keeping Accounts and Transactions on demo data until V0.3/V0.4.

## Included in V0.2

- Next.js 16 + React 19 + TypeScript strict + Tailwind CSS 4
- Supabase email/password Register, Login and Logout
- Cookie-based SSR auth through `@supabase/ssr`
- Next.js 16 `proxy.ts` session refresh
- Server-side route protection using `supabase.auth.getClaims()`
- Email confirmation endpoint supporting token-hash and PKCE code flows
- Forgot password + reset password flow
- Auth callback endpoint prepared for future OAuth/PKCE providers
- Automatic `profiles` + `user_preferences` creation from V0.1.1 trigger
- Settings page connected to real authenticated profile/preferences data
- RLS-backed profile/preferences updates without service-role credentials
- Header displays the signed-in user's identity and provides Logout
- PWA service worker hardened so authenticated HTML is never cached
- Vercel-ready environment setup
- SQL Editor verification script for the existing foundation
- Auth-focused smoke tests

## Roadmap boundaries

Still intentionally demo-only:

- Accounts → V0.3
- Transactions / ledger → V0.4
- Category engine → V0.5

V0.2 establishes identity/session isolation before real financial records are introduced.

## Supabase database

If you already executed this file in SQL Editor for V0.1.1:

```text
supabase/migrations/20261005110000_foundation_environment.sql
```

do not run it again.

**V0.2 requires no new schema migration.** It activates Auth against the existing foundation.

Optional verification query:

```text
supabase/sql-editor/V0.2_auth_verification.sql
```

Full setup: [`docs/SUPABASE_AUTH_SETUP.md`](docs/SUPABASE_AUTH_SETUP.md)

## Environment variables

Vercel production/development values:

```dotenv
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SITE_URL=https://your-finzaro.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_DEV_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

`NEXT_PUBLIC_SITE_URL` is used as the canonical deployment URL. During local/preview requests the auth actions can fall back to the current request origin.

No Supabase secret/service-role key is required by the app.

## Supabase Auth configuration

Configure:

1. Authentication → Providers → Email enabled.
2. Keep email confirmation enabled for the hosted DEV project.
3. Authentication → URL Configuration → set Site URL to your deployed Finzaro URL.
4. Add the deployed URL to Redirect URLs.
5. Optionally customize Confirm signup and Recovery templates for explicit token-hash SSR links.

See [`docs/SUPABASE_AUTH_SETUP.md`](docs/SUPABASE_AUTH_SETUP.md) for exact links and tests.

## Main auth routes

```text
/login
/register
/forgot-password
/reset-password
/auth/confirm
/auth/callback
```

Protected application routes include the complete `(dashboard)` route group, because `app/(dashboard)/layout.tsx` verifies the authenticated identity server-side before rendering.

## Session model

```text
Browser
  ↓
Supabase Auth cookie session
  ↓
Next.js proxy.ts refreshes/verifies token
  ↓
Dashboard layout calls getClaims()
  ↓
Authenticated user ID
  ↓
RLS-scoped profiles / user_preferences
```

Server authorization does not rely on `getSession()`.

## PWA security change

V0.1/V0.1.1 cached navigation HTML for offline use. That is unsafe once pages become user-specific.

V0.2 changes the service worker so:

- authenticated/navigation HTML is never persisted in Cache Storage;
- API/auth routes are not cached;
- only static assets/icons are cached;
- an offline navigation receives the generic `/offline` screen.

## Install / quality check

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

## GitHub → Vercel

Push the repository to GitHub, import it in Vercel, add the required environment variables, and deploy.

After deployment test in order:

```text
/register
→ confirmation email
→ /overview
→ /settings
→ logout
→ /login
→ /forgot-password
```

## Security baseline

- Public browser/server clients use only the publishable key.
- No service-role credential is bundled.
- Identity is verified server-side before dashboard rendering.
- Existing RLS remains the authorization boundary for user-owned rows.
- Password recovery does not reveal whether an email exists.
- Redirect targets used by callbacks are restricted to local app paths.
- Authenticated HTML is not stored by the service worker.

## Next release

### V0.3 — Account Core

Planned scope:

- Real `accounts` schema
- Cash / bank / e-wallet account types
- Account CRUD
- Opening balances
- Per-user RLS
- Dashboard total balance sourced from real accounts
- Account archive lifecycle
