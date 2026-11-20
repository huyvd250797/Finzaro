# Finzaro V4.6.3 — Market Price Reliability Deploy Fix

## Mục tiêu
- Phát hành chính thức bản vá lỗi deploy của V4.6.2 dưới số phiên bản tăng **V4.6.3**.
- Bản này kế thừa toàn bộ tính năng Market Price Reliability Fix: sửa số lượng cổ phiếu dạng số nguyên; lấy giá vàng PNJ theo yêu cầu (best-effort); giá chứng khoán Vietcap công khai qua `vnstock-js`; SSI tùy chọn; giá dự phòng thủ công và các trạng thái thiếu giá.
- Bài kiểm thử TypeScript sử dụng `require('typescript')` từ dependency của dự án thay vì đường dẫn toàn cục cứng trên máy phát triển.
- **Không có đồng bộ giá nền, Supabase Cron, Realtime hoặc lưu giá theo lịch.**

## Triển khai từ V4.6.2 (đã chạy migration)
1. Sao lưu cấu hình/repository trước khi push.
2. Dùng Zipverra đồng bộ toàn bộ ZIP source lên đúng nhánh GitHub được Vercel triển khai, chọn **xóa file thừa**.
3. Redeploy Vercel với Node.js 22 và cài đủ `devDependencies` (bao gồm `typescript`).
4. Kiểm tra build log: `npm run check` gồm lint, typecheck, test và Next.js build; phiên bản hiện ở giao diện phải là `V4.6.3`.
5. Kiểm tra Tài sản: thêm MBB 100 CP, chỉnh sửa, mua/bán; PNJ vàng nhẫn 9999; giá dự phòng; tổng danh mục.

## Nếu database vẫn ở V4.6.1
- **Trước khi deploy** phải chạy SQL migration có sẵn: `supabase/migrations/20261120163000_market_price_reliability_v462.sql` (chỉ một lần).
- Đây là migration của tính năng giá thị trường V4.6.2, **không có migration V4.6.3**.
- Nếu đã chạy migration V4.6.2, không chạy lại hoặc xóa dữ liệu.

## Không cần cấu hình
- Không cần `MARKET_SYNC_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` hay cron job.
- PNJ và Vietcap thử lấy dữ liệu giá công khai không cần key cá nhân. Khả năng trả giá thực tế phụ thuộc nguồn và mạng của Vercel; không cam kết hoạt động khi nguồn thay đổi hoặc giới hạn truy cập.
- Có thể đặt `SSI_CONSUMER_ID` và `SSI_CONSUMER_SECRET` nếu dùng SSI chính thức.

## Phạm vi xác minh
- Kiểm tra trong mã nguồn, test và release gate không chứng minh được PNJ/Vietcap trả dữ liệu đúng trên máy chủ Vercel tại mọi thời điểm.
- Không có thay đổi schema, RPC, dữ liệu người dùng hoặc lịch sử đầu tư trong V4.6.3.
