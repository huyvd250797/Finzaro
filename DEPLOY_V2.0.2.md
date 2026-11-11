# Finzaro V2.0.2 — Mobile Navigation TypeScript Deploy Fix

## Root cause

Vercel's Next.js type-check failed in `components/mobile-nav.tsx`:

```
TS2345: Argument of type 'unknown' is not assignable to parameter of type 'string | false | null | undefined'
```

The `moduleItems` array had no `style` field, whereas `quickTransactions` did. The expression `"style" in item ? item.style : ...` refined `item.style` to `unknown`, which is not a valid argument for `cn()` in strict TypeScript.

## Resolution

The two lists now both have a string `style` field; the component passes `item.style` directly to `cn()` and keeps its icon coloring based on the displayed sheet. There is no change to routes, Supabase RPCs, permissions, transaction accounting, or migrations.

## Deployment

1. Update the entire source to V2.0.2, including `components/mobile-nav.tsx`, `package.json`, `lib/app-version.ts`, `scripts/`, and the test files. **Do not only copy new files without deleting retired files**; `npm run source:sync` reconciles known obsolete source on prebuild.
2. Verify Vercel's Node 22 configuration, install dependencies, and run `npm run release:check`, `npm run typecheck`, `npm run test`, `npm run build`.
3. Deploy to Vercel; confirm `/api/version` returns `2.0.2` and test the mobile **Thêm** and **Thêm GD** sheets.
4. Clear build cache if a previous Next.js generated type artifact remains stale.

**No SQL migration.** Existing Supabase V1.2.0 RPC migration remains required from earlier versions.

The ZIP was checked using source regression and syntax validation. A full Next.js production build can only be marked as passing after it actually succeeds with all dependencies installed.
