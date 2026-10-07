# Finzaro V0.0.12 — Credit Card Manager

Finzaro là PWA quản lý tài chính cá nhân chạy Next.js + Supabase + Vercel. V0.0.12 bổ sung Credit Card Manager và nâng cấp khả năng chỉnh sửa dữ liệu/UX mobile.

## V0.0.12 có gì mới
- Credit cards, statements, payments, credit limit, utilization, minimum due, due-date tracking.
- Payment có thể link Transaction Ledger và được database kiểm tra currency/account/direction.
- Sửa Income/Expense đã nhập; ledger/account balance được hoàn nguyên và áp dụng lại atomic.
- Category có nút Sửa trực tiếp, cập nhật tên/icon/màu/parent.
- Mobile taskbar đồng nhất kích cỡ; `... Thêm` mở bottom sheet truy cập module.
- Splash loading lúc mở app + route loading fallback.
- Visual system finance-grade mới, chuẩn hóa card/input/button/typography.
- Giữ PWA auth bootstrap, update prompt, no-zoom và horizontal overflow protections.

## SQL cần chạy
`supabase/sql-editor/V0.0.12_credit_card_manager.sql`

Verify tùy chọn:
`supabase/sql-editor/V0.0.12_credit_card_manager_verify.sql`

Không cần ENV mới.

## Deploy
```bash
npm install
npm run build
```
Sau đó push GitHub và deploy/redeploy trên Vercel.

## Version kế tiếp
**Finzaro V0.0.13 — Net Worth & Financial Position**: tổng hợp tiền mặt/ngân hàng, savings goals, deposits, loans và credit-card debt thành net worth, assets/liabilities breakdown và financial position dashboard.
