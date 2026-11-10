# Finzaro V1.2.1 — Deployment and verification

This release only adjusts source and report/transaction read behavior. **No V1.2.1 SQL migration exists.** Keep the V1.2.0 schema, marker table, RLS policies, and historical transaction data unchanged. If migrating directly from an older version, follow `DEPLOY_V1.2.0.md` first and confirm its SQL/verification procedure.

## Before deployment

1. Confirm that V1.2.0 is already deployed and the `simple_transaction_ids_v120` marker table and 3 transaction RPCs are present.
2. Back up Supabase (including historic entries) and record current account balances and known monthly income/expense totals.
3. In an environment with dependencies installed, run `npm run lint`, `npm run typecheck`, `npm test`, and a full `npm run build` with valid environment variables. A source-only transpilation pass is **not** an acceptable substitute for a production build.
4. Deploy the V1.2.1 ZIP root to GitHub/Vercel; verify `/api/version` returns `1.2.1`, and that the PWA badge updates. Clear Vercel build cache once if an older bundle is served.

## Manual acceptance

- Create an expense, an income, and a transfer. Check each account balance and ensure transfer is excluded from Thu/Chi reports.
- Edit/delete an ordinary transaction; check rollback and comparison with pre-patch balances.
- Open Reports Overview, Calendar (change several dates), Analysis, and Category details, including a month with many transactions. All numbers must reconcile to transaction history.
- Export a CSV for a known period and compare the amounts/row counts with the report. On a complete Supabase read failure, Reports must show an amber warning and export must fail with HTTP 503, **not** an all-zero report / valid empty CSV.
- Verify PWA, iPhone, and desktop navigation, and ensure that no removed financial module has reappeared.

## Rollback

A rollback to V1.2.0 only requires restoring the previous source deployment, since the V1.2.1 patch does not modify the schema or rewrite historical data. Never reset/drop the Supabase database as part of this patch.
