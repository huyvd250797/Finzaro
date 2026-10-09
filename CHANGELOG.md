# Finzaro Changelog

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
