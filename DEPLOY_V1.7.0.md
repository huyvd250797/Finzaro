# Deploy Finzaro V1.7.0 — Calendar / Reports / Overview UX

## Scope and source

- Source baseline: V1.4.1 (retains the fix for TS2339 RPC envelopes).
- Three implementation phases combined: V1.5.0 Calendar, V1.6.0 Charts, V1.7.0 Overview/Navigation.
- Only **six active modules**: Overview, Transactions, Accounts, Categories, Reports & Calendar, Settings.
- Discontinued advanced-module routes, server components, old feature services and SSI endpoint have been removed from the app tree. Their Supabase history/migrations are **not deleted**. Next.js redirects for former URLs are retained.
- No V1.7.0 SQL migration. Requires V1.2.0 simple-transaction RPC migration already deployed.

## Deploy gates (must pass before production)

1. Back up the Supabase database; do **not** drop or edit historical advanced finance tables.
2. From the extracted source root (where `package.json` lives) run `npm install --no-audit --no-fund` using Node 22/npm 10. Patched framework stack: `next` / `eslint-config-next` 16.4.6, `react` / `react-dom` 19.3.1.
3. Set Vercel environment variables (see `.env.example`), then execute `npm run release:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. `npm run build` performs environment and source preflight first.
4. Deploy to a **preview** first. Verify `/api/version` returns `1.7.0` and the PWA badge is current. Clear the Vercel build cache when updating from V1.4.1.
5. Smoke-test: ordinary Thu/Chi/Chuyển, balances, Save/Edit/Delete, calendar selected day and double-tap, full pie and category selection, year/month filters, export CSV, responsive iPhone/PWA keyboard/safe-area, dark/light mode.
6. Compare finance values with the V1.4.1 snapshot: income, expense, net, and balances must remain unchanged for the same period/currency. Recheck category totals and never count legacy loan/card/deposit transactions as income or expense.
7. In deployment logs, investigate **any** `TS` type errors before promoting. Do not bypass with `ignoreBuildErrors` or `--legacy-peer-deps`.

## Expected test limitations

The source ZIP intentionally excludes `node_modules`. A parser-only TS/TSX scan does **not** replace strict `tsc` or `next build`. When the build host cannot install dependencies, mark those gates as **not verified**, rather than claiming they passed. CI/Vercel must complete them before production.

## Rollback

Restore the previous V1.4.1 source deployment. The database is not migrated by V1.7.0, so no schema rollback is necessary. Historical user records remain unchanged.
