# Finzaro V0.0.11 — Loan & Debt Manager

Finzaro là PWA quản lý tài chính cá nhân chạy trên **Next.js + TypeScript + Supabase + Vercel**.

## V0.0.11 có gì mới

- Loan & Debt Manager thật trên Supabase với RLS theo user.
- Quản lý số tiền vay, lender, annual rate, term, ngày bắt đầu, kỳ trả đầu, linked account và phí ban đầu.
- Hỗ trợ 3 mô hình: **Annuity**, **Gốc đều – lãi giảm dần**, **Interest-only**.
- Payment Frequency: hàng tháng, mỗi 2 tuần hoặc hàng tuần.
- Tự sinh amortization schedule theo tần suất thanh toán đã chọn.
- Payment History tách Principal / Interest / Fee.
- Dư nợ thực tế được tính từ Principal đã trả.
- Loan Simulator mô phỏng trả thêm mỗi tháng, thời gian rút ngắn và tiền lãi tiết kiệm.
- Dashboard có Total Debt / Loan due-soon summary.
- Thư viện icon mở rộng + 12 màu gợi ý + color picker tùy ý cho Category, Savings Goal, Deposit và Loan.
- Thiết kế lại logo/PWA app icon theo phong cách fintech chuyên nghiệp.
- Mobile taskbar đổi nút ngoài cùng thành **[…] Thêm** và mở Bottom Sheet module bằng animation trượt lên.
- PWA mobile được khóa zoom/pinch, chặn kéo ngang và chuẩn hóa input không tràn layout.
- Giữ nguyên PWA Auth Bootstrap, Update Prompt, loading states và instant local modal.

## Database

Chạy bằng Supabase SQL Editor:

```text
supabase/sql-editor/V0.0.11_loan_debt_manager.sql
```

Verify tùy chọn:

```text
supabase/sql-editor/V0.0.11_loan_debt_manager_verify.sql
```

Hướng dẫn chi tiết:

```text
docs/V0.0.11_LOAN_DEBT_MANAGER_SETUP.md
```

## ENV

Không có ENV mới so với V0.0.10.

```env
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SITE_URL=https://your-finzaro.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

## Kiểm tra

```bash
npm install
npm run test
npm run typecheck
npm run build
```

## Deploy

Run SQL V0.0.11 → push GitHub → Vercel redeploy → mở PWA và bấm **Cập nhật ngay**.

## Phiên bản tiếp theo

**Finzaro V0.0.12 — Credit Card Manager**: quản lý thẻ tín dụng, credit limit, statement cycle, statement balance, due date, minimum payment, credit utilization, payment history và cảnh báo thanh toán.
