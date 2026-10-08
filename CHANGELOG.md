# Changelog

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

V0.4.0 — Smart Cash Flow Planner.
