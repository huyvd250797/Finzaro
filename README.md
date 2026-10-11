# Finzaro V1.1.0 — UI Design System & Visual Polish

Finzaro is a personal-finance PWA built with Next.js, Supabase and Vercel. V1.1.0 starts the post-production UI/UX line on top of the V1.0.x production baseline. It does not add a new top-level finance module; it refines the design system, reduces report friction and completes the Savings → Goal transfer workflow.

## V1.1.0 highlights

- Centralized visual tokens for cards, controls, semantic states, focus rings and reduced-motion behavior.
- Refined shared `Card` and `Button` primitives so screens inherit the same radius, spacing and interaction language.
- Transfer can target a Savings account and optionally **Thêm vào mục tiêu**. The account balance and selected Goal progress are updated atomically by a dedicated Supabase RPC, with double-count protection when the Goal is already linked to that Savings account.
- Reports Overview keeps **Chi tiêu / Thu nhập / Ròng** on one compact three-column row.
- Reports Calendar uses larger horizontally scrollable day cells on narrow phones so both daily Income and Expense amounts remain readable; `0đ` stays hidden.
- Category composition uses a full interactive pie instead of a center-covered donut. Tap/click a slice or legend item to see Category, percentage and amount; large slices label themselves inside the pie.
- Report pages use a report-specific ledger loader that only requests supporting Accounts/Categories when needed and loads independent datasets in parallel.
- V1.0.2 framework security stack remains intact: Next.js 16.4.0, React 19.3.0, Node 22.x.

## Database migration

V1.1.0 **requires one database migration** for the atomic Savings → Goal transfer RPC:

`supabase/sql-editor/V1.1.0_ui_design_system_visual_polish.sql`

Then run the read-only verification script:

`supabase/sql-editor/V1.1.0_ui_design_system_visual_polish_verify.sql`

The migration does not rewrite historical balances. It adds `create_transfer_with_goal_v110`, which reuses the existing V0.7.1 financial transaction RPC and inserts Goal contribution data in the same PostgreSQL transaction.

If the database is older than V0.8.0, apply all missing migrations in order before V1.1.0.

## Environment

Copy `.env.example` when configuring local/Vercel environments. Required public variables:

```env
NEXT_PUBLIC_FINZARO_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`npm run build` runs the environment validator first and fails early when required Supabase values are missing or placeholders remain.

### Optional SSI FastConnect

Manual Investment Asset valuation works without SSI. To enable automatic Vietnam stock pricing, configure these **server-only** variables:

```env
SSI_FASTCONNECT_API_KEY=...
SSI_FASTCONNECT_API_SECRET=...
SSI_FASTCONNECT_CLIENT_ID=...
```

Never prefix SSI secrets with `NEXT_PUBLIC_`.

## Production deploy

1. Confirm the database is at least V0.8.0.
2. Run `supabase/sql-editor/V1.1.0_ui_design_system_visual_polish.sql` once.
3. Run `supabase/sql-editor/V1.1.0_ui_design_system_visual_polish_verify.sql`.
4. Configure Vercel Production environment variables.
5. Run `npm install` in a dependency-complete environment.
6. Run `npm run check` (`lint → typecheck → tests → production build`).
7. Push to GitHub and deploy/redeploy on Vercel.
8. Smoke-test normal Transfer, Savings + Goal transfer, deletion/rollback, Reports Overview, Calendar, pie interaction and PWA update.

Full V1.1.0 notes: `docs/V1.1.0_UI_DESIGN_SYSTEM_VISUAL_POLISH.md`.

## Next line

After V1.1.0, the planned UX sequence is V1.2.0 Mobile UX Optimization, V1.3.0 Transaction UX Redesign and V1.4.0 Quick Actions. Any modified source package must increment the version again.

## V1.0.2 Next.js security patch

- Upgrades `next` from `16.0.0` to `16.4.0` to clear Vercel's vulnerable Next.js deployment block and include the security fixes shipped across the 16.x line.
- Upgrades `eslint-config-next` to `16.4.0` so framework and lint tooling stay on the same release.
- Keeps React / React DOM at `19.3.0`, which is the React line used by Next.js 16.4.
- Removes `--legacy-peer-deps`; dependency conflicts are no longer intentionally masked during Vercel install.
- No database migration or financial-data change is required.

## V1.0.1 deployment fix

- Aligns `react`, `react-dom`, `@types/react`, and `@types/react-dom` to 19.3.0.
- Aligns TypeScript to 5.9.3 and pins Vercel/CI runtime to Node 22.x / npm 10.x.
- Vercel install bypasses expensive peer-dependency backtracking with `--legacy-peer-deps`, while direct React packages remain explicitly aligned.
- No database migration is required.
