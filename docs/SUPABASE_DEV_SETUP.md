# Finzaro V0.1.1 — Supabase DEV Setup

This release introduces the database environment only. Authentication remains a mock UI until V0.2, Accounts stay demo-only until V0.3, and Transactions stay demo-only until V0.4.

## Recommended path: remote DEV project first

Finzaro can be pushed to GitHub and deployed to Vercel without running the application locally. Create a separate Supabase project named **Finzaro DEV** and do not reuse a production finance database.

### 1. Create Finzaro DEV in Supabase

Create a new Supabase project. After it is ready, open **Connect** and copy:

- Project URL
- Publishable key (`sb_publishable_...`)
- Project reference ID

Do not copy a secret key into browser/Vercel public environment variables.

### 2. Configure local environment file (optional for local Next.js)

```bash
cp .env.example .env.local
```

Fill in:

```dotenv
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_DEV_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_PROJECT_REF=YOUR_DEV_PROJECT_REF
```

### 3. Install dependencies

```bash
npm install
```

The Supabase CLI is installed project-locally, so use `npx supabase ...` or the npm scripts in this repository.

### 4. Link the repository to Finzaro DEV

```bash
npx supabase login
npx supabase link --project-ref YOUR_DEV_PROJECT_REF
```

Link state is stored under `supabase/.temp/` and is intentionally ignored by Git.

### 5. Push the database migration

```bash
npm run db:push
```

The migration creates only the V0.1.1 foundation:

- `supported_currencies`
- `profiles`
- `user_preferences`
- `set_updated_at()` trigger function
- `handle_new_user()` Auth bootstrap function
- RLS policies

It deliberately does **not** create Accounts or Transactions yet.

### 6. Regenerate database types from the linked DEV project

```bash
npm run db:types:linked
```

Review the generated `lib/supabase/database.types.ts` and commit it when schema changes are intentional.

### 7. Configure Vercel

In Vercel → Project → Settings → Environment Variables, add:

```text
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SUPABASE_URL=<Finzaro DEV project URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Finzaro DEV publishable key>
```

For V0.1.1, you can assign these to **Preview** and to the temporary V0.1.1 production deployment while the app is still under development. Do not store real personal financial data in this DEV project.

Redeploy after adding variables.

### 8. Verify from the deployed application

Open:

```text
/settings
```

The **Supabase DEV** diagnostics card should show:

- Environment: DEVELOPMENT
- Configuration: Configured
- Database: latency in milliseconds

You can also call:

```text
/api/health/database
```

A healthy response contains `connected: true`.

## Optional local Supabase stack

A Docker-compatible runtime is required for the traditional local stack.

```bash
npm run db:start
npm run db:reset
npm run db:test
npm run db:lint
```

When finished:

```bash
npm run db:stop
```

The committed `config.toml`, migrations and seed make the local database reproducible.

## Important safety rules

- Never use the Finzaro production database for development.
- Never commit `.env.local`, access tokens, database passwords or secret keys.
- Browser code receives only the publishable key.
- Every user-owned table must have RLS before it is exposed through the Data API.
- `supabase db reset --linked` is destructive; never run it against production.
