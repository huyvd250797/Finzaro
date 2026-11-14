# Finzaro V4.4.0 — Reporting Trust & UX

**Baseline:** User-provided Finzaro V4.3.0 full-source ZIP. **Release:** 4.4.0.

## Scope

### Transaction Quick Add — iPhone UX corrections

1. **Removed transaction templates** from the transaction form and local quick-entry state/model. There is no template creation, deletion or application UI/API. Previously saved `v430:quick-entry` preferences are preserved; if a V4.3 payload has `templates`, the next successful read strips only that retired property from that user's device-local record.
2. **Frequently used categories:** one fixed-height, horizontally swipeable row (`overflow-x-auto`, `snap-x`, `flex-wrap: nowrap`, nonshrinking chips), like “Dùng lại giao dịch gần đây”. No extra category chip rows.
3. **Transaction title:** “Nội dung giao dịch” is immediately below the amount and above category/account fields for Thu, Chi, Chuyển tiền. Existing auto-title logic and required validation are preserved.
4. **Category grid:** up to four **complete** rows visible on mobile (`4 × 78px + 3 × 8px = 336px`). Beyond 4 rows, scroll vertically inside the grid. The outer bottom sheet still scrolls and save/cancel remain in the footer; no compact-screen `32dvh` override clipping the fourth row.
5. **Category search:** named input class with explicit left padding `2.75rem` and icon position; right inset preserves native search decorations, fixing overlap between magnifier and placeholder.

### Reporting Trust & UX

- Preserve canonical minor-unit financial calculations and reconciled RPC for Report Overview, including local cache and period switching.
- Display a **“Đã đối soát Thu · Chi · Dòng tiền ròng”** indicator only when the requested period is fully loaded with no error. Initial and fetched summaries are reconciled prior to display.
- Financial Statements now run the same `statementBalancesMatch` reconciliation already used by Excel/CSV export. If data fails, suppress KPI/report tables and disable download/print links, with an explicit error instead of misleading figures.
- Print page uses the same policy; the export route already blocks mismatched exports with HTTP 409.
- The prior filter/export/interactive category chart workflows remain in place; this release does **not** add a new generalized filtering backend, overhaul all charts, or introduce new Supabase RPCs.

## Database & migration

**No new SQL migration.** No table changes, data migrations, RLS changes, or changes to transaction RPCs. All existing 93 SQL files are retained exactly. Continue to use the existing V4.2.0 SQL migration if previously applied.

## Deployment

1. Back up existing project and user data. Replace the GitHub application **source** with the V4.4.0 full-source ZIP; remove obsolete files if doing manual GitHub upload. Verify `package.json` and `lib/app-version.ts` are `4.4.0`.
2. No database migration is needed for V4.4.0. Keep existing Supabase/Vercel environment variables.
3. Build Vercel from a new commit. Confirm log says `finzaro@4.4.0` — **do not confuse an old deployment log with the current commit**.
4. The required quality gate remains `npm run lint && npm run typecheck && npm run test && npm run build`; do not skip lint/typecheck/build.
5. Smoke test iPhone Safari/PWA: one-tap Thu/Chi/Chuyển, title below money, sideways frequent categories, 4 rows of categories, search input without overlap, keyboard-safe footer, and transaction save/failed-save behavior.
6. Smoke test Reports: month/year and period navigation; drill-down; financial statements, Excel/CSV and Print; confirm actual totals equal ledger transactions for the same range, currency and filters.

## Validation available at packaging

- Node regression suite: **248 / 248 PASS**.
- Syntax-only TypeScript transpilation: **148 application TS/TSX files PASS**.
- CSS stylesheet parser: **no parse errors**.
- `npm run release:check`: **PASS**, 6 modules.
- All 93 historical SQL files: unchanged (verified against supplied ZIP in QA).
- ZIP CRC/integrity: PASS.

**Not verified in this environment:** complete `npm run lint`, project `tsc --noEmit`, Next.js production `next build`, PostgreSQL runtime, iOS Safari end-to-end UX. The npm registry DNS lookup returned `EAI_AGAIN`, so a complete dependency install was unavailable. Passing the Node tests or syntax checks is not equivalent to a successful production build.
