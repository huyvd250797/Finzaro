# Finzaro V4.6.6 — Family Savings Fund Management

## Các thay đổi
- Quỹ tiết kiệm gia đình là tài khoản `family_savings` VND, được quản lý tại **Tài khoản & Ví**. Không dùng hoặc chuyển đổi loại `savings` cũ.
- Tạo quỹ, sửa mục tiêu, mức góp hằng tháng, kỳ hạn và lãi suất tham khảo. Số dư quỹ bắt đầu bằng **0 ₫**.
- Gửi/rút qua RPC nguyên tử: trừ tiền ở tài khoản nguồn, cộng tiền ở đích, ghi nhận **Chuyển tiền**, không tính vào Thu nhập hoặc Chi tiêu.
- **Số dư khả dụng** không bao gồm quỹ. **Tổng tiền quản lý** = số dư khả dụng + quỹ cùng tiền tệ.
- Lịch sử giao dịch trên mobile: vuốt trái để hiện **Sửa/Xóa**; menu dấu ba chấm giữ Nhân bản/Sao chép. Nhấn Xóa phải xác nhận.
- Sửa khoản thu/chi: giữ form khi có lỗi, thông báo nội bộ và nút `Đang cập nhật...` chống nhấn lặp.

## Thứ tự triển khai
1. Sao lưu database Supabase Production.
2. Kiểm tra đã chạy migration V4.6.0–V4.6.4 theo lịch sử triển khai hiện tại.
3. Chạy **toàn bộ** nội dung `supabase/migrations/20261120203000_family_savings_fund_v466.sql` trong SQL Editor.
4. Push ZIP source **V4.6.6** lên GitHub bằng Zipverra. Không cần xóa file thừa nếu V4.6.5 đã đồng bộ đầy đủ và không còn file cũ.
5. Xác nhận `npm run check` trên Vercel.
6. Tạo quỹ → gửi tiền → kiểm tra ngân hàng giảm đúng số tiền, quỹ tăng tương ứng, Thu/Chi không đổi; rút lại để đối chiếu.
7. Sửa khoản thu, thử nhập sai để xác nhận lỗi vẫn hiển thị trong form; thử bấm Lưu nhiều lần và kiểm tra không tạo giao dịch lặp.
8. Thử vuốt trái giao dịch trên iPhone; thử menu ba chấm và xóa có xác nhận.

## Cảnh báo
- Không nhập số dư ban đầu cho quỹ. Hãy chuyển tiền vào quỹ từ các tài khoản đang theo dõi để không nhân đôi tài sản.
- Lãi suất trong form chỉ là thông tin tham khảo, không tự phát sinh thu nhập hay tăng số dư quỹ.
- Quỹ hiện chỉ hỗ trợ VND và là tài khoản dành riêng trong phạm vi quản lý cá nhân. Không tích hợp ngân hàng để thực hiện chuyển tiền thật.
- Việc chuyển tiền qua Quỹ không phát sinh Thu/Chi, nhưng có thay đổi số dư khả dụng.
- Các migration cũ không được sửa hoặc xóa.
