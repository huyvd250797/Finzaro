# Supabase setup

## 1. Create an isolated project

Use a new Supabase project for this application while it is under development. Keep production data isolated until the data model and RLS tests are accepted.

## 2. Apply schema

Fastest path: open **SQL Editor** and run:

`supabase/migrations/202610050001_foundation.sql`

CLI path:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
npx supabase@latest db push
```

The migration also backfills existing Auth users if the target project is not empty.

## 3. Get app credentials

From Supabase **Connect / API** copy:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Use only the publishable key in the browser. Do not expose secret/service-role keys.

## 4. Configure Auth URLs

In **Authentication → URL Configuration**:

- Site URL: your Vercel production URL.
- Add redirect URLs for the deployed domain:
  - `https://YOUR_DOMAIN/auth/confirm`
  - `https://YOUR_DOMAIN/auth/callback`
- Add localhost equivalents only when you want local development.
- For Vercel Preview deployments, add the exact preview pattern/domain your team uses.

## 5. Configure signup confirmation template

For the **Confirm signup** email template, point the link at the app confirmation route using token hash, for example:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

The application route verifies the OTP and creates the SSR session.

## 6. Verify user bootstrap

Create a test user, confirm email and check that these records are created automatically:

- `profiles`: 1 row for the user.
- `workspaces`: 1 personal workspace.
- `workspace_members`: the user is `owner`.
- `categories`: starter income/expense categories.

## 7. RLS acceptance test

Create User A and User B. Use `supabase/tests/rls_smoke.sql` as the manual checklist, or authenticate two Supabase clients against staging.

Minimum acceptance:

- User A can read their own profile/workspace.
- User B cannot read User A's workspace/accounts/categories/transactions.
- A viewer can read but cannot mutate workspace financial rows.
- An owner/member can mutate permitted workspace rows.
- `audit_logs` cannot be updated/deleted through authenticated RLS policies.

## 8. MFA/passkey

The current baseline reserves the auth/security UX and keeps Supabase Auth replaceable/configurable, but does not force MFA/passkey enrollment. Enable and enforce those only after the chosen provider and recovery policy are finalized.
