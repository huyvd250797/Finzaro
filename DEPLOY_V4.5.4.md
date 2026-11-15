# Finzaro V4.5.4 — Category Drag Lint Deploy Hotfix

## Issue observed on Vercel V4.5.3

Release Gate stops during `npm run lint` with:

- `components/category-manager-grid.tsx:186:19` — `react-hooks/immutability`: `gridRef` derived DOM object was mutated by `scroller.scrollTop += delta`.
- `features/transactions/quick-entry.ts:47` — `@typescript-eslint/no-unused-vars` warning for `_type`.
- `tests/v452-category-management-ux.test.mjs:5` — unused `createRequire` import warning.

## Implementation

1. Replace `scroller.scrollTop += delta` with the standard, imperative DOM method `scroller.scrollBy(0, delta)` inside the active pointer handler. Preserve auto-scroll sensitivity, edge thresholds and fallback `window.scrollBy(0, delta)` for the document viewport. The React `gridRef` is never reassigned or mutated during render.
2. Validate the existing `type: TransactionType` argument in `parseQuickEntryState` against the existing allowed flow types before reading device-local saved preferences. The function's argument count, behavior for supported types and storage keys are unchanged.
3. Remove unused `createRequire` import from the category UX test.
4. Bump `package.json` and `lib/app-version.ts` to **4.5.4** and update version assertion tests. Add regression tests to keep the compiler-safe scrolling pattern and both warning fixes.

## Deployment and verification

- **Baseline:** the full Finzaro V4.5.3 ZIP provided by the user, preserving the V4.5.2 category management improvements and V4.5.3 financial comparisons.
- **No DB changes:** all historical SQL files stay byte-identical. **No SQL migration/TXT required.**
- **Full source:** replace the whole existing GitHub source with V4.5.4 and commit. Vercel should print `finzaro@4.5.4`.
- **Release gate remains enabled:** `npm run lint && npm run typecheck && npm run test && npm run build`; no lint/typecheck skips.
- **On-device QA:** long-press category for wiggle, drag near top/bottom to trigger scroll, drop to save order, cancel/rollback, switch Chi/Thu; verify all three Dashboard period comparisons.
- **Verification limitation:** Node tests, source import checks and source syntax checks can run without npm dependencies. ESLint/Next.js full build require the pinned npm packages to be installed and must be confirmed on Vercel if unavailable locally.
