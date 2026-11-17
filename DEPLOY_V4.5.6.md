# Finzaro V4.5.6 — Comparison Direction Icons

## Mục tiêu
- Bổ sung icon/mũi tên đứng trước nội dung so sánh ở 3 card Dashboard (Ngày / Tháng / Năm).
- Bao phủ đủ bốn trạng thái: **Tăng chi, Giảm chi, Tăng thu, Giảm thu**.
- Giữ nguyên toàn bộ logic tài chính, dữ liệu và RPC của V4.5.5.

## Thay đổi chính
1. `components/spending-period-card.tsx`:
   - Thêm icon trước dòng chênh lệch.
   - Tăng/giảm dùng icon khác nhau để người dùng nhận biết ngay cả khi đọc lướt.
   - Trạng thái không đổi dùng icon trung tính.
   - Trạng thái `Mới phát sinh` vẫn hiển thị icon tăng vì có phát sinh mới so với kỳ trước bằng 0.
2. Cập nhật version app thành `4.5.6` và release name `Comparison Direction Icons`.
3. Bổ sung kiểm thử hiển thị icon và cập nhật release docs.

## Migration / Database
- **Không có migration mới cho V4.5.6.**
- Nếu môi trường chưa áp dụng V4.5.5 thì vẫn phải chạy migration:
  - `supabase/migrations/20261117110000_financial_comparison_clarity_v455.sql`
  - hoặc file TXT/SQL migration V4.5.5 đã bàn giao.

## Kiểm tra nhanh sau deploy
1. Mở Dashboard ở cả 3 card: Ngày, Tháng, Năm.
2. Bật/tắt Chi/Thu.
3. Xác nhận trước nội dung biến động có icon phù hợp:
   - Tăng chi → icon tăng
   - Giảm chi → icon giảm
   - Tăng thu → icon tăng
   - Giảm thu → icon giảm
4. Kỳ trước = 0, kỳ hiện tại > 0: hiển thị `Mới phát sinh` và vẫn có icon tăng.
5. Hai kỳ bằng nhau: hiển thị trạng thái trung tính.

## Ghi chú
- Bản này chỉ tinh chỉnh UX hiển thị, không đổi schema và không đổi nghiệp vụ tài chính đã chốt ở V4.5.5.
