# Finzaro V1.7.1 — Deploy Stability Fix

## Vercel build root cause (verified)

The build output stops during `npm run build`'s `prebuild`, specifically `scripts/check-release.mjs`:

```
[Finzaro release] Unexpected active routes: accounts, assets, budgets, cash-flow, ...
```

The V1.7.0 **ZIP is already clean** (six app modules), but the GitHub branch `main` retains legacy directories because uploading a ZIP as added/updated files does **not delete tracked files that are absent from the ZIP**. A clean extraction did not reproduce the production tree. The Next.js bundler never started: this is neither a TypeScript build error nor a missing Supabase variable.

## Fix / migration procedure

1. Upload the **entire V1.7.1 ZIP contents** to the root of `huyvd250797/Finzaro` (where `package.json` lives), not inside an additional folder. All `scripts/` files and `package.json` **must** be included.
2. Commit/push to GitHub. `prebuild` now starts with `npm run source:sync` before environment and release checks; Vercel automatically removes the 13 stale route directories and their obsolete TS/TSX dependencies from its *ephemeral* checkout. It does not touch the GitHub repository remotely or Supabase.
3. Vercel: redeploy from the new commit, preferably **without restoring build cache** for this structural change.
4. Expected early build output:

```
> npm run source:sync
[Finzaro source sync] Removed retired source: app/(dashboard)/assets
...
[Finzaro source sync] OK: ... obsolete source paths removed (no DB changes)
[Finzaro release] OK v1.7.1: 6 modules, ... sources, ... local imports
```

5. Only after that comes the actual `next build` (compilation, TypeScript validation, static/server page generation). If a later error occurs, use its **first full error and file/line number**; do not treat `[BUILD_UTILS_SPAWN_1]` as a root cause.
6. After build/deploy, open `/api/version` and confirm `1.7.1`, verify six modules, ordinary Thu/Chi/Chuyển, calendar/pie, CSV, account balances and historical read-only transactions. No new SQL required after V1.2.0 migration.

## Recommended permanent GitHub cleanup

The runtime reconciliation fixes builds but does **not remove old tracked code from GitHub**. On a machine with a cloned repository, run:

```bash
npm run source:sync
git status --short   # Review deleted old application files
git add -A
git commit -m "chore: remove obsolete Finzaro financial modules"
git push origin main
```

This removes only the known obsolete paths listed in `scripts/sync-retired-source.mjs`, not DB schema or historical data. If using Zipverra, use an explicit **mirror/sync deletions** mode or delete the obsolete GitHub paths before uploading. Do not delete `supabase/` or its migrations.

## Checks

`npm run release:check`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` in an environment with all dependencies installed and required Supabase environment variables. `npm run build` includes the source sync automatically. The source ZIP itself contains no `node_modules` or `package-lock.json`.
