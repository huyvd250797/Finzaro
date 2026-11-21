# Finzaro V4.6.9 — Dedicated Debts & Family Funds UX

## Nội dung
- Tách `/funds` (Quỹ gia đình) và `/debts` (Công nợ cá nhân) khỏi các block bên dưới `/accounts`.
- Truy cập qua sidebar desktop, mục **Thêm** trên iPhone, và hai card Dashboard.
- Các thao tác tạo/sửa, chuyển tiền quỹ và thanh toán công nợ mở modal toàn màn hình trên mobile.
- Giữ nguyên tài khoản quỹ V4.6.6, công nợ V4.6.7 và tính toàn vẹn sổ Thu/Chi.

## Triển khai
1. Đảm bảo đã chạy migration V4.6.6 và V4.6.7 trước đây (không chạy lại).
2. Push ZIP V4.6.9 lên GitHub (nâng cấp thông thường, không cần xóa file thừa khi repository sạch).
3. Deploy Vercel, xác minh `npm run check` (lint, typecheck, tests, production build).
4. Kiểm thử trên iPhone: menu Thêm → Công nợ/Quỹ gia đình → Tạo mới → modal toàn màn hình → lưu.
5. Kiểm thử Dashboard: giá trị quỹ và công nợ lấy từ đúng tài khoản/danh sách người dùng.
6. Kiểm thử sửa khoản nợ, thu hồi/trả nợ và gửi/rút quỹ. Gốc và chuyển quỹ không được ghi thành Thu/Chi; lãi thực tế mới ghi nhận.

**No new migration — SQL migration V4.6.9: Không có.** Dữ liệu hiện có được bảo toàn.

Lưu ý: việc hiển thị dữ liệu và luồng RPC cần xác minh trên môi trường Supabase/Vercel production thật.
