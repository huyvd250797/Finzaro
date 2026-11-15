# Finzaro V4.5.2 — Category Management UX Polish

## Baseline & upgrade

Source: V4.5.1 user-provided ZIP; target app/package version V4.5.2. Includes all six functional modules. Do not merge the V4.5.2 files with older source revisions: replace the repository source with the contents of the ZIP while retaining production `.env` settings outside Git.

## What changed

- Category list displays exactly one Chi tiêu or Thu nhập tab, with one row of controls, avoiding scrolling past expense categories to edit income.
- Compact tile grid: icon and title only. Tapping a tile opens a modal where the user edits name, optional parent, icon and color, and can archive/restore. The changes are confirmed by an authenticated server response before the modal closes and the local list updates.
- Long-press a tile for approximately 420 ms to enter jiggle mode, then drag it into a new position. All tiles visually jiggle and displaced tiles animate to make their movement apparent. Changes persist on drop; failed saves revert to the previous order. Exit with Xong or tap outside; Alt+Left/Right provides keyboard reordering.
- Remove overlong top-of-page descriptions and redundant feature instructions from primary six modules. Keep operational warnings and material financial/accounting notices.
- The existing Supabase category model and all previous migrations remain unchanged. **No new SQL migration; no TXT file is needed for V4.5.2.**

## Deployment procedure

1. Confirm all migrations through V4.5.1 have been applied to Supabase; V4.5.2 adds none.
2. Replace all source files in the GitHub repository with the archive contents; remove obsolete files if present. Confirm `package.json` and `lib/app-version.ts` both contain `4.5.2`.
3. Create a fresh Vercel deployment and check it references the new commit (not a cached deployment of an older version).
4. Verify `npm run check` passes all stages: `npm run lint && npm run typecheck && npm run test && npm run build`. Do **not** disable TypeScript/build error checks.
5. Test on iPhone Safari/PWA and desktop. Follow `docs/V4.5.2_QA.md` for quick regression scenarios.

## Preflight and limitations

- `npm test`: 280/280 pass at packaging time. `node scripts/check-release.mjs`: passed.
- TS/TSX syntax and CSS grammar checks passed. Existing SQL remained byte-identical to V4.5.1.
- Full project ESLint, full TypeScript semantic check, and Next production bundle are not certified by these isolated checks; confirm using the Vercel build log.
- The order update action preserves the previous compensation logic and validates the owner of each category; full database transaction atomicity would require a future dedicated DB RPC. No database schema changes are introduced here.
