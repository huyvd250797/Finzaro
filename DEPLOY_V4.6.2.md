# Finzaro V4.6.2 — Automatic Market Price Sync

## Mục tiêu
Tự kiểm tra, định giá, đồng bộ giá vàng 9999, cổ phiếu Việt Nam và Crypto. Tách giá vốn khỏi giá thị trường. Không cần API key của PNJ / Vietcap / Binance đối với nguồn công khai; SSI FastConnect vẫn là **tùy chọn** nếu có credentials chính thức.

## Phạm vi đã thay đổi
1. **Vàng:** Bộ đọc bảng giá **https://giavang.pnj.com.vn/**, tìm đúng hàng **Nhẫn Trơn PNJ 999.9** hoặc **SJC vàng miếng** nếu PNJ công bố; đọc **giá mua vào**, xác định đơn vị VND/chỉ, từ chối dữ liệu không rõ nguồn/đơn vị. Nguồn là trang chính thức (HTML), không có API hỗ trợ được cam kết. Nếu PNJ không có giá SJC phù hợp thì báo thiếu giá / dùng giá dự phòng đã nhập, **không tự lấy giá nhẫn để định giá vàng miếng**.
2. **Chứng khoán:** nguồn mới `vci` qua `vnstock-js@2.0.0`, trả giá chuẩn VND/cổ phiếu. Provider cũ `ssi` được chuyển thành `vci` ở migration; SSI chỉ dùng nếu người dùng chủ động chọn SSI và cấu hình FastConnect.
3. **Crypto:** REST Binance Spot cho giá ban đầu + WebSocket Binance miniTicker cho các vị thế đang mở app. Định giá USDT→VND bằng tỷ giá từ nguồn có thể truy cập hoặc tỷ giá thủ công có nhãn. WebSocket có reconnect, tự dừng khi rời trang.
4. **Cập nhật tự động khi mở app:** Server Components tải cache giá chung, kiểm tra trực tiếp khi cache hết hạn. Trình duyệt dùng Supabase Realtime để nhận bảng giá mới, tự refresh khoảng 60 giây/lần khi đang hiển thị; thay đổi Binance được phản ánh trên danh mục hiện tại.
5. **Cập nhật khi đóng app:** endpoint riêng `POST /api/portfolio/market-sync` có Bearer secret, truy vấn mã công khai từ danh mục đang nắm giữ, kiểm tra quote và ghi vào `portfolio_market_quotes_v462` (không trả user data). Cần thiết lập lịch Supabase Cron **một lần**. Không chạy cron bằng JavaScript trong tab/PWA.
6. **Giá cũ và lỗi nguồn:** cache không bị xoá khi API thất bại, hiển thị rõ `Giá gần nhất` và thời điểm; không dùng giá vốn thay giá thị trường. Nếu chưa có giá nguồn, có thể dùng giá thủ công được gắn nhãn. Không trộn giá dự phòng giữa hai vị thế có cùng mã.

## Triển khai (bắt buộc thực hiện theo thứ tự)
1. **Sao lưu Supabase.** Đảm bảo đã áp dụng migrations V4.6.0 và V4.6.1.
2. **Chạy SQL:** `supabase/migrations/20261120135000_automatic_market_price_sync_v462.sql` (cùng nội dung file TXT bàn giao). Migration thêm bảng quote chung, RLS, Realtime và cho phép nguồn VCI cho mọi luồng thêm/sửa/khôi phục/lưu trữ tài sản; không sửa số lượng/giá vốn/giao dịch. Migration đổi `provider='ssi'` cũ thành `vci` (chỉ metadata nguồn thị trường).
3. **Deploy source ZIP lên Vercel.** Kiểm tra Node 22, npm 10, cài dependency mới `vnstock-js@2.0.0` khi cài npm. Không bỏ qua `npm run check`.
4. **Bật cập nhật khi không mở app (một lần):** Vercel → Settings → Environment Variables (Production, server only):
   - `SUPABASE_SERVICE_ROLE_KEY`: service-role credential đúng project Supabase; tuyệt đối không thêm `NEXT_PUBLIC_`. Dùng secret Vercel, không đẩy vào Git.
   - `MARKET_SYNC_SECRET`: giá trị ngẫu nhiên dài ít nhất 32 ký tự (dùng `openssl rand -hex 32`).
   - Giá vàng / chứng khoán công khai / Binance **không cần API key người dùng**.
   - Redeploy sau khi thêm biến môi trường.
5. **Supabase Vault:** tạo hai secret trong Vault UI (không dán giá trị bí mật vào SQL Editor lịch sử):
   - `finzaro_market_sync_url` = `https://<domain-app-thật>/api/portfolio/market-sync` (URL triển khai chính thức, gồm `/api/portfolio/market-sync`).
   - `finzaro_market_sync_secret` = đúng `MARKET_SYNC_SECRET` của Vercel.
6. **Supabase SQL Editor**: bật `pg_cron`/`pg_net` trong Extensions nếu chưa bật. Chạy đoạn SQL dưới đây sau khi đã tạo hai Vault secrets:

```sql
select cron.schedule(
  'finzaro-market-sync-v462',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='finzaro_market_sync_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='finzaro_market_sync_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
```

*Chú ý:* việc tạo cron **không tự thực hiện khi chạy migration**, vì dự án thực tế có URL và secret riêng. Chỉ đặt lịch sau khi URL và secret đã tồn tại và server đã deploy. Có thể kiểm tra `select jobname,schedule,active from cron.job where jobname='finzaro-market-sync-v462';`. Nếu muốn dừng: `select cron.unschedule('finzaro-market-sync-v462');`.

7. **Kiểm tra**: Cron log (Supabase Cron → Runs), chạy thử `POST` bằng curl với Authorization Bearer từ máy riêng; phản hồi chỉ chứa `checked, updated, failed`. Quan sát bảng `portfolio_market_quotes_v462` (không chứa thông tin người dùng). Kiểm thử trên iPhone khi app đang mở và khi mở lại sau vài phút; đóng cửa chứng khoán dùng giá gần nhất, không ghi `Live` giả.

## Giới hạn / an toàn
- **Không cam kết thời gian thực tuyệt đối** cho vàng hay cổ phiếu: PNJ là bảng HTML, Vietcap dùng nguồn công khai không có SLA tái phân phối; có thể bị chặn, đổi cấu trúc hoặc giới hạn tần suất. Cần xem xét điều khoản quyền sử dụng dữ liệu nếu sản phẩm kinh doanh.
- Giá Binance qua WebSocket khi trang đang mở. Khi đóng trang, server Cron dùng REST Spot theo chu kỳ, không duy trì WebSocket liên tục.
- Cron định giá tối đa 48 mã khác nhau mỗi lần chạy. Hệ thống trả lỗi rõ nếu danh mục vượt ngưỡng, không trả thành công giả và không bỏ sót âm thầm. Quy mô lớn cần triển khai tác vụ phân lô.
- **Giá thị trường không phải giá thực hiện lệnh**, không tính thuế/phí bán. Tổng tài sản thiếu tỷ giá/giá được đánh dấu tạm tính.
- **Chưa kiểm thử kết nối trực tiếp production với các nguồn**, chưa chạy Vercel full build hay Supabase migration thực tế trong môi trường đóng gói. Cần hoàn tất CI/deployment và kiểm thử integration thực tế.
