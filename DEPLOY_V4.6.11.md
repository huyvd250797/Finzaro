# Finzaro V4.6.11 — Family Opening Balance & Dashboard Privacy

1. Sao lưu cơ sở dữ liệu Supabase.
2. Chạy `supabase/migrations/20261121190000_family_fund_opening_v4611.sql` sau toàn bộ migration đến V4.6.7.
3. Push ZIP source V4.6.11 qua Zipverra lên GitHub. Không cần xóa file thừa nếu repository đã đồng bộ sạch.
4. Triển khai Vercel và xác nhận `npm run check` (lint, typecheck, tests, build).
5. Test tạo quỹ có số dư đầu kỳ, khai báo quỹ rỗng đã tạo, ngăn khai báo hai lần, gửi/rút sau khai báo; kiểm tra Thu/Chi không đổi.
6. Trên iPhone, bật con mắt cạnh Dark Mode và kiểm tra tất cả số tiền Dashboard biến thành `******`, tắt là hiển thị lại, bao gồm biểu đồ và giao dịch gần đây.

Không có migration tự động hoặc dữ liệu giả. Lãi dự kiến không được tự cộng vào số dư. SQL mới không làm thay đổi các quỹ sẵn có.
