# Finzaro V3.4.0 — Mobile-First Transaction UX

**Source baseline:** V3.3.0 Premium Visual Foundation. **Release:** V3.4.0.

## Issue addressed

On iPhone, opening **Thêm GD → Chi tiền / Thu tiền** produced a tall sheet with a long category grid, and the app's bottom navigation could visually overlap the sheet. Scrolling inside the form did not reliably expose **Lưu giao dịch** (see user-supplied screenshot). This release targets both causes, rather than simply raising the button's z-index.

## Changes

1. **Overlay via React portal:** all `BottomSheet` instances now render at `document.body`, outside page-specific stacking contexts. Their `z-index` can therefore stack above the mobile taskbar (`z-[80]`). Nested money keypad remains above the form (`z-[140]`).
2. **Dedicated scrollable sheet body:** `fin-sheet-panel` is a flex column with a non-scrolling drag handle; `fin-sheet-scroll` owns vertical touch/wheel scrolling. Content stays reachable while the document is scroll-locked.
3. **Keyboard-safe visual viewport:** on iOS Safari/PWA, listen to `visualViewport.resize/scroll`; adjust overlay height/top to the visible area when the on-screen keyboard opens/closes.
4. **Visible Save/Cancel:** transaction sheet uses a viewport-height panel and a sticky footer with 48px minimum touch targets, a subtle divider, and safe-area bottom padding. Transaction card no longer clips the sticky footer on mobile.
5. **Compact, independently scrollable category selection:** keep the existing 4-row maximum (336px); on small screens cap the picker further to 32dvh so text fields and actions remain accessible. Vertical scroll may chain to the sheet at the picker boundary.
6. **Safe tab switching:** Thu/Chi/Chuyển preserve each visited draft, and sheet scroll resets to the top when the selected transaction type changes. Existing keyboard tab navigation stays intact.

## Regression and accounting scope

- Same six modules. No new npm dependency; `createPortal` comes from the existing React DOM package.
- No Supabase migration in this release. Previous V3.2.0 Batch Copy migration is still required on databases that haven't applied it.
- No changes to transaction create/copy/update/delete RPC logic, exchange-rate/currency safeguards or reports.
- No change to Splash Loading or the money keypad's existing tactile animation.

## Deployment procedure

1. Back up the currently deployed source; retain a tested rollback to V3.3.0.
2. Extract ZIP at repository root (not nested in an additional version folder).
3. Run `npm install` (this source intentionally has no package-lock; use a consistent dependency environment), then `npm run release:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
4. Deploy to staging first. Test from iPhone Safari **and** an installed Home Screen PWA; check both Light and Dark Mode.
5. In **Giao dịch / Thêm GD**, open Chi, fill amount, scroll category grid, scroll the form, confirm both **Hủy** and **Lưu giao dịch** remain visible. Repeat for Thu, Chuyển, with the keyboard open and closed; then save one non-production test transaction and verify it in the transaction list and ledger.
6. Check nested money calculator, swipe-to-close, date picker, copy, reports calendar and mobile navigation; deploy production only after staging acceptance.

## Deployment QA limitation

Static source tests and a headless Chromium **layout fixture** were executed without the app's real backend. The fixture verified the save action was visible for simulated viewport heights 780px, 530px and 420px with independent sheet scrolling. This is **not** equivalent to an end-to-end test on a real iPhone or to successful Next.js production build. This environment lacks the installed npm dependencies; run the build in CI/staging.
