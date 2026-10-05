# Architecture decisions — V0.1.0

## Deployment shape

The Next.js app stays at the repository root so GitHub → Vercel deployment needs no monorepo Root Directory override. Domain packages already exist under `packages/`, which allows gradual extraction without changing the deployment entry point.

## Auth boundary

- Browser client: `src/lib/supabase/client.ts`.
- Server client: `src/lib/supabase/server.ts`.
- Session refresh and route protection: Next.js 16 `src/proxy.ts` + `src/lib/supabase/proxy.ts`.
- Protected routes independently call `getClaims()` before reading user data.

## Data boundary

- Every user belongs to a workspace.
- RLS is workspace-based, ready for future family/shared finance.
- `accounts` has no mutable authoritative balance.
- `transactions.idempotency_key` is unique per workspace.
- `transaction_lines` is created now so V0.2/V0.3 can move all balance-affecting work to the ledger layer.
- Audit is append-only through authenticated RLS.

## PWA boundary

The V0.1 service worker deliberately does not cache authenticated pages or API results. It only provides installability and a safe offline fallback. IndexedDB, queueing, retries, conflict handling and idempotent sync remain V0.6.0 work.

## Domain boundary

- `domain-money`: decimal-string contract only; engine implementation comes with Money Core.
- `domain-banking`: interface reservation only; no formulas in UI.
- `ui`: reserved extraction target. Current components remain colocated with the web app to keep Vercel deployment straightforward.
