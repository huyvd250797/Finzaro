# V0.7.1 Deploy TypeScript Fix 2

- Fixed Transactions credit-card query typing when generated `Database` types do not yet include `credit_cards`, preventing `never` inference during Vercel type checking.
- Fixed Next.js 16 `revalidatePath` callback signature by wrapping it in a unary `forEach` callback.
- Added regression tests for both Vercel build failures.
- Fixed LoanForm money inputs referencing undefined `code`; both now use the in-scope `selectedCurrency`.
- Added a regression test covering the Loans Vercel type-check failure.
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
