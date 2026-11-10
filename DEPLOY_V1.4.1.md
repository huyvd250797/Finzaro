# Finzaro V1.4.1 – Transaction RPC TypeScript Deploy Fix

## What changed

- Fixed TS2339 (`Property 'error' does not exist on type 'unknown'`) at the three RPC call sites in `features/transactions/actions.ts`.
- Shared RPC envelope validator now checks response shape at runtime. If an RPC returns an invalid envelope, the transaction shows an error rather than a false success.
- Retains all V1.4.0 UI/UX and the existing 6 modules.

## Deploy

1. Use the ZIP root as the project root, replacing all previous source files (not only `actions.ts`).
2. Keep existing Supabase environment variables and the database migration **V1.2.0**. No new SQL is needed.
3. Run `npm install`, `npm run typecheck`, `npm run lint`, `npm run test`, then `npm run build` with the real environment.
4. Deploy on Vercel, check `/api/version` returns `1.4.1`.
5. Smoke-test creating, editing and deleting an ordinary Thu/Chi transaction, plus a transfer. Confirm balance adjustments and report totals.

## Validation limitations

Node regression tests and source-level TypeScript checks are not a substitute for a full Next.js production build. Confirm CI/Vercel production build passes.
