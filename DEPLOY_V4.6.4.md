# Finzaro V4.6.4 — Portfolio UX & Snapshot Fix

## Phạm vi
- Thiết kế lại UI/UX module **Tài sản** gọn hơn, giảm mô tả dư thừa và tối ưu hiển thị số tiền lớn.
- Số tiền tổng danh mục nằm trên **một dòng riêng** để tránh rớt dòng trên màn hình hẹp.
- Bổ sung **xóa tài sản**.
- Sửa lỗi lưu snapshot báo `permission denied for table portfolio_snapshots_v460`.
- Cải thiện độ ổn định khi đọc **giá vàng PNJ** từ bảng giá chính thức.

## Migration bắt buộc
Chạy file SQL sau trên Supabase **sau khi đã có V4.6.0 + V4.6.1 + V4.6.2**:

- `supabase/migrations/20261120190000_portfolio_ux_snapshot_delete_v464.sql`

Migration này thêm 2 RPC:
- `portfolio_save_snapshot_v464(date,numeric,integer)`
- `portfolio_delete_v464(uuid)`

## Các bước triển khai
1. Backup database production theo quy trình hiện hành.
2. Chạy migration V4.6.4 trên Supabase.
3. Deploy source V4.6.4.
4. Xác nhận giao diện app hiển thị **V4.6.4**.
5. Kiểm tra các luồng:
   - mở module **Tài sản**;
   - tổng tài sản không bị rớt dòng;
   - thêm / sửa / mua-bán tài sản;
   - **xóa tài sản**;
   - **Lưu thống kê hôm nay** không còn lỗi permission;
   - tài sản vàng PNJ đọc được giá khi nguồn chính thức khả dụng.

## Lưu ý nghiệp vụ
- Xóa tài sản là **xóa vĩnh viễn** vị thế và lịch sử mua/bán của chính tài sản đó.
- Snapshot đã lưu trước đó vẫn được giữ nguyên như lịch sử quan sát.
- Không có đồng bộ nền, cron hay realtime market sync.
