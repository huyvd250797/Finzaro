# Finzaro V4.6.1 — Asset Management UX & Edit

## Triển khai
1. Sao lưu Supabase, xác nhận migration V4.6.0 đã chạy.
2. Chạy **migration V4.6.1** từ file `Finzaro-V4.6.1-Asset-Management-UX-Edit-Migration.txt` hoặc `supabase/migrations/20261120070000_portfolio_asset_edit_v461.sql` trong Supabase SQL Editor.
3. Deploy ZIP source V4.6.1 lên Vercel; chạy full `npm run check` (ESLint, TypeScript, tests, Next build).
4. Kiểm tra trên iPhone: danh sách và card tài sản; lọc / tìm kiếm; mở/đóng form; bàn phím và footer; chỉnh tên, mã, loại vàng, giá vốn; mua/bán và khôi phục.

## Thay đổi UI/UX
- Tách 3 khu vực: tổng quan tài sản; danh mục với tìm kiếm/lọc; công cụ và lịch sử thu gọn.
- Nút `Sửa` riêng từng tài sản; form sửa có dữ liệu có sẵn, khối lượng/giá mua/phí của giao dịch đầu tiên.
- Thao tác Mua/Bán nằm trong bottom sheet riêng. Lưu trữ tài sản tại sheet Sửa hoặc Mua/Bán.
- Không đổi cơ chế dữ liệu giá PNJ, SSI, Binance, CoinGecko và không thêm nhà cung cấp mới.

## Tính đúng đắn khi sửa
- Sửa phần thông tin tài sản và **lần mua đầu tiên**, không sửa/xóa các lần mua/bán phát sinh sau.
- Migration tự phát lại lịch sử theo thứ tự thời gian; cập nhật lượng còn lại, giá vốn và lợi nhuận đã thực hiện.
- Nếu chỉnh số lượng dẫn đến một giao dịch bán có số lượng lớn hơn lượng đang có tại thời điểm bán thì từ chối toàn bộ thao tác.
- Snapshot lịch sử đã lưu không hồi tố; lịch sử vẫn ghi nhận số liệu tại thời điểm đã lưu.
- Tài sản đã lưu trữ có thể khôi phục rồi sửa; số lượng đã bán hết vẫn được giữ trong danh mục cho mục đích kiểm tra.

## Bảo mật & phụ thuộc
- RPC mới chỉ hoạt động với tài khoản đăng nhập; kiểm tra `auth.uid()`, lọc theo `user_id`, lock row, không cấp quyền UPDATE trực tiếp vào bảng vị thế / giao dịch.
- Chỉ gửi migration TXT khi cần chạy: V4.6.1 **có migration bắt buộc**.
- Nên kiểm tra staging thật với nhiều giao dịch mua/bán, các năm nhuận, giá vàng và FX thiếu.
