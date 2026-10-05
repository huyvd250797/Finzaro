# Finzaro architecture baseline

## Deployment shape

Finzaro is a single Next.js application at the repository root. There is no npm workspace or nested package manifest. This keeps GitHub → Vercel deployment deterministic and leaves domain extraction for a future version only when it is actually needed.

## Application boundaries

- `src/app`: App Router routes, actions and metadata.
- `src/components`: auth, shell, theme, PWA and reusable UI primitives.
- `src/lib/supabase`: browser/server Supabase clients and session refresh logic.
- `supabase/migrations`: the only database migration source of truth.
- `supabase/tests`: manual/staging database security checks.

## Auth boundary

- Browser client: `src/lib/supabase/client.ts`.
- Server client: `src/lib/supabase/server.ts`.
- Session refresh and route protection: `src/middleware.ts` + `src/lib/supabase/middleware.ts`.
- Protected routes verify the authenticated user on the server before reading finance data.

## Data boundary

- Every user belongs to a workspace.
- RLS is workspace-based and already supports future owner/member/viewer roles.
- `accounts` has no mutable authoritative balance.
- `transactions.idempotency_key` is unique per workspace.
- `transaction_lines` provides the ledger-ready foundation for future balance-affecting operations.
- Authoritative money values use PostgreSQL `NUMERIC`; JavaScript floating-point values are not the ledger source of truth.

## PWA boundary

The current service worker caches only public shell assets required for installability/offline fallback. Authenticated pages and API responses are not cached. IndexedDB transaction queues, retries and conflict resolution are intentionally deferred to the later offline-sync milestone.

## Observability
