# V1.1.2 — Deposit Transfer & Reports Reliability Fix

- Fixed the Transfer data model: the Tiền gửi module is `public.deposits`, not an Account with `account_type = savings`. Active Deposit records now appear directly as Transfer destinations.
- Added atomic Account → Deposit funding with optional same-currency Savings Goal contribution and exact rollback metadata.
- Added `delete_financial_transaction_v112` so deleting Deposit funding reverses the source Account, Deposit principal and associated Goal entry.
- Replaced the failing Reports embedded-relation hydration path with paginated `report_flow_rows_v112`; added a relation-free fallback that works during migration rollout.
- Added a Reports-specific recovery boundary and regression coverage for Deposit destinations, Goal funding and report loading.
- Added the required V1.1.2 Supabase migration and read-only verification script.

# V1.1.1 — Transfer & Reports Reliability Fix

- Fixed Transfer destination UX so active Savings accounts are explicitly grouped first and exposed as quick-select chips on mobile.
- Restored the Goal selector flow after selecting a Savings destination; linked Goals are prioritized and protected against accidental double-goal updates.
- Reverted Reports transaction hydration to the production-proven `loadLedger(..., fetchAll: true)` path after the lighter V1.1.0 loader caused empty/failed reports on some Supabase deployments.
- Kept the V1.1.0 Reports Calendar, interactive pie, three-KPI overview row and design-system polish unchanged.
- No new database migration is introduced; the existing V1.1.0 Savings → Goal RPC migration is still required.

# V1.1.0 — UI Design System & Visual Polish

- Introduced centralized surface/radius/shadow/semantic UI tokens and refined shared Card/Button primitives for a more consistent visual system.
- Added optional **Thêm vào mục tiêu** when transferring into a Savings account. A new `create_transfer_with_goal_v110` RPC updates the transfer and Goal contribution atomically and avoids duplicate Goal progress when the Goal is already linked to the destination Savings account.
- Reworked Reports Calendar day cells for mobile readability with a wider scrollable grid, larger cells and non-truncated Income/Expense values; zero values remain hidden.
- Replaced the center-covered donut with an interactive full pie: slices/legend items are selectable, selection reveals category/percentage/amount, and large slices render labels inside the pie.
- Compacted Reports Overview so Expense, Income and Net sit on one three-card row.
- Added a report-specific paginated ledger loader and parallel supporting queries so overview/calendar/category/analysis no longer fetch unnecessary account/category data.
- Added Reports loading skeletons and retained the V1.0.2 Next.js 16.4.0 security stack.
- Added V1.1.0 migration + verification scripts and regression coverage for the new Savings/Goal and Reports/UI behavior.

# V1.0.2 — Next.js Security Patch

- Upgraded Next.js from `16.0.0` to `16.4.0` after Vercel blocked the vulnerable framework version.
- Upgraded `eslint-config-next` from `16.0.0` to `16.4.0` to keep lint tooling aligned with the framework.
- Kept React / React DOM / React types on the aligned `19.3.0` line.
- Removed the Vercel/npm `legacy-peer-deps` bypass; installs now resolve the declared peer graph normally while still skipping audit/fund network work.
- No database schema or financial-data changes.

# V1.0.1 — Production Deploy Fix

- Fixed Vercel dependency resolution that could backtrack between React 19.2 and React DOM 19.3 and exceed the build time limit.
- Aligned `react` and `react-dom` to 19.3.0 and aligned `@types/react` / `@types/react-dom` to 19.3.0.
- Updated TypeScript to 5.9.3 to match the resolved toolchain.
- Pinned the deployment runtime to Node 22.x / npm 10.x.
- Added deterministic Vercel install flags and project `.npmrc` to avoid peer-resolution loops, audit/fund network work, and unnecessary registry churn during deploy.
- No database schema or financial-data changes.

# V1.0.0 — Production Release

- Promoted the V0.8.0 Release Candidate to the first production baseline without adding a new finance module.
- Added root/dashboard/global error recovery and a custom 404 surface so transient rendering failures do not leave a blank app.
- Hardened response headers with anti-framing, COOP, HSTS in production, MIME-sniffing protection, referrer policy and restricted browser permissions.
- Added a `prebuild` environment validation gate and stricter placeholder/HTTPS checks for production deploys.
- Pinned application and build dependencies to exact versions in `package.json` to reduce deployment drift.
- Removed the silent 10,000-row ceiling from Reports/Calendar/category drill-down/CSV export by adding full-range pagination with a visible 100,000-row safety ceiling.
- Removed the silent 10,000-row ceiling from Category historical usage counting.
- Preserved the V0.8.0 Reports UX, 84-icon Category library, atomic liability funding and conservative authenticated-PWA cache strategy.
- Added a read-only V1.0.0 Supabase production verification script and pgTAP production smoke checks; no V1.0.0 schema migration is required.

# V0.8.0 — Release Candidate

- Reworked Reports into three focused surfaces: `Tổng quan`, `Lịch`, and `Phân tích` without adding a new top-level finance module.
- Added monthly/yearly overview with Income/Expense toggle, net cashflow summary, donut category breakdown and category drill-down.
- Added Transaction Calendar at `/reports/calendar`; every day can show both Income (green) and Expense (red), and `0đ` values are intentionally hidden.
- Added category detail trend views for 6-month and annual analysis with direct drill-down to transaction history.
- Preserved existing advanced report filters and insights under `/reports/analysis` and increased report-ledger read ceiling from 5,000 to 10,000 rows per selected range.
- Promoted Reports to the mobile taskbar; Recurring remains accessible from the module sheet.
- Expanded Category icons from 52 to 84 options, added Vietnamese labels and icon search.
- Added V0.8.0 database migration to expand the Category icon CHECK constraint so UI validation and Supabase validation remain aligned.
- Standard Income remains the only Income counted in Reports; debt funding from Loans/Credit Cards is still excluded from real income analytics.

# V0.7.5 — Release Stabilization

- Feature freeze: no new user-facing module or workflow.
- Fixed consecutive calculator operator handling so changing `+ / - / × / ÷` before the next operand replaces the pending operator instead of reapplying the previous amount.
- Made overlay scroll locking reference-counted to keep nested modal/bottom-sheet states stable on iPhone/PWA.
- Hardened service-worker installation: recovery pages remain required, optional icon caching cannot abort installation, and activation only deletes old Finzaro cache namespaces.
- Added user/date indexes for Loan Payments, Credit Card Payments and Asset Valuations to protect loading performance as history grows.
- Added V0.7.5 SQL Editor migration + verification files and release-stabilization regression tests.

# V0.7.4 — Money Thousands + Full Mobile Taskbar

- All `MoneyCalculatorInput` displays now group thousands with dots (for example `1.000.000`).
- Decimal money remains entered with the `.` calculator key and stored canonically; visible decimal money uses `1.234,56` so thousands and decimals are unambiguous.
- Numeric money placeholders are formatted with the same visible grouping.
- Reworked the mobile center `+` control so it no longer relies on a negative top margin.
- Removed CSS paint containment that clipped the floating `+` button.
- Added reserved top space plus safe-area bottom padding while keeping the taskbar fixed to the viewport bottom; dashboard content and the PWA update prompt now also clear the taller safe-area-aware bar.
- Added regression tests for money display formatting and taskbar clipping.
- No database migration required.

# V0.7.3 — Deploy TypeScript Fix 2

- Fixed LoanForm money inputs referencing undefined `code`; both now use the in-scope `selectedCurrency`.
- Added a regression test covering the Loans Vercel type-check failure.
- No database migration required.

# V0.7.2 — Deploy TypeScript Fix

- Fixed Transactions credit-card query typing when generated `Database` types do not yet include `credit_cards`, preventing `never` inference during Vercel type checking.
- Fixed Next.js 16 `revalidatePath` callback signature by wrapping it in a unary `forEach` callback.
- Added regression tests for both Vercel build failures.
- No database migration required.

# Finzaro Changelog

## V0.7.1 — Mobile Money UX + Debt Funding

### Added
- App-wide `MoneyCalculatorInput` bottom sheet for money-entry fields; **Xong** commits the displayed value and closes the calculator.
- Decimal-safe `%` / interest inputs that normalize iPhone comma input to canonical dot-decimal values.
- `Thu nhập → Lấy tiền từ thẻ tín dụng`: credits the receiving Account and increases the selected Credit Card debt atomically.
- `Thu nhập → Giải ngân khoản vay mới`: captures loan terms, creates the Loan and credits the receiving Account atomically.
- `liability_funding_events` audit linkage plus rollback-aware `delete_financial_transaction_v071`.

### Changed
- Mobile create/edit overlays now behave as bottom sheets and are capped to the real dynamic viewport.
- Mobile taskbar remains fixed against the viewport bottom; overlay scroll locking no longer fixes/repositions `<body>` on iOS/PWA.
- Form controls are width-hardened so long values cannot push past modal/bottom-sheet boundaries.
- Borrowed funds are excluded from real-income totals and monthly report cashflow.
- Transaction-page loading now parallelizes core requests, reads active Credit Cards directly, and reuses Ledger account/currency data instead of invoking the heavier full Loan loader.
- Money parsing accepts both `,` and `.` user input while storing canonical values according to currency precision.
- Version `0.7.0 → 0.7.1`.

### Database upgrade
- Run `supabase/sql-editor/V0.7.1_mobile_money_debt_funding.sql` after the V0.7.0 schema.
- Optional smoke verification: `supabase/sql-editor/V0.7.1_mobile_money_debt_funding_verify.sql`.

## V0.7.0 — Advanced Debt Strategy

### Added
- New `/debt-strategy` module.
- Debt Avalanche and Debt Snowball simulation across active Loan + Credit Card balances.
- Extra-monthly-payment calculator, baseline comparison, estimated debt-free month count, interest estimate and payoff order.
- Saved `debt_strategy_plans` preference per user/currency.
- Stock holding metadata on `investment_assets`: ticker, exchange, average buy price, market price, provider and auto-price flag.
- Official SSI Node SDK dependency `@ssi.developer/ssi-sdk@3.2.1`.
- Server-only SSI FastConnect market-data adapter and `/api/market/ssi/refresh` route.
- Automatic 30-second quote refresh while Assets page is visible, with manual refresh control.
- Daily coalescing of repeated SSI valuation updates to avoid excessive `asset_valuations` rows.
- SSI/Vietnam-equity quote normalization to VND/share before market-value and unrealized P/L calculations.

### Changed
- Stock Cost Basis can be derived from average buy price × quantity.
- Stock cards show ticker/exchange, market price, average buy price and SSI last-update time.
- Sidebar/mobile navigation and Overview include Advanced Debt Strategy.
- Version `0.6.0 → 0.7.0`.

### Security / architecture
- SSI API Key/Secret stay server-side and are never exposed as public env values.
- SSI integration is read-only Market Data; Finzaro does not place securities orders in V0.7.0.
- Existing V0.6.0 Transaction Core behavior for Credit Card/Loan payments and Goal-linked Savings remains intact.

### Next
- V0.8.0 — Credit Intelligence.
