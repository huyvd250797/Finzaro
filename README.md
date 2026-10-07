# Finzaro V0.0.7 — Recurring Transactions & Financial Calendar

Finzaro là PWA quản lý tài chính cá nhân xây bằng Next.js + Supabase + Vercel. V0.0.7 bổ sung giao dịch định kỳ, Financial Calendar và một đợt tối ưu UX/performance để thao tác phản hồi ngay thay vì tạo cảm giác app bị lag.

## Có gì mới trong V0.0.7

### Recurring Transactions

- `recurring_rules` thật trên Supabase.
- Hỗ trợ Income / Expense / Transfer định kỳ.
- Weekly / Monthly / Yearly, có `interval_count` cho mỗi N chu kỳ.
- Start date / optional end date.
- Category và account được validate theo owner + trạng thái archive.
- Minor-unit `BIGINT`, không dùng floating point cho tiền.
- Multi-currency transfer vẫn yêu cầu số tiền nhận rõ ràng, không tự đoán FX.
- Pause / Resume rule.

### Financial Calendar

- Calendar theo tháng.
- Phân biệt Upcoming / Due Today / Overdue / Paid / Skipped.
- Danh sách các khoản cần xử lý trong 30 ngày tới.
- Khi bấm **Đã thanh toán / Đã nhận**, Finzaro gọi RPC và tạo Transaction thật vào ledger.
- Khi **Bỏ qua**, không tạo transaction.
- Hỗ trợ **Hoàn tác**; nếu kỳ đã tạo Transaction, ledger và account balance được reverse bằng Transaction Core.
- Dashboard có summary các khoản định kỳ trong 14 ngày tới.

### UX / Performance Fix

- `requireUser()` được request-deduplicate bằng React `cache()`.
- Bỏ `getUser()` round-trip dư thừa; server authorization dùng verified `getClaims()`.
- Mở form **Thêm tài khoản**, Transaction composer, Budget mới và Category mới bằng local instant modal, không cần đợi server chỉ để hiện UI.
- Thêm top navigation progress bar + route loading skeleton.
- Các nút submit quan trọng đổi trạng thái ngay bằng `useFormStatus()`:
  - `Đang đăng nhập...`
  - `Đang tạo tài khoản...`
  - `Đang lưu giao dịch...`
  - `Đang tạo danh mục...`
  - `Đang tạo ngân sách...`
  - `Đang tạo lịch...`
- Nút bị disable trong lúc submit để tránh double-submit.

### PWA Update Prompt

Cơ chế từ V0.0.5 tiếp tục được giữ. Khi PWA iPhone phát hiện version mới, app hiện banner **Có phiên bản Finzaro mới** và nút **Cập nhật ngay** để activate Service Worker mới rồi reload.

## SQL bắt buộc

Vào **Supabase → SQL Editor → New query**, chạy toàn bộ file:

```text
supabase/sql-editor/V0.0.7_recurring_calendar.sql
```

Sau đó có thể chạy file kiểm tra read-only:

```text
supabase/sql-editor/V0.0.7_recurring_calendar_verify.sql
```

Không chạy lại SQL V0.0.3–V0.0.6 nếu database đã được nâng cấp trước đó.

Hướng dẫn chi tiết: `docs/V0.0.7_RECURRING_CALENDAR_SETUP.md`.

## ENV

V0.0.7 không cần ENV mới:

```env
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SITE_URL=https://your-finzaro.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

## Deploy

```bash
npm install
npm run test
npm run typecheck
npm run build
```

Push GitHub → Vercel tự deploy.

## Version hiện tại

```text
Finzaro V0.0.7 · Recurring Transactions & Financial Calendar
```

Version được quản lý tập trung tại `lib/app-version.ts` và được dùng cả trong UI lẫn PWA update detection.

## Phiên bản tiếp theo

**Finzaro V0.0.8 — Reports & Financial Insights**

Dự kiến nâng cấp Reports thành module thật: period presets/custom range, breakdown theo account/category, budget variance, income-vs-expense, trend comparison, CSV export nền tảng và các insight rule-based trước khi tiến tới Savings Goals / AI.
