# Changelog

## V0.4.0 — Smart Cash Flow Planner

- Added Smart Cash Flow Planner with monthly Safe to Spend planning.
- Added persistent `cash_flow_plans` with Supabase RLS.
- Added planned income, discretionary limit, savings reserve, extra debt payment and cash buffer controls.
- Changed transaction quick suggestions to a horizontal 2-card viewport, maximum 10 suggestions.
- Added Money Calculator Input with Vietnamese thousands formatting and inline arithmetic.
- Applied calculator amount entry to create and edit Income/Expense transactions.
- Added desktop/mobile navigation entry for Cash Flow Planner.

## V0.3.0 — Forecasting & Scenario Planning

- Added `/forecast` with 30/90/180/365-day forward cash projections.
- Forecast engine combines historical cash flow, Recurring Rules, Loan schedules, Credit Card statement obligations and non-auto-renew Deposit maturities.
- Added projected 12-month cash position and shortfall detection.
- Added realtime Scenario Planner for income, expense, extra income/spend, extra debt payment and savings reserve assumptions.
- Added persistent `forecast_scenarios` with Supabase RLS.
- Added Forecasting navigation entry to desktop sidebar and mobile module sheet.
- Added Forecasting shortcut to Overview.
- Rebuilt Quick Transaction Suggestions as a responsive mobile grid; no more narrow/broken suggestion cards.
- Added Finzaro-styled `MobileDateInput` so the transaction date field remains inside the modal on iOS while preserving the native picker.
- Preserved PWA auth bootstrap, update prompt, theme bootstrap and modal/background scroll locking.

## Next

V0.5.0 — Financial Goals Planner.
