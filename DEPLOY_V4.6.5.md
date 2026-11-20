# Finzaro V4.6.5 — Portfolio Mobile Layout & Save Feedback

## Mục tiêu
- Tổng giá trị đầu tư chiếm trọn hàng riêng; nút Làm mới và Thêm tài sản ở hàng tiếp theo.
- Số tiền VND trong Tài sản và card Tổng quan luôn hiện theo dạng `580.195.827 ₫`, không tách ₫ thành dòng riêng. Số tiền rất dài sẽ có khả năng cuộn ngang thay vì bị cắt mà không báo hiệu.
- Card tài sản tối ưu lại bố cục Giá trị/Lãi lỗ cho thiết bị hẹp.
- Nút Lưu thay đổi / Thêm tài sản có spinner, hiện trạng thái đang xử lý, khóa nút trong thời gian server action chạy để hạn chế gửi trùng.

## Triển khai
1. Source nền V4.6.4. **Không có migration mới trong V4.6.5.** Nếu migration V4.6.4 đã chạy thì không cần chạy lại SQL.
2. Push source ZIP V4.6.5 lên repository bằng Zipverra (Push thông thường; không bắt buộc bật Xóa file thừa vì không xóa/đổi tên các file module cũ).
3. Đợi Vercel hoàn tất `npm run check` (ESLint → TypeScript → tests → Next build), xác nhận bản hiển thị V4.6.5.
4. Kiểm tra iPhone Light/Dark: Tổng tiền và ₫ đủ hiển thị, hai nút ở hàng riêng; giá trị/lãi lỗ trong các card có ₫ cùng dòng.
5. Thử sửa tài sản và nhấn Lưu thay đổi hai lần liên tiếp: phải hiện “Đang lưu thay đổi...”, spinner và disable trong khi đang chờ; chỉ một giao dịch gửi đi. Kiểm tra thêm tài sản tương tự.
6. Đối chiếu lại giá, số lượng, lịch sử mua/bán, xóa tài sản và Lưu thống kê hôm nay; không thay đổi nghiệp vụ/database.

## Phạm vi
Chỉ sửa source UI/UX. Giữ nguyên 34 migrations SQL đến V4.6.4; không cần TXT hoặc SQL migration V4.6.5.
