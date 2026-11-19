# Finzaro V4.6.0 — Multi-Asset Portfolio

## Thứ tự triển khai
1. Sao lưu cơ sở dữ liệu. Chạy SQL trong `Finzaro-V4.6.0-Multi-Asset-Portfolio-Migration.txt` trên **Supabase SQL Editor** (hoặc migration cùng tên trong `supabase/migrations/`).
2. Deploy ZIP source trên Vercel. Xác nhận tài khoản đăng nhập nhìn thấy tab **Tài sản** ở Sidebar PC và menu **Thêm** trên mobile.
3. Tùy chọn cấu hình biến môi trường trên Vercel **chỉ phía server**: `SSI_CONSUMER_ID`, `SSI_CONSUMER_SECRET`; tùy chọn `COINGECKO_DEMO_API_KEY` để tăng độ ổn định tỷ giá USDT/VND. Cần API FastConnect Data do SSI cấp. Không đặt bí mật trong `NEXT_PUBLIC_*`.
4. Kiểm thử thêm vàng 12,3 chỉ -> hiển thị 1 cây 2 chỉ 3 phân; tạo MBB (cổ phiếu) và SOL (crypto); nhập giá vốn; thử bán một phần; nhập tỷ giá USDT/VND; tổng tài sản và lãi lỗ được đối chiếu.

## Nguồn giá
- **Vàng:** Nguồn PNJ tại `https://www.pnj.com.vn/site/gia-vang`; đọc giá mua vào công khai theo loại (nhẫn PNJ 9999/SJC), bộ đọc HTML có kiểm tra đơn vị và biên hợp lý. Website có thể đổi cấu trúc hoặc chặn request => **không bảo đảm tự cập nhật 100%**; khi lỗi hiển thị thiếu giá hoặc giá nhập thủ công ghi rõ nguồn. Vàng khác buộc nhập giá thủ công.
- **Cổ phiếu:** SSI FastConnect v2 `Market/AccessToken` + `Market/DailyStockPrice`, cần `SSI_CONSUMER_ID/SSI_CONSUMER_SECRET`. Khi không có credentials, hiển thị giá thủ công nếu được nhập, không giả giá realtime; lấy giá đóng cửa phiên gần nhất có sẵn trong cửa sổ 14 ngày.
- **Crypto:** Binance market-only REST `data-api.binance.vision/api/v3/ticker/price?symbol=...USDT` không cần API Key; tỷ giá USDT/VND ưu tiên CoinGecko public/demo endpoint khi hoạt động, nếu API không khả dụng thì dùng tỷ giá thủ công, nếu cả hai không có thì đánh dấu thiếu giá.
- Mọi request có timeout; không trả 0 khi lỗi giá. Giá, thời điểm và nguồn phải hiện bên cạnh vị thế. Không có kết nối giao dịch/thực thi lệnh.

## Dữ liệu & bảo mật
- 4 bảng riêng: `portfolio_positions_v460`, `portfolio_trades_v460`, `portfolio_fx_v460`, `portfolio_snapshots_v460`.
- RLS theo `auth.uid()`. Tạo/mua/bán/sửa vị thế qua SECURITY DEFINER RPC kiểm tra người dùng; mua/bán có row lock để tránh cạnh tranh cập nhật, lãi đã thực hiện khi bán dùng giá vốn bình quân.
- Giá vốn/quy đổi VND chỉ tính trên vị thế có quote và tỷ giá hợp lệ. Ký hiệu tổng có thể là **tạm tính** nếu nguồn giá thiếu.
- Tài sản đầu tư không khấu trừ tự động tiền mặt hoặc chuyển thành chi tiêu. Nếu nhập thêm tài sản đã được hạch toán trong tài khoản, người dùng cần tránh tính trùng bên ngoài module; dữ liệu `investment_assets` và `asset_valuations` cũ vẫn nguyên vẹn.
- Snapshot chỉ tạo theo yêu cầu; không suy diễn lịch sử trước khi lưu.

## Phạm vi chưa tự động hóa
- SSI không hoạt động tự động cho đến khi có thông tin truy cập thực và quyền phù hợp; PNJ không có API tự động công khai ổn định đã được xác nhận, parser HTML chỉ best-effort.
- Chưa tích hợp đồng bộ tài khoản chứng khoán/ví crypto, khớp lệnh, cổ tức, corporate actions, thuế tự động, hoàn tiền mua tài sản từ tài khoản, hay đảm bảo tỷ giá USDT/VND luôn có dữ liệu từ nguồn API.
- Cần kiểm thử integration với Supabase và production build trên Vercel sau khi có env/cơ sở dữ liệu thực.
