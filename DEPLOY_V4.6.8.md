# Finzaro V4.6.8 — Personal Debt Deploy Hotfix

## Fix
- `components/personal-debt-panel.tsx`: remove mount-time `useEffect(() => setKey(crypto.randomUUID()), [])`, which fails `react-hooks/set-state-in-effect` on Vercel.
- Generate a stable request key on first form submit using the existing `stampKey()` handler and a hidden **uncontrolled** input. Multiple attempts from the same form submit the same key.
- No functional changes to personal debt RPCs, calculations, or other modules.

## Deploy
1. Supabase: **no new migration** for V4.6.8. Make sure V4.6.7 migration already ran if new personal debt features are used.
2. Push the full source ZIP V4.6.8 with Zipverra (normal overlay is sufficient if V4.6.7 GitHub repo has no obsolete files).
3. Let Vercel run `npm run check`: ESLint → TypeScript → tests → Next.js production build.
4. Verify Create debt and Repay flows with real staging accounts; check repeated submit does not double-book transactions.

## Validation limit
Local source regression tests can pass without production dependencies; the final `npm run check` / Next.js production build needs a project environment with npm dependencies installed.
