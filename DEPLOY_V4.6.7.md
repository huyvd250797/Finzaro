# Finzaro V4.6.7 — Personal Lending & Borrowing Management

## Trước khi triển khai
1. Sao lưu Supabase Production. Đảm bảo migration trước đó đến `V4.6.6` đã được áp dụng.
2. Chạy **toàn bộ** file `supabase/migrations/20261121150000_personal_lending_borrowing_v467.sql` trong **Supabase SQL Editor**. Không sửa phần cũ của các migration.
3. Chỉ sau khi migration chạy thành công, push ZIP source V4.6.7 lên GitHub bằng Zipverra rồi deploy Vercel.
4. Chạy full quality gate `npm run check` trên môi trường có dependencies. Môi trường đóng gói có thể không có npm dependencies.

## Mô hình tiền
- **Người khác vay của tôi:** Cho vay trừ tiền tài khoản, cộng khoản phải thu. Thu hồi gốc cộng tiền tài khoản và giảm phải thu. Không ghi chi khi cho vay; không ghi thu khi thu gốc.
- **Tôi vay của người khác:** Nhận tiền cộng tài khoản, cộng khoản phải trả. Trả gốc trừ tài khoản, giảm phải trả. Không ghi thu khi vay; không ghi chi khi trả gốc.
- **Lãi:** Chỉ khi nhận hoặc trả thật mới ghi Thu nhập hoặc Chi tiêu tương ứng với danh mục hệ thống của chính tài khoản người dùng.
- **Nợ cũ:** Chỉ khai báo dư nợ hiện tại, không ghi tiền mặt lần nữa. Đừng nhập tổng nợ lịch sử nếu đã hoàn trả một phần; hãy nhập **gốc còn phải thu/trả** tại ngày ghi nhận.
- **Dữ liệu vay cũ:** Giữ nguyên, không tự động nhập lại vào V4.6.7.

## Bảo vệ dữ liệu và phạm vi
- Có 2 bảng mới: `personal_debts_v467` và `personal_debt_events_v467`, đều RLS chỉ đọc dữ liệu của chủ sở hữu, ghi qua RPC `SECURITY DEFINER` có kiểm tra `auth.uid()`.
- Gốc là giao dịch `transaction_type=transfer`, `transaction_purpose=personal_debt`; tiền gốc đi/đến tài khoản có bút toán ledger riêng nhưng **không vào các báo cáo Thu/Chi**.
- Các dòng tiền liên quan đến công nợ **không được sửa/xóa tại Lịch sử Thu/Chi thường**. Thực hiện theo nghiệp vụ trong Công nợ.
- Có khóa dòng khi phát sinh giao dịch, khóa số dư không đủ cho cho vay/trả nợ, kiểm tra thanh toán không vượt gốc còn nợ, và request key để tránh gửi trùng.
- Xóa chỉ được áp dụng cho khoản nợ cũ chưa phát sinh giao dịch; khoản đã có dòng tiền phải tất toán rồi lưu trữ để giữ audit trail.
- Không tự động thanh toán ngân hàng, không tính lãi dự kiến là tiền thực nhận. Lãi suất nhập vào chỉ dùng tham khảo.
- Giới hạn màn Công nợ hiện tại: tối đa 200 khoản nợ, 1.000 lịch sử; sẽ cảnh báo nếu vượt, không tính tổng thiếu dữ liệu.

## Nghiệm thu khuyến nghị
1. Tạo một khoản cho vay 10.000.000 ₫ từ ngân hàng và xác nhận ngân hàng giảm đúng, công nợ phải thu tăng 10 triệu; báo cáo Chi không tăng.
2. Thu lại 4.000.000 ₫ gốc và 200.000 ₫ lãi: ngân hàng tăng 4,2 triệu; phải thu còn 6 triệu; báo cáo Thu chỉ tăng 200.000 ₫.
3. Tạo khoản đi vay 5.000.000 ₫, nhận tiền vào ngân hàng; báo cáo Thu không đổi.
4. Trả 2.000.000 ₫ gốc + 100.000 ₫ lãi: ngân hàng giảm 2,1 triệu; còn phải trả 3 triệu; báo cáo Chi chỉ tăng 100.000 ₫.
5. Tạo khoản nợ cũ 3 triệu ở chế độ **Nợ cũ**, xác nhận ngân hàng không thay đổi.
6. Thử trả gốc vượt dư nợ / thiếu số dư / tài khoản sai chủ sở hữu, xác nhận không có thay đổi nửa chừng.
7. Thử gửi lại cùng `request_key`, xác nhận không tạo hai giao dịch.
8. Kiểm tra quỹ gia đình, thao tác sửa Thu/Chi, vuốt giao dịch và toàn bộ 7 module vẫn hoạt động.
