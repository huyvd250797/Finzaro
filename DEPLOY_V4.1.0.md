# Finzaro V4.1.0 — Category Drill-down Reports & Today Spending Disclosure

## Phạm vi

- Nâng từ source V4.0.3.
- Không thay đổi schema Supabase, không cần chạy SQL.
- Không bổ sung dependency và vẫn giữ 6 module (Tổng quan, Giao dịch, Tài khoản, Danh mục, Báo cáo & Lịch, Cài đặt).
- Giữ toàn bộ các bản vá PWA Splash, mobile taskbar và form Lưu giao dịch trước đó.

## Thay đổi giao diện

1. **Tổng quan:** phần `Chi tiêu hôm nay` mặc định ẩn **Các khoản đã chi**; chạm tiêu đề để mở rộng. Tổng tiền và phân bổ theo danh mục vẫn hiển thị.
2. **Báo cáo → Tổng quan:** danh sách chi tiết được thay bằng danh sách **danh mục** đã nhóm. Mỗi dòng thể hiện tổng tiền theo kỳ, số lượng giao dịch và tỷ lệ trong tổng Thu/Chi. Chọn danh mục để mở biểu đồ cột.
3. **Chế độ tháng:** biểu đồ theo ngày từ ngày 1 tới ngày cuối tháng, bao gồm ngày không phát sinh. Chạm cột để tải giao dịch thuộc ngày/danh mục.
4. **Chế độ năm:** biểu đồ theo 12 tháng. Chạm cột để tải giao dịch thuộc tháng/danh mục.
5. **Dữ liệu:** các phần tổng hợp và hai tab Thu/Chi tính từ một lần tải báo cáo. API `GET /api/reports/category-entries` chỉ trả chi tiết kỳ đang chọn, yêu cầu user đăng nhập, kiểm tra ngày/tháng, không cho cache công khai và lọc bằng đúng nghiệp vụ standard Thu/Chi của loại tiền tệ đang thiết lập. Dữ liệu chi tiết dùng AbortController và cache phiên, danh sách hiển thị tăng dần 40 dòng.

## Deploy theo HV-APP

1. Sao lưu source và cấu hình, chuẩn bị staging (không cần SQL migration).
2. Giải nén gói source và thay toàn bộ source tương ứng; không dùng ZIP chồng mà giữ các file cũ đã bị xóa.
3. Cài dependencies bằng `npm ci` nếu có lockfile hợp lệ, nếu không sử dụng `npm install` theo `package.json` (môi trường Node 22 / npm 10).
4. Chạy `npm run check` gồm lint, typecheck, test và build; sau đó deploy staging.
5. Trên tài khoản thử nghiệm có giao dịch: kiểm tra chuyển Thu/Chi, lọc tháng 2 nhuận, tháng 30/31 ngày, báo cáo năm, danh mục chưa phân loại, nhiều giao dịch trong ngày, kỳ có 0 dữ liệu; xác minh tổng các cột và danh mục bằng số liệu chung.
6. Kiểm thử Safari iPhone / PWA, thao tác chạm cột, cuộn ngang và cố định taskbar Hủy/Lưu. Chỉ deploy production khi các case này đạt.

## Giới hạn kiểm chứng

- Đã chạy các bài kiểm thử source và TypeScript transpile syntax độc lập.
- Chưa xác nhận Next.js production build, full TS typecheck và giao diện Safari iPhone trên thiết bị thật trong môi trường hiện tại do thiếu npm dependencies.
- API bảo vệ bằng session và `user_id`; cần xác nhận chính sách RLS/khả năng tải dữ liệu đúng trên staging có Supabase thật trước khi phát hành.

## Rollback

Rollback source về V4.0.3. Không cần rollback database vì V4.1.0 không thực hiện migration.
