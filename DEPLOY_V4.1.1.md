# Finzaro V4.1.1 — Full-screen Category Analytics & Instant Details

## Phạm vi nâng cấp

- Nâng cấp từ source **V4.1.0**; giữ nguyên 6 module và toàn bộ nghiệp vụ tài chính.
- **Báo cáo → Tổng quan → Danh mục:** Chọn danh mục sẽ mở **modal toàn màn hình** (desktop/iPhone/PWA), không còn chèn biểu đồ bên dưới danh sách. Header có tên và màu danh mục, nút **X** đóng; hỗ trợ Escape, trả focus khi đóng và giới hạn cuộn bên trong modal.
- Biểu đồ tháng có 28–31 cột (ngày); biểu đồ năm có 12 cột (tháng). **Màu cột lấy theo `icon_color` của danh mục**, không còn lấy màu chung theo Thu/Chi. Cột không có giao dịch hiển thị màu trung tính.
- **Tăng tốc mở chi tiết:** bản báo cáo đã có đủ ledger, nên server gửi kèm bản xem trước hoàn chỉnh của những bucket nhỏ (tối đa 300 giao dịch Chi và 180 giao dịch Thu, mỗi bucket tối đa 60). Chọn các bucket đã có dữ liệu sẽ hiển thị ngay, không phát sinh API call.
- Với bucket chưa cache, API chi tiết dùng truy vấn Supabase **được lọc tại database** theo `user_id`, Thu/Chi, `category_id` và ngày/tháng; lấy các bút toán lồng nhau trong cùng truy vấn, không còn dựng lại toàn bộ ledger của kỳ báo cáo. Có phân trang và fallback tương thích cho những schema cũ nếu truy vấn mới lỗi.
- Giữ hủy request lỗi thời, cache trong phiên, chỉ hiển thị 40 giao dịch mỗi đợt; trạng thái loading/lỗi/thử lại vẫn hoạt động.

## Dữ liệu và bảo mật

- Không SQL migration; 91 file SQL giữ nguyên.
- Không thêm dependency; Next.js/React và 6 module giữ nguyên.
- Chi tiết phải đúng `transaction_purpose=standard`, loại Thu hoặc Chi, tiền tệ người dùng thiết lập. Không tính chuyển tiền hoặc giao dịch đặc biệt vào số liệu Thu/Chi.
- Mọi API chi tiết đều yêu cầu phiên đăng nhập, lọc `user_id`, kiểm tra định dạng ngày/tháng và trả `Cache-Control: private, no-store`.
- Preview có giới hạn, không gửi nhóm giao dịch chưa đầy đủ (nếu số giao dịch vượt mức, nhóm đó chỉ tải khi nhấn cột).

## Triển khai

1. Backup source/configuration, deploy ZIP V4.1.1 lên môi trường staging (không chồng tệp thừa giữa các bản).
2. Sử dụng Node 22/npm 10. Cài dependency (`npm install` hoặc `npm ci` nếu có package-lock hợp lệ).
3. Chạy `npm run check` và `npm run build` trên CI/staging trước deploy production. Không bỏ qua lỗi TypeScript.
4. Trên tài khoản kiểm thử: vào Báo cáo → Tổng quan → Thu / Chi → chọn danh mục. Xác minh modal chiếm toàn màn, X/Escape đóng, màu biểu đồ đúng màu danh mục.
5. Thử ngày có nhiều/ít/0 giao dịch và biểu đồ 12 tháng; đối chiếu tổng giá trị chi tiết với cột và tổng danh mục.
6. Trên iPhone Safari/PWA: mở/đóng, cuộn ngang biểu đồ, cuộn dọc giao dịch, vùng safe area và thanh navigation không hiển thị chồng lên modal.
7. Đo thời gian từ chọn cột tới giao dịch xuất hiện ở p50/p95; xác nhận bucket có preview không phát sinh API; bucket chưa preview dùng truy vấn lọc. Không mặc định cam kết một mức thời gian khi mạng/Supabase chậm.
8. Xác minh lưu/xóa giao dịch ở màn khác vẫn làm mới dữ liệu khi quay lại Báo cáo; không dùng số liệu cache cũ sau khi server re-render.

## QA đã thực hiện trong môi trường source

- 178 bài kiểm thử regression/kiến trúc/logic chi tiết; 4 ca mới V4.1.1.
- Kiểm tra cú pháp TypeScript/TSX và import nội bộ, kiểm tra tính toàn vẹn ZIP.
- Không xác nhận Next.js production build hoặc Safari iPhone thật vì dependency npm không cài đủ trong môi trường tạo ZIP; cần kiểm chứng trên staging.

## Rollback

Quay lại ZIP source V4.1.0; không cần rollback Supabase schema vì không có migration.
