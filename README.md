# Finzaro V0.1.0 — Net Worth & Financial Position

Finzaro là PWA quản lý tài chính cá nhân chạy Next.js + TypeScript + Supabase + Vercel. V0.1.0 hợp nhất Assets/Liabilities thành Net Worth theo từng currency và bắt đầu áp dụng version policy `X.Y.Z` mới.

## Điểm mới V0.1.0

- Trang `/net-worth` với Total Assets, Total Liabilities, Net Worth và Liquid Assets.
- Breakdown Account / Deposit / Loan / Credit Card.
- Debt-to-Asset và Liquidity Coverage.
- Snapshot Net Worth theo ngày + trend 12 snapshot gần nhất.
- Không double-count Savings Goals.
- Không tự quy đổi FX.
- Khôi phục nút `(+)` lớn ở giữa mobile taskbar: 2 chức năng trái, 2 chức năng phải; ngoài cùng bên phải là `Thêm`.
- Quick-add Expense / Income / Transfer từ nút giữa.
- Category đã dùng vẫn sửa được tên/icon/màu; có confirm cảnh báo trước khi áp dụng cho lịch sử hiển thị.
- Fix legacy DB icon allow-list để bộ icon mới có thể lưu thật.
- Modal/bottom sheet khóa background scroll trên iOS/PWA.
- Splash dùng đúng Light/Dark mode đã lưu ngay từ first paint.

## SQL cần chạy

Supabase → SQL Editor → Run:

`supabase/sql-editor/V0.1.0_net_worth_financial_position.sql`

Verify tùy chọn:

`supabase/sql-editor/V0.1.0_net_worth_financial_position_verify.sql`

Không chạy lại migration cũ nếu database đã ở V0.0.12.

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

Xem `docs/VERSIONING.md`.

- `X`: major workflow/architecture change.
- `Y`: module/feature mới.
- `Z`: bug/UI/performance/deploy fix.

Vì Net Worth là module mới, release dự kiến `V0.0.13` được đổi thành **V0.1.0**.

## Tiếp theo

**Finzaro V0.2.0 — Financial Health Score & Intelligence**: tổng hợp cash flow, budget adherence, emergency liquidity, debt load, credit utilization và Net Worth trend thành bộ chỉ báo sức khỏe tài chính có giải thích, không đưa ra quyết định tài chính thay người dùng.
