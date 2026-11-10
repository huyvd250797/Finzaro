# Finzaro V1.2.2 — Transaction TypeScript Deploy Fix

This is a **source-only patch** of V1.2.1. It addresses the Vercel TypeScript build error `TS18047: 'accountResult.data' is possibly 'null'` in `features/transactions/actions.ts` while preserving all V1.2.1 Reports performance improvements.

## How to deploy

1. Use the full V1.2.2 source ZIP, not the older V1.2.0 upload or an isolated file copied over V1.2.0.
2. Keep existing Supabase database and prior V1.2.0 migration. **No V1.2.2 migration is needed.** Do not drop tables or modify transaction history.
3. From the project root, install dependencies and run `npm run typecheck`, `npm run test`, then `npm run build` with valid environment variables.
4. Deploy to Vercel. Verify `/api/version` returns `1.2.2` and the PWA badge shows V1.2.2.
5. Smoke-test editing one ordinary Income or Expense transaction, changing its amount/account, and verify account balance + Reports after saving.

This release has no changes to the `update_simple_transaction_v120` database RPC. A previous SQL migration is only required when upgrading from V1.1.x or earlier.
