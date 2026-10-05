# Deploy to Vercel

## Path A — GitHub → Vercel

1. Create a GitHub repository and push the contents of this folder to the repository root.
2. In Vercel choose **New Project** and import the repository.
3. Vercel should detect **Next.js** automatically. Keep the repository root as the Root Directory. Do not point Root Directory at `src/`, `supabase/` or another subfolder.
4. Add environment variables for Production and Preview:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_APP_URL=https://YOUR_PRODUCTION_DOMAIN
NEXT_PUBLIC_SENTRY_DSN=...        # optional runtime monitoring
```

5. Keep the default install command. The repository build script runs `next build --webpack`.
6. Deploy.
7. Copy the final production URL into Supabase Authentication URL Configuration.
8. Re-test signup, confirmation, login, logout, password reset and PWA installation on a mobile browser.

## GitHub Actions secrets for staging database

The included `Deploy staging database` workflow is manual. Configure a GitHub Environment named `staging` with:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `STAGING_PROJECT_REF`

Run this workflow only against the isolated staging project.

## Release checklist

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- RLS owner vs non-owner smoke test
- Signup/email confirmation/login/logout test
- Password recovery test
- PWA install test on Android/iOS-compatible browser behavior
- Light/dark theme check
- Mobile widths 360px / 390px / 430px
- Verify Sentry receives a test event when DSN is configured
