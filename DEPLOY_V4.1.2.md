# Finzaro V4.1.2 — Compact Reports & Instant Period Navigation

Nâng cấp từ **V4.1.1**. Phạm vi: **Báo cáo → Tổng quan**. Giữ nguyên sáu module, giao dịch, lịch, taskbar, Splash và nghiệp vụ tài chính.

## 1. Thay đổi

- Bỏ CTA **Phân tích nâng cao** ở đầu Báo cáo, bỏ card **Hiệu quả dòng tiền / Tỷ lệ giữ lại**. Tab **Phân tích** riêng vẫn tồn tại, không xóa chức năng đã có.
- Giữ ba KPI Thu, Chi, Ròng dưới bộ chọn kỳ, trình bày gọn hơn ở mobile.
- Chọn **Tháng / Năm** và mũi tên kỳ trước / kỳ sau bằng state phía trình duyệt; không yêu cầu Next Server Component tải lại toàn bộ sổ giao dịch khi đổi kỳ.
- Khi kỳ chưa có trong cache, gọi một endpoint chỉ trả về *tổng hợp danh mục + các cột ngày/tháng*, không trả danh sách giao dịch cá nhân; phần nội dung báo cáo có skeleton, các thanh điều hướng vẫn dùng được.
- Kỳ đã xem được cache tối đa 12 kỳ / 90 giây **trong tab hiện tại**; không dùng localStorage, không cache dữ liệu tài chính qua trình duyệt hoặc CDN. Khi Server Component được refresh do ghi dữ liệu, cache được khởi tạo lại.
- Phân tích sâu modal V4.1.1 vẫn giữ: chọn danh mục → modal toàn màn hình, chọn cột → chi tiết giao dịch theo kỳ. API chi tiết cũ giữ nguyên.

## 2. SQL migration — khuyến nghị áp dụng trước khi deploy

Tệp: `supabase/migrations/20261113160000_report_period_summary_v412.sql`.

**Thứ tự:**
1. Sao lưu Supabase và kiểm thử SQL trong staging.
2. Chạy toàn bộ SQL trong Supabase SQL Editor bằng role quản trị.
3. Xác nhận đã tạo `public.report_period_summary_v412(date,date,text,text)`; RPC chỉ cấp EXECUTE cho authenticated, lọc theo `auth.uid()` và `currency_code`, loại chuyển tiền/nhiệm vụ không chuẩn.
4. Deploy source V4.1.2 lên Vercel, chạy `npm run check` / `npm run build` trên môi trường có dependency đầy đủ.
5. Đăng nhập và đối chiếu kỳ tháng/năm trước/sau với V4.1.1, trên cả Thu và Chi. Kiểm tra ngày/tháng không phát sinh, tháng nhuận, nhiều tiền tệ, giao dịch có category bị xóa/không phân loại.

**Không reset DB, không sửa hoặc xóa giao dịch cũ.** Migration chỉ thêm hàm SQL trả dữ liệu tổng hợp, không thay đổi các bảng hiện có.

**Nếu chưa chạy SQL:** Ứng dụng vẫn có fallback qua `loadReportLedger`, nhưng lần mở kỳ mới sẽ chậm hơn. Phải chạy migration để đạt lợi ích lớn nhất trên kỳ chưa được cache.

## 3. Chỉ số kiểm thử hiệu năng thực tế

- Đo click-to-paint khi đổi kỳ trong DevTools bằng `sessionStorage.setItem('finzaro-perf','1')` → các log `reports.period.cached` và `reports.period.network` (không log số tiền).
- Trong Network tab: **kỳ đã cache không phát sinh GET `/api/reports/period-snapshot`**; kỳ mới thực hiện một GET endpoint này, không tải lại RSC `/reports`.
- Đối chiếu cả p50/p95 sau deploy; tốc độ thực tế phụ thuộc cấu hình Vercel, Supabase, network, kích thước dữ liệu.
- Khi mất kết nối, chỉ nội dung báo cáo báo lỗi và có **Thử lại**, không tự hiển thị số 0 giả.
- Sau thêm/sửa/xóa giao dịch, tải lại Báo cáo và kiểm tra tổng Thu/Chi/Ròng được cập nhật đúng.

## 4. Kiểm thử source và giới hạn môi trường

- `npm test`: 183/183 đạt (cũ 178 + 5 mới).
- `node scripts/check-release.mjs`: PASS.
- Cần chạy **typecheck/ESLint/production build** trên Vercel hoặc CI: môi trường đóng gói hiện không cài được `@supabase/ssr` từ npm offline cache.
- Chưa thực thi migration trên PostgreSQL staging/production; cần xác nhận trước khi deploy chính thức.
