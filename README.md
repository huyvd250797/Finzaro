# Finzaro V0.1 — Foundation & PWA

Finzaro is a professional personal finance web app designed to evolve from expense tracking into budgeting, interest, credit-card, loan and financial-intelligence management.

## Scope of V0.1

This release establishes the deployable product shell:

- Next.js 16 App Router + React 19 + TypeScript strict
- Tailwind CSS 4 design system
- Responsive desktop/mobile application shell
- Landing page + mock login
- Overview dashboard with demo financial data
- Accounts and transactions demo modules
- Budget and reports previews aligned with the roadmap
- Light/dark mode
- PWA manifest, icons, service worker and offline fallback
- Vercel-ready root project
- GitHub Actions quality workflow
- `.env.example` with no secrets required for V0.1

> Supabase is intentionally not connected in V0.1. DEV/PROD database environment work begins in V0.1.1 and real Auth in V0.2.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Or run all checks:

```bash
npm run check
```

## Deploy to Vercel from GitHub

1. Create a new GitHub repository, for example `finzaro`.
2. Push this source to the repository.
3. In Vercel choose **Add New → Project** and import the GitHub repository.
4. Vercel should detect **Next.js** automatically.
5. V0.1 has no required environment variables, so you can deploy immediately.
6. After deployment, open `/overview` to test the application shell and install the PWA from a supported browser.

Example Git commands:

```bash
git init
git add .
git commit -m "feat: Finzaro V0.1 foundation and PWA"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/finzaro.git
git push -u origin main
```

## Project structure

```text
app/
  (dashboard)/
    overview/
    accounts/
    transactions/
    budgets/
    reports/
    settings/
  login/
  offline/
  manifest.ts
components/
  ui/
lib/
public/
  icons/
  sw.js
tests/
.github/workflows/
```

## Roadmap handoff

### V0.1.1 — Environment

- Create `Finzaro DEV` Supabase project
- Prepare production environment strategy
- Add Supabase CLI and migration workflow
- Add typed environment validation
- Database foundation migration

### V0.2 — Authentication

- Supabase Auth
- Register / Login / Logout
- Session-aware protected dashboard
- Profile table
- RLS foundation and policy tests

### V0.3 — Account Core

- Real accounts table
- Cash, bank and e-wallet accounts
- Opening balances
- Ownership policies and typed data access

## Security note

Never commit production secrets. When Supabase is added, browser code will only receive the public client key; privileged service credentials must remain server-side.
