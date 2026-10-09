# Changelog

## V0.6.0 — Investment & Asset Tracking
- Thêm `/assets`, `investment_assets`, `asset_valuations`, asset allocation và unrealized gain/loss.
- Tích hợp Investment Assets vào Net Worth snapshot và Dashboard.
- Nâng Transaction Core lên `create_financial_transaction_v060` / `delete_financial_transaction_v060`.
- Chi tiền có thể thanh toán trực tiếp Credit Card hoặc Loan đang quản lý trong app.
- Loan payment hỗ trợ split Principal / Interest / Fee; chỉ Principal giảm dư nợ.
- Transfer vào/ra Savings Account liên kết tự động tăng/giảm Savings Goal.
- Hạn chế một Savings Account cho một active Goal để tránh double-count.
- Recurring Transfer cũng đi qua V0.6.0 core để Goal liên kết tự đồng bộ.
- Liability-linked transactions không được tính vào lifestyle expense/category totals.
- Backfill `transaction_purpose` cho payment Credit Card/Loan và Transfer cũ để báo cáo không double-count sau nâng cấp.
- Goal auto-sync chỉ áp dụng cho Savings Account; DB chặn một Savings Account liên kết nhiều active Goal.
- Version bump `0.5.0 → 0.6.0`.

## V0.5.0 — Financial Goals Planner
- Thêm module Financial Goals Planner và route `/goal-planner`.
- Điều phối nhiều Savings Goal theo monthly funding pool.
- Thêm strategy Priority/Balanced, auto-allocation, reorder priority và completion estimate.
- Liên kết Smart Cash Flow Planner: Savings Reserve được dùng làm gợi ý funding mặc định.
- Thêm `financial_goal_plans`, `financial_goal_allocations`, RLS và RPC atomic save.
- Tích hợp Dashboard, Sidebar và mobile module sheet.
- Version bump `0.4.1 → 0.5.0`.


## V0.4.1 — Smart Cash Flow Planner · Deploy Fix

- Fixed Vercel/Next.js build failure caused by importing the non-existent `Backspace` export from `lucide-react`.
- Replaced the keypad backspace icon with a dependency-free inline SVG to avoid future icon-export incompatibility.
- No database schema changes and no new environment variables are required.
- V0.4.0 Smart Cash Flow Planner, quick transaction suggestions and Money Calculator behavior are unchanged.

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

V0.7.0 — Advanced Debt Strategy.
