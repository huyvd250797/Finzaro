# Finzaro V0.3.0 — Forecasting & Scenario Planning

Finzaro là PWA quản lý tài chính cá nhân chạy Next.js + TypeScript + Supabase + Vercel. V0.3.0 đưa hệ thống từ phân tích quá khứ/hiện tại sang dự báo Cash Position và mô phỏng kịch bản tài chính tương lai.

## Điểm mới V0.3.0

- Trang `/forecast` với baseline forecast 30 / 90 / 180 / 365 ngày.
- Dự báo sử dụng dữ liệu thật từ Account, Transaction, Recurring, Loan, Credit Card, Deposit và Net Worth.
- Known inflow / known obligations 30 ngày.
- Projected Cash Position 12 tháng và cảnh báo tháng có nguy cơ shortfall.
- Scenario Planner realtime: tăng/giảm thu nhập, tăng/giảm chi tiêu, thu nhập thêm, chi thêm, trả nợ thêm và reserve tiết kiệm.
- Lưu kịch bản vào Supabase để dùng lại trên nhiều thiết bị.
- RLS cho `forecast_scenarios`.
- Desktop navigation và mobile Bottom Sheet bổ sung Dự báo.
- Dashboard có shortcut Forecasting & Scenario Planning.
- Sửa giao diện `Gợi ý chọn nhanh`: responsive grid 2 cột trên mobile, không còn card hẹp/bể amount.
- Sửa datepicker trong form giao dịch: Finzaro-styled date shell, không tràn modal trên iPhone PWA.
- Giữ nguyên PWA Auth bootstrap, update prompt, theme bootstrap và overlay scroll lock.

## SQL cần chạy

Supabase → SQL Editor → Run:

`supabase/sql-editor/V0.3.0_forecasting_scenarios.sql`

Verify tùy chọn:

`supabase/sql-editor/V0.3.0_forecasting_scenarios_verify.sql`

Không chạy lại migration cũ nếu database đã ở V0.2.0.

## ENV

Không có biến mới. Xem `.env.example`.

## Commands

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

## Versioning

Finzaro dùng `X.Y.Z`:

- `X`: major workflow/architecture change.
- `Y`: module/feature mới.
- `Z`: bug/UI/performance/deploy fix.

V0.3.0 là feature release nên tăng `Y` từ V0.2.0.

## Tiếp theo

**Finzaro V0.4.0 — Smart Cash Flow Planner**: biến forecast thành kế hoạch dòng tiền theo tháng, safe-to-spend, reserved money, upcoming obligations và cảnh báo thiếu hụt có hành động cụ thể.
