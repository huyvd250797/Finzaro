# Finzaro V0.4.0 — Smart Cash Flow Planner

Finzaro là PWA quản lý tài chính cá nhân chạy Next.js + TypeScript + Supabase + Vercel. V0.4.0 biến Forecasting thành kế hoạch dòng tiền theo từng tháng và nâng cấp luồng nhập tiền trong Transaction Core.

## Điểm mới V0.4.0

- `/cash-flow` — Smart Cash Flow Planner.
- Safe to Spend theo tháng.
- Planned income, discretionary spending, savings reserve, extra debt payment và minimum cash buffer.
- Lưu kế hoạch tháng bằng `cash_flow_plans` với RLS.
- Quick Transaction Suggestions dạng horizontal snap carousel, 2 card/lần, tối đa 10 mẫu.
- Money Calculator Input hiển thị số kiểu Việt Nam và tính trực tiếp `10.000 + 20.000 = 30.000`.
- Money Calculator cũng được áp dụng khi sửa khoản Thu/Chi.
- Forecasting V0.3.0, Financial Health, Net Worth, Credit Card, Loan, Deposit, Goals, Budget, Recurring và Ledger tiếp tục được giữ nguyên.

## SQL Editor

Chạy duy nhất migration mới:

`supabase/sql-editor/V0.4.0_smart_cash_flow_planner.sql`

Verify tùy chọn:

`supabase/sql-editor/V0.4.0_smart_cash_flow_planner_verify.sql`

Không cần chạy lại các migration cũ.

## ENV

Không có ENV mới.

```env
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SITE_URL=https://your-finzaro.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

## Deploy

1. Run SQL V0.4.0 trên Supabase DEV/PROD phù hợp.
2. Push source lên GitHub.
3. Vercel tự build/deploy.
4. PWA Update Prompt sẽ phát hiện V0.4.0.

Chi tiết: `docs/V0.4.0_SMART_CASH_FLOW_PLANNER_SETUP.md`.
