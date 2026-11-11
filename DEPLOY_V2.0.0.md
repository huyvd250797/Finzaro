# Finzaro V2.0.0 — Deploy & rollback

## Release contents

- One combined **V2.0.0** source release containing the **V1.8.0 + V1.9.0 + V2.0.0** roadmap milestones, based on V1.7.1.
- Exactly six functional modules. Accounts: search/type tabs/local sort and compact cards. Categories: searchable tiles with long-press drag, accessible move buttons, and failure compensation. PWA/modal/keyboard accessibility refinements.
- **No new SQL migration.** The V1.2.0 restricted RPCs and historic Supabase financial records are untouched.

## GitHub and Vercel rollout

1. **Back up** the existing GitHub main branch (tag the last working commit) and take a Supabase read-only snapshot of account balances and transaction IDs. No new SQL is required.
2. Upload all files from the **root** of the ZIP, including `components/account-collection.tsx`, `features/categories/order.ts`, version files, `scripts/`, `.github/workflows/ci.yml` and `package.json`. Use an actual Git mirror/sync to delete old tracked files; simply uploading ZIP contents does **not** delete old GitHub files.
3. Keep `scripts/sync-retired-source.mjs` and `prebuild` source reconciliation. It removes only explicitly retired code if old files remain. **Do not run a blanket `git clean` against unreviewed files.**
4. Vercel should use **Node 22** as declared in `package.json`. Run a fresh deploy without old build cache when replacing the baseline. Ensure the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` secrets remain configured as before; don't copy `.env.example` values to production.
5. Before releasing: `npm install --no-audit --no-fund`, `npm run release:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. All **must** pass on a dependency-complete machine. The ZIP does not contain `node_modules` or `.next`.
6. Confirm log: `[Finzaro release] OK v2.0.0: 6 modules`, then verify `/api/version` returns `2.0.0`, the header badge reads **V2.0.0** on iPhone and desktop, and PWA refresh loads the new version.
7. On the live app, complete `docs/V2.0.0_UX_QA.md`, especially create/edit/archive accounts, category reorder and Thu/Chi/Chuyển data consistency. Ensure historic special transactions remain read-only.

## Rollback

If Vercel reports a Next/TypeScript build error, capture **the first actionable error above** the final `BUILD_UTILS_SPAWN_1` message. Roll back Vercel to the previous successful deployment / Git commit (do not roll back or delete Supabase tables for a UI-only release). The source synchronization step never deletes database data or migrations.

## Verification limitations

Node regression tests, prebuild/source-import verification and TS/TSX syntax validation can run offline. This environment may lack npm registry access; **these checks are not a substitute for full semantic type-check, ESLint or `next build`** on Vercel/CI. Do not claim the release is production-proven until that pipeline succeeds.
