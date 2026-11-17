# Finzaro V4.5.7 — Full Previous Period Comparison

## Thay đổi nghiệp vụ
- Ngày hiện tại (từ 00:00 đến số liệu mới nhất) so với **cả ngày hôm qua**.
- Tháng hiện tại (từ ngày 01 tới hôm nay) so với **toàn bộ tháng trước** (01 đến ngày cuối tháng).
- Năm hiện tại (từ 01/01 tới hôm nay) so với **toàn bộ năm trước** (01/01 tới 31/12).
- Các khoảng được tính theo ngày lịch trong timezone cấu hình, tính đúng tháng 28/29/30/31 ngày, năm nhuận, giao thừa, tháng 1.
- Chênh lệch, phần trăm vẫn theo `current - previous` và `(current - previous)/previous * 100`; baseline 0, current > 0 hiển thị `Mới phát sinh` và không hiện % giả.
- Màu: Chi tăng/Thu giảm đỏ; Chi giảm/Thu tăng xanh; không đổi trung tính. Icon zigzag `TrendingUp` / `TrendingDown` giống ảnh mẫu, không sử dụng `ArrowUpRight` / `ArrowDownRight` trong so sánh.
- Vì kỳ tháng/năm đang diễn ra, dùng nhãn `Chi/Thu thấp hơn` hoặc `Chi/Thu vượt` toàn bộ kỳ trước, tránh hiểu sai thành kết quả chung cuộc.
- Link xem giao dịch kỳ trước mở đúng trọn tháng/năm trước.

## Migration Supabase — **BẮT BUỘC**
1. Đã áp dụng migrations tới V4.5.5 (đặc biệt `dashboard_snapshot_v450`).
2. Trên Supabase SQL Editor, chạy nguyên văn file `supabase/migrations/20261117130000_full_previous_period_comparison_v457.sql` (cùng nội dung file TXT bàn giao).
3. Kiểm tra RPC `public.dashboard_period_comparison_v457(text,date)` tồn tại, quyền EXECUTE chỉ dành cho `authenticated`.
4. Deploy source V4.5.7. App yêu cầu `snapshotVersion=v457` và full date ranges trước khi sử dụng dữ liệu. RPC `v455` giữ nguyên để rollback.

## Kiểm thử sau deploy
- 17/11/2026: ngày 16/11, tháng 01–31/10, năm 01/01–31/12/2025.
- 01/01/2027: hôm qua 31/12/2026, tháng 12/2026, năm 2026.
- 15/03/2026: tháng 01–28/02/2026 (28 ngày); 2024 có ngày 29/02.
- Giao dịch trên ngày cuối tháng/năm trước phải cộng đủ; chuyển ví/khoản phi chuẩn/ngoại tệ không được cộng.
- Mở ba card Dashboard, đổi Chi/Thu, icon tăng/giảm/không đổi đúng chiều và đúng màu. Kiểm tra màn hẹp/desktop.
- Chạy `npm run check` trong môi trường npm có đầy đủ dependencies trước khi phát hành chính thức.

## Rollback
- Quay lại source V4.5.6 không cần xoá RPC `v457` (đây là migration cộng thêm).
