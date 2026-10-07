# Finzaro V0.0.8 — Reports & Financial Insights

Finzaro là PWA quản lý tài chính cá nhân chạy trên Next.js + Supabase + Vercel.

## V0.0.8 có gì mới

- Reports thật từ Transaction Ledger.
- Bộ lọc thời gian: tháng này, tháng trước, 3/6/12 tháng, YTD, custom.
- Filter currency, account, category và transaction type.
- Income / Expense / Net Cash Flow / Average Expense.
- Cash Flow Trend.
- Spending by Category.
- Spending by Account.
- Budget vs Actual.
- Recurring Commitments 30 ngày.
- Financial Insights rule-based, chưa dùng AI.
- Authenticated CSV export.
- PWA Auth Bootstrap cho iPhone: Add to Home Screen xong có thể đăng nhập trực tiếp trong PWA.
- PWA 5xx recovery screen thay vì màn hình `This page couldn't load`.
- Giữ nguyên proactive PWA update prompt.

## PWA fix quan trọng

Manifest không còn khởi động thẳng vào `/overview`. V0.0.8 dùng:

```text
/pwa?source=homescreen
   ├─ session hợp lệ -> /overview
   └─ chưa đăng nhập -> /login
```

PWA trên iOS có thể có cookie/storage context riêng với Safari. Finzaro không còn giả định rằng việc đã login trên Safari đồng nghĩa PWA đã login.

Xem `docs/V0.0.8_REPORTS_PWA_AUTH_SETUP.md`.

## Database

V0.0.8 không yêu cầu SQL migration mới. Dùng schema từ V0.0.7.

## ENV

```env
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SITE_URL=https://your-finzaro.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

## Chạy kiểm tra

```bash
npm install
npm run test
npm run typecheck
npm run build
```

## Deploy

Push repository lên GitHub và import/connect repository với Vercel. Không cần thêm ENV mới so với V0.0.7.

## Phiên bản kế tiếp

**Finzaro V0.0.9 — Savings Goals**: mục tiêu tiết kiệm, contribution history, target date, tiến độ, dự báo hoàn thành và liên kết với tài khoản tiết kiệm.
