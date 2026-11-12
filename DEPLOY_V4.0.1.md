# Finzaro V4.0.1 — Fixed Mobile Chrome & Sheet Actions

**Base:** User-provided Finzaro V4.0.0 full source. **Scope:** UI/UX bugfix only; six modules, financial RPCs and 91 SQL files are unchanged. No new dependencies or database migration.

## Why the screenshot showed a floating Save bar and bottom-gap

The transaction buttons were `position: sticky` **inside** a long form **inside** `.fin-sheet-scroll`. Sticky only constrains them relative to their scroll container and other ancestors, so Safari visual-viewport/overscroll changes can pull them away from the sheet bottom. The mobile tabbar also lived under the dashboard shell and used a GPU transform; scroll/route animation stacking contexts and iOS's changing visual viewport may affect fixed-position chrome. A z-index-only fix does not resolve either issue.

## Fix applied

1. **BottomSheet** now renders a dedicated `fin-sheet-action-slot` after the scroll region. The content is the only flex child allowed to scroll. Actions are laid out as a fixed (non-scrolling) sibling and fill the panel's bottom with safe-area padding. When the sheet closes, background scrolling remains locked through the exit animation.
2. **Transaction Entry** portals Hủy/Lưu into this slot for the selected Income/Expense/Transfer form. Native `form={formId}` association preserves form submit, validation and server action behavior; the same component continues to work inline outside sheets. On tab change, only the active form's actions are visible; drafts remain preserved. Button pending state is retained.
3. **Mobile bottom navigation** is portaled to `document.body`, no longer under a potentially transformed layout/route container. VisualViewport scroll/resize synchronizes the bottom offset. The nav is hidden while a modal is open or the input keyboard overlays the viewport, preventing the background taskbar from peeking through below a modal. When the modal closes, the taskbar stays anchored to the visible viewport bottom while the page scrolls.
4. The same footer pattern applies to **Batch Copy**, **Account add/edit**, **Category add/edit** and the **money calculator's Xong action**. The latter action occupies a stable bottom action slot; the equals key expands to fill the remaining keypad space.
5. The shared popup focus trap includes buttons in the fixed footer. Scroll-to-error reserves normal focus margin rather than the 92px previously used for a sticky footer.
6. Existing Safari safe-area, nested scroll/gesture, keyboard-aware overlay and Reduced Motion handling are retained.

## Release & deployment

1. Back up the existing production source and deploy V4.0.1 on staging first.
2. No SQL for this hotfix; **do not** reset or modify Supabase. A fresh environment still needs previously required V3.2.0 batch-copy migration.
3. Install dependency versions according to `package.json` (Node 22.x, npm 10.x). This ZIP, like the provided source, has no `package-lock.json`; use `npm install --no-audit --no-fund` followed by `npm run check`. Do not deploy if lint/typecheck/test/build fails.
4. Safari iPhone/PWA checks: scroll a long expense form from beginning to end; compare fixed Hủy/Lưu position; open/close keyboard with a focused text field; switch Income/Expense/Transfer; open nested calculator; check Home Indicator safe area, dark/light themes, short iPhones, and background tabbar remaining at the viewport bottom when the sheet is closed.
5. Check Copy 20 days, Account and Category long forms, calculator Xong, focus/Tab/Escape, pending and error messages; verify accounting and report totals remain the same.
6. Clear an outdated PWA cache or use the PWA update flow if V4.0.0 is still displayed; version strings are now 4.0.1. Check production via `/api/version` after deploy.
7. Rollback: redeploy the V4.0.0 frontend. No schema rollback is necessary.

## Checks performed during patch preparation

- `node --test tests/*.test.mjs`: **161/161 passed** (including 6 new V4.0.1 source checks).
- Release contract: six modules, package/app version 4.0.1, local import paths resolved.
- TypeScript/TSX/JS syntax-only transpilation of **136** source files with global TypeScript 5.8.3: PASS.
- CSS parsed without top-level syntax errors (tinycss2).
- SQL SHA-256 compare to supplied V4.0.0 ZIP: **91/91 identical**.
- **Chromium fixture (not full Next app)** checked 390×844, 320×568 and 390×420: scroller moves but footer remains pinned to panel bottom; nav remains bottom after page scroll and is hidden during modal.

**Not confirmed:** Full Next.js production build, complete TypeScript typecheck, lint, live Supabase or real Safari iPhone/PWA E2E. The supplied project has no lockfile and npm dependencies are not installed in the patch environment. Completion of source checks and Chromium fixture is not a production deployment approval.
