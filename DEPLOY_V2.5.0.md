# Finzaro V2.5.0 — Financial Dashboard & Advanced Reports

**Source base:** Finzaro V2.2.0 (provided ZIP)  
**Release:** V2.5.0, combines V2.3.0 / V2.4.0 / V2.5.0  
**Date:** 2026-11-11  
**Database migration:** none  
**New npm dependencies:** none

## Functional coverage

1. `/reports`: current-period financial KPI and retained-income ratio, drill-down into analysis.
2. `/reports/analysis`: choose time range / account / income-expense / category / currency; four KPI cards with comparable-period deltas, interactive monthly trend and drill-down, category movement, spending by account and actionable insights.
3. `/reports/statements`: monthly cashflow statement, category and account allocation and first 100 recent matching standard transactions; always shows filtered currency and period.
4. `/reports/print`: printer-friendly A4 document. Click **In / Lưu PDF** to invoke the browser print dialog and choose **Save as PDF**. This is **not** a direct server-generated PDF download.
5. `/api/reports/export?format=xlsx&...`: standalone XLSX workbook with sheets `Tong hop`, `Theo thang`, `Danh muc`, `Tai khoan`, `Giao dich`; amounts in the selected currency major units.
6. `/api/reports/export?format=csv&...`: UTF-8 with BOM, standard Thu/Chi transaction table. The export is intentionally scoped to ordinary income and expense, unlike a full general ledger export.

## Accounting and security boundaries

- All reporting data is authenticated, user-scoped through Supabase `getClaims` / `requireUser`, and loaded server-side; report responses are private/no-store.
- Never add transfers to income/expense; previous finance-module transactions are excluded. Filter by currency with **no automatic currency conversion**.
- Transactions selected by account/category use the same logic for UI, Excel and CSV; data-fetch errors suppress misleading empty exports.
- Retained percentage is `(ordinary income - ordinary expense) / income * 100`; if income = 0 it is undefined, not 0%. Percentage movement from a zero previous base is also undefined.
- Printed statement is a personal cashflow report, not a company GAAP/IFRS financial statement or audited balance sheet. PDF workflow uses browser print; XLSX is generated server-side using Node built-ins; no third-party workbook library is required.
- Excel's potentially unsafe transaction titles are saved as literal strings, not spreadsheet formulas. CSV text that might be evaluated as a formula is escaped.
- Large custom reports permit up to 240 months for monthly aggregation and up to 100,000 transactions through the existing loader limit. Narrow date ranges when needed.

## Deployment checklist

1. Backup production code/database, retain V2.2.0 for rollback.
2. Configure existing environment variables (copy names from `.env.example`, not secrets). No migrations or new variables are required.
3. With npm registry access: `npm ci` (or `npm install` if no lockfile), `npm run release:check`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
4. Verify login, data read, 6 core routes, Reports tabs, dates, category/account filter, currency selector, period-to-period comparisons, chart links, mobile scrolling and light/dark UI.
5. Export CSV and XLSX for real sample records; open workbook in Excel/LibreOffice and cross-check values against UI. Print and Save as PDF in Chrome/Edge, check A4 Vietnamese labels and page breaks.
6. Verify that Transfers are not added to income/expense, and that historical special-finance transactions remain excluded; verify each user can only export their own data.
7. Deploy V2.5.0 and monitor API errors. Roll back to V2.2.0 if needed; no database rollback is necessary.

## Known QA limitation

This execution environment cannot complete npm dependency installation. Source preflight and the 103 tests **did pass**. Full ESLint, TypeScript compiler diagnostics, production Next.js build and browser E2E verification **have not been performed**. Do not equate source-only tests with deployment certification.
