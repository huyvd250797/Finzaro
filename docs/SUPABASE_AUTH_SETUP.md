# Finzaro V0.0.2 — Supabase Authentication Setup

V0.0.2 activates real Supabase Auth on top of the V0.1.1 database foundation.

## 0. Database prerequisite

If you already ran `supabase/migrations/20261005110000_foundation_environment.sql` in Supabase SQL Editor for V0.1.1, do **not** run it again.

V0.0.2 does not add a new public-schema migration. It uses the existing:

- `auth.users`
- `public.profiles`
- `public.user_preferences`
- `public.supported_currencies`
- `handle_new_user()` trigger
- existing RLS policies

You can optionally run `supabase/sql-editor/V0.0.2_auth_verification.sql` in SQL Editor to verify the foundation.

## 1. Enable Email + Password

Supabase Dashboard → Authentication → Providers → Email.

Recommended for DEV:

- Email provider: Enabled
- Email/password sign-up: Enabled
- Confirm email: Enabled

Hosted Supabase projects normally require email confirmation by default.

## 2. Configure URL Configuration

Supabase Dashboard → Authentication → URL Configuration.

Set **Site URL** to the deployed Finzaro URL, for example:

```text
https://your-finzaro.vercel.app
```

Add redirect URLs:

```text
https://your-finzaro.vercel.app/**
http://localhost:3000/**
```

If you use Vercel Preview deployments, add an appropriate Vercel preview wildcard only for your project/team.

## 3. Email templates

Finzaro's `/auth/confirm` route supports both PKCE `code` callbacks and `token_hash` verification.

The default hosted templates can work with the redirect URL supplied by the app. For the most explicit SSR flow, customize these links:

### Confirm signup

Authentication → Email Templates → Confirm signup

Use a link equivalent to:

```html
<a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Confirm email</a>
```

### Reset password

Authentication → Email Templates → Reset password / Recovery

Use a link equivalent to:

```html
<a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=recovery">Reset password</a>
```

The application always sends a `RedirectTo` that already contains `?next=...`, so the template appends additional query parameters with `&`.

## 4. Vercel environment variables

Vercel → Project → Settings → Environment Variables:

```text
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SITE_URL=https://your-finzaro.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Redeploy after changing environment variables.

Do not add a Supabase secret/service-role key to public variables.

## 5. Test registration

Open:

```text
/register
```

Create a user.

Then verify in Supabase:

```text
Authentication → Users
```

A matching row should also exist in:

```text
Table Editor → profiles
Table Editor → user_preferences
```

This proves the V0.1.1 `handle_new_user()` trigger is working.

## 6. Confirm email

Click the confirmation link sent by Supabase. The browser should reach `/auth/confirm`, establish the cookie session, then redirect to:

```text
/overview
```

The dashboard route is protected. Opening `/overview` in a private browser without a valid session should redirect to `/login`.

## 7. Test logout

Click the logout icon in the top-right app header. The session cookies are cleared and the app returns to `/login`.

## 8. Test password recovery

Open:

```text
/forgot-password
```

Submit the account email, open the recovery email, and set a new password at:

```text
/reset-password
```

The forgot-password page intentionally returns the same success wording whether or not an account exists, reducing account enumeration leakage.

## 9. Verify profile and preferences

Open:

```text
/settings
```

Update the display name, default currency, locale, and timezone. The writes go through the user's normal authenticated Supabase client and existing RLS policies; no privileged server key is used.

## SQL Editor workflow

For your preferred workflow, V0.0.2 is simple:

```text
V0.1.1 foundation SQL already executed
        ↓
No new schema SQL required for V0.0.2
        ↓
Configure Supabase Auth + URLs
        ↓
Configure Vercel ENV
        ↓
Deploy
        ↓
Register / Confirm / Login test
```
