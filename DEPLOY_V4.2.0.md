# Finzaro V4.2.0 — Unified Fast Data Layer

Nâng cấp từ **V4.1.7**. Không xóa giao dịch, không tạo lại DB, giữ nguyên 6 module. **Có SQL migration bổ sung** và cần kiểm thử trước khi mở rộng production.

## Thay đổi chính

1. **Unified Dashboard:** `loadDashboardSnapshot()` lấy một kết quả tổng hợp được xác thực trên PostgreSQL: KPI tháng, số dư tiền mặt/ngân hàng/ví, chi tiêu hôm nay/tháng/năm, nhóm danh mục, 5 giao dịch gần đây theo mỗi kỳ và biến động 366 ngày; tải danh sách giao dịch gần nhất độc lập với giới hạn 8.
2. **Giao diện Dashboard:** Bỏ Phân bổ ngân sách; ba card Chi tiêu hôm nay/tháng này/năm nay, danh sách giao dịch mặc định đóng; chart Thu/Chi/Tài sản ròng* với 7 ngày, 1 tháng, 3 tháng, 6 tháng (mặc định), 1 năm; trục giá trị hai phía và modal toàn màn hình.
3. **Báo cáo:** cả lượt mở đầu và chuyển tháng/năm dùng cùng `loadPeriodSnapshot` và RPC `report_period_summary_v412` (cần đã triển khai từ V4.1.2). Bộ lọc chi tiết danh mục chạy truy vấn có mục tiêu; xem lại cột đã cache không phát sinh request. Prefetch hai cột nhỏ khi mở danh mục và một kỳ lân cận khi đủ điều kiện mạng.
4. **Hiệu năng:** giảm yêu cầu Supabase trùng, giới hạn truy vấn/lượng kết quả, thêm index lọc ngày, theo dõi p50/p95 server theo nhãn tĩnh nếu bật `FINZARO_PERF_LOG=1` trên staging. Bộ nhớ đệm của Reports chỉ tồn tại trong màn hình hiện tại, TTL 90 giây; server actions hiện hữu vẫn `revalidatePath` sau thay đổi giao dịch.
5. **Báo cáo → Phân tích:** bỏ tab/điều hướng và chuyển tuyến cũ về `/reports`; không xóa dữ liệu lịch sử.

> *Tài sản ròng*: Trong V4.2.0, đường màu xanh là **ước tính vị thế tiền mặt + ngân hàng + ví đang hoạt động trong một loại tiền**; chưa bao gồm chứng khoán, tài sản khác, công nợ và ngoại tệ khác. Không phải giá trị tài sản ròng kế toán đầy đủ. Không được dùng để đánh giá tổng tài sản/nợ của người dùng.

## SQL migration bắt buộc cho đường Dashboard nhanh

Tệp: `supabase/migrations/20261113193000_unified_fast_data_v420.sql`.

**Yêu cầu trước khi chạy:** Có đủ migrations Finzaro hiện hành, nhất là `report_period_summary_v412` cho đường tải nhanh Báo cáo. Sao lưu DB và kiểm thử trên staging. Migration V4.2.0 chỉ tạo `dashboard_snapshot_v420` và index `transactions_user_purpose_date_v420_idx`; không cập nhật/xóa dữ liệu giao dịch hoặc tài khoản. Hàm được định nghĩa `security invoker`, sử dụng `auth.uid()` và lọc `user_id` ở từng truy vấn.

Thao tác qua Supabase SQL Editor: đăng nhập đúng dự án staging → mở **SQL Editor** → dán nội dung migration → **Run** → thử `dashboard_snapshot_v420` dưới vai trò user đã xác thực (không test bằng service role thay cho user vì sẽ thiếu `auth.uid()`) → đối chiếu dữ liệu KPI/tháng/năm. Sau khi staging đạt, chạy trên production ngoài giờ cao điểm và theo dõi thời gian tạo index. Dùng `CREATE INDEX` có thể giữ khóa DDL ngắn; với dữ liệu lớn, đánh giá phương án tạo chỉ mục `CONCURRENTLY` riêng, ngoài transaction migration.

**Rollback SQL khi cần (không động tới dữ liệu):**

```sql
DROP FUNCTION IF EXISTS public.dashboard_snapshot_v420(text, date);
DROP INDEX IF EXISTS public.transactions_user_purpose_date_v420_idx;
```

Frontend khi chưa có hàm mới sẽ fallback về `loadReportLedger` có đối soát; tốc độ chậm hơn và bị giới hạn bởi kích thước lịch sử. Những lỗi kết nối/quyền/SQL khác **không** bị che bằng dữ liệu số 0. Không xóa migration lịch sử khi rollback; ghi migration đối ứng theo chuẩn quản trị DB.

## Build/deploy/quality

1. Sao lưu DB, chạy migration staging, xác minh phân quyền/RLS và số liệu.
2. Sử dụng **toàn bộ ZIP V4.2.0**, tránh chép chồng source cũ lên source mới. `package.json` phải ghi `4.2.0`.
3. Trên máy có npm registry và đúng Node 22: `npm install --no-audit --no-fund`, cấu hình biến môi trường theo `.env.example`; chạy `npm run check` (lint → typecheck → node tests → Next build) và `npm run release:check`.
4. Đẩy GitHub, tạo staging deployment trên Vercel. Không deploy production nếu Quality Gate chưa PASS.
5. Kiểm tra số liệu, iOS/PWA, cache, modal, mobile taskbar, điều hướng, thao tác thêm/sửa/xóa; sau đó mới deploy production.

### Smoke QA trọng điểm

- Tổng Thu, Chi, Ròng tháng trên Dashboard = Báo cáo tháng cùng tiền tệ/kỳ.
- Tổng chi từng ngày, tháng, năm = tổng các danh mục/giao dịch đúng phạm vi. Ngày khác 00:00 theo timezone cấu hình; tháng 2 nhuận; năm chuyển giao.
- Không đếm chuyển khoản giữa ví, giao dịch hoàn trả/đầu tư/nợ đặc biệt là Thu/Chi thông thường; VND và USD không cộng lẫn.
- Chart 7d/1m/3m/6m/1y, 6m mặc định; cả thu/chi và đường tài khoản xanh có trục tiền; mở full-screen và đóng X/Escape; phím Tab và bàn phím iPhone.
- Báo cáo tháng/năm lần đầu, đổi kỳ, cache, đổi Thu/Chi, chi tiết danh mục theo ngày/tháng, prefetch, trạng thái lỗi.
- Thêm/sửa/xóa/Copy giao dịch → Dashboard, Báo cáo, Lịch cập nhật (không stale); xem trên mobile, desktop; PWA có thể cần reload một lần sau khi thay đổi service worker.
- Dữ liệu tải lớn: so p50/p95 khi `FINZARO_PERF_LOG=1`; kiểm tra EXPLAIN ANALYZE cho hai RPC theo tài khoản thử nghiệm, không thu thập dữ liệu tài chính nhạy cảm vào log.

## Tình trạng xác minh tại lúc đóng gói

- `node --test tests/*.test.mjs`: **217/217 PASS** (sẽ cập nhật nếu đổi bài test).
- `node scripts/check-release.mjs`: **PASS**, 6 module.
- Kiểm tra cú pháp TypeScript/TSX độc lập và CSS parser: **PASS**.
- **Chưa** chạy full ESLint/typecheck/build Next.js vì môi trường đóng gói không cài được npm dependencies. **Chưa** kiểm thử trên Supabase thực hoặc Safari iPhone. Migration **chưa được thực thi** trên DB người dùng.
- V4.2.0 ở trạng thái **source candidate**, chưa đủ căn cứ để xác nhận production-ready.
