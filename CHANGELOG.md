# Changelog

## V0.2.0 — Financial Health Score & Intelligence

- Added `/health` Financial Health Score dashboard.
- Added weighted rule-based scoring across Cash Flow, Savings, Budget, Liquidity, Debt, Credit and Net Worth trend.
- Added Data Confidence to distinguish strong analysis from incomplete data.
- Added rule-based Financial Intelligence with contextual actions to Reports, Budgets, Goals, Loans, Credit Cards and Net Worth.
- Added `financial_health_snapshots` with RLS, daily/currency uniqueness and score history.
- Added Quick Transaction Suggestions for Income / Expense / Transfer.
- Suggestions prioritize frequently entered transaction patterns, then recent transactions.
- Selecting a suggestion auto-fills title, account, amount, category and notes while keeping the transaction date at today.
- Suggested values remain fully editable before submit; user can save immediately when the autofill is correct.
- No duplicate suggestion table: patterns are derived from the existing ledger.
- Added Financial Health entry to desktop navigation and mobile module sheet.
- Preserved V0.1.0 PWA theme bootstrap, overlay scroll lock and central transaction action.

## Next

V0.3.0 — Forecasting & Scenario Planning.
