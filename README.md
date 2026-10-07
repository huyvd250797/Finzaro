# Finzaro V0.0.9 — Savings Goals

Finzaro là PWA quản lý tài chính cá nhân chạy trên Next.js + Supabase + Vercel.

## V0.0.9 có gì mới

- Savings Goals thật trên Supabase với RLS theo user.
- Target amount, target date, currency và tài khoản liên kết.
- Chọn icon cho từng mục tiêu.
- Contribution / Withdrawal / Manual Adjustment history.
- Progress %, remaining amount và trạng thái Completed / On Track / Behind / Overdue.
- Tính số tiền cần tiết kiệm mỗi tháng đến target date.
- Ước tính ngày hoàn thành dựa trên tốc độ đóng góp thực tế khi đủ dữ liệu.
- Liên kết Savings Goal Entry với Transaction Ledger phù hợp để giữ trace giữa kế hoạch và dòng tiền thật.
- Dashboard có Savings Goals summary và các mục tiêu ưu tiên.
- Mobile navigation có shortcut **Mục tiêu**.
- Giữ nguyên PWA Auth Bootstrap, 5xx recovery và proactive **Cập nhật ngay**.

## Database

Vào Supabase SQL Editor và chạy:

```text
supabase/sql-editor/V0.0.9_savings_goals.sql
```

Có thể kiểm tra bằng:

```text
supabase/sql-editor/V0.0.9_savings_goals_verify.sql
```

Xem hướng dẫn chi tiết: `docs/V0.0.9_SAVINGS_GOALS_SETUP.md`.

## Nguyên tắc ledger

Savings Goal không tự cộng/trừ số dư tài khoản. Progress của Goal là lớp planning riêng. Nếu tiền thực sự di chuyển, hãy tạo Transaction trước rồi liên kết transaction phù hợp vào Goal Entry.

## ENV

Không có ENV mới so với V0.0.8.

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

Push repository lên GitHub và để Vercel redeploy. PWA đang cài trên iPhone sẽ tiếp tục dùng cơ chế update prompt từ các version trước.

## Phiên bản kế tiếp

**Finzaro V0.0.10 — Interest & Deposit Manager**: quản lý tiền gửi có kỳ hạn, principal, lãi suất năm, kỳ hạn, ngày đáo hạn, phương thức nhận lãi, dự báo lãi và so sánh các kịch bản gửi tiền.
