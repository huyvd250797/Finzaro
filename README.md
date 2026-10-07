# Finzaro V0.0.10 — Interest & Deposit Manager

Finzaro là PWA quản lý tài chính cá nhân chạy trên Next.js + Supabase + Vercel.

## V0.0.10 có gì mới

- Interest & Deposit Manager thật trên Supabase với RLS theo user.
- Quản lý principal, annual interest rate, term, start date và maturity date.
- 3 mô hình planning: lãi đơn đáo hạn, lãi kép hàng tháng, trả lãi hàng tháng.
- Auto-renew flag và linked account cùng currency.
- Lãi dự kiến, tổng đáo hạn dự kiến, ngày còn lại và trạng thái Active / Due Soon / Matured.
- Ghi nhận realized interest / tax / fee / adjustment riêng với projected interest.
- Công cụ so sánh kỳ hạn 3 / 6 / 12 / 24 tháng không ghi DB.
- Dashboard có Deposit summary và maturity warning.
- Desktop/mobile navigation có **Tiền gửi & lãi suất**.
- Giữ nguyên PWA Auth Bootstrap, 5xx recovery, instant UI feedback và **Cập nhật ngay**.

## Database

Vào Supabase SQL Editor và chạy:

```text
supabase/sql-editor/V0.0.10_interest_deposit_manager.sql
```

Kiểm tra tùy chọn:

```text
supabase/sql-editor/V0.0.10_interest_deposit_manager_verify.sql
```

Hướng dẫn: `docs/V0.0.10_INTEREST_DEPOSIT_MANAGER_SETUP.md`.

## ENV

Không có ENV mới so với V0.0.9.

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

Push repository lên GitHub và để Vercel redeploy. PWA đang cài trên iPhone tiếp tục dùng Update Prompt để chuyển sang V0.0.10.

## Phiên bản kế tiếp

**Finzaro V0.0.11 — Loan & Debt Manager**: quản lý khoản vay, dư nợ, lãi suất, lịch trả nợ, amortization schedule, khoản thanh toán thực tế và mô phỏng trả thêm/trả trước hạn.
