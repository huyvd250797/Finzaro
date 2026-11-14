# Finzaro V4.5.0 — Mobile Finance UX & Reporting Layout

**Baseline:** source ZIP V4.4.0 do người dùng cung cấp. **Phiên bản:** V4.5.0.

## Phạm vi thực hiện

1. **Sổ báo cáo → Thu/Chi theo danh mục và tài khoản:** giữ đúng 4 cột (Loại, Tên, Giá trị, %); dùng `table-layout: fixed` và tỷ lệ rộng cột phù hợp iPhone, cho tên danh mục và số tiền dài tự xuống dòng. Chỉ cuộn dọc, không ép bảng `min-width: 560px` như quy tắc bảng chung.
2. **Chi tiết giao dịch:** desktop vẫn dùng bảng 5 cột; mobile đổi sang các hàng dễ đọc với đủ Ngày, Nội dung, Danh mục, Thu và Chi, tránh kéo ngang để xem số tiền. Không thay đổi danh sách giao dịch/giới hạn 100 dòng, bộ lọc hay xuất Excel/CSV.
3. **Danh mục Thường dùng:** icon lấy từ `icon_name`, màu lấy từ `icon_color` qua `iconColorValue`, chip vẫn cuộn ngang một hàng. Không thêm danh mục mới và không thay đổi thao tác sắp xếp.
4. **Số dư khả dụng:** nút Eye/EyeOff bên cạnh số tiền. Mặc định hiện số dư; khi ẩn hiển thị đúng `*****`; trạng thái chỉ nằm trong component hiện tại, không lưu tài chính vào localStorage. Các KPI Thu/Chi/Ròng khác không bị thay đổi.
5. **Ba card Hôm nay, Tháng này, Năm nay:** có lựa chọn **Chi / Thu** ngay trong card, mặc định Chi. Mỗi chế độ có tổng số tiền, số khoản, danh mục, 5 giao dịch gần đây và đường dẫn "Xem tất cả" tới bộ lọc tương ứng. Tiền Thu và Chi sử dụng cùng chính sách giao dịch tiêu chuẩn, đúng mã tiền tệ, không cộng chuyển khoản, giao dịch khoản vay hay ngoại tệ khác.
6. **Splash:** cả splash React và `/pwa` đều dùng `/icons/finzaro-v0012-192.png`, trùng icon logo ở header và manifest; loại bỏ bản SVG splash cũ.

## Database — Có một migration mới

**File:** `supabase/migrations/20261114120000_dashboard_income_expense_v450.sql`.

- Tạo **mới**, không ghi đè hàm V4.2.0: `public.dashboard_snapshot_v450(p_currency text,p_today date)`.
- `security invoker`, xác thực `auth.uid()` và áp dụng `user_id = v_user` cho các bảng tài chính, chỉ cấp quyền execute cho `authenticated`.
- Thêm dữ liệu Thu + Chi theo **3 kỳ**, gồm danh mục và giao dịch gần đây; giữ thông tin biểu đồ, KPI, vị thế tiền khả dụng.
- **Read-only:** không `INSERT/UPDATE/DELETE` vào bảng nghiệp vụ; không thay đổi dữ liệu người dùng, cấu trúc bảng hay RLS.
- Cần tồn tại các migration cũ, đặc biệt V4.2.0. Tổng cộng **94 tệp SQL** (93 tệp cũ + 1 tệp mới), trong đó thư mục `supabase/migrations` có **27 migration** (26 cũ + 1 mới).
- Nếu migration V4.5.0 chưa tồn tại, Dashboard tải ledger qua đường tương thích để vẫn có số Thu/Chi; có thể chậm hơn. Lỗi DB khác thiếu RPC sẽ tiếp tục được báo lỗi, không hiển thị số 0 giả.

## Thứ tự triển khai

1. **Sao lưu Supabase**. Trên staging, kiểm tra các migration trước và chạy `20261114120000_dashboard_income_expense_v450.sql` bằng Supabase SQL Editor hoặc quy trình migration hiện có. Test với ít nhất 2 user để xác nhận quyền dữ liệu không bị lộ chéo.
2. Đối soát 3 mốc Thu/Chi với sổ giao dịch: ngày hiện tại, tháng hiện tại, năm hiện tại. Đối chiếu cả giao dịch ngày tương lai, chuyển tiền, khoản vay, ngoại tệ, danh mục thiếu id.
3. Áp dụng migration trên production sau khi staging đạt. **Không dùng `db reset`** trên production.
4. Cập nhật **toàn bộ source** V4.5.0 từ ZIP lên GitHub. Xác nhận `package.json` có version `4.5.0` và các thay đổi đã có trong commit mới.
5. Deploy Vercel với commit mới và kiểm tra log in `finzaro@4.5.0`. Giữ `npm run check` = `lint → typecheck → test → build`. Không bật các lựa chọn bỏ qua lỗi lint/TypeScript.
6. Trên iPhone Safari/PWA: kiểm tra bảng danh mục/tài khoản 4 cột, danh sách giao dịch mobile, chip Thường dùng có icon/màu, ẩn/hiện số dư, Thu/Chi ba card, splash sau cold start; kiểm tra tương tự ở PC.

## Kiểm tra đã thực hiện trong môi trường đóng gói

- **258/258 Node test PASS** (248 test cũ + 10 test hồi quy V4.5.0).
- **149 file TS/TSX** qua kiểm tra cú pháp TypeScript; stylesheet CSS không có lỗi parse.
- `node scripts/check-release.mjs`: PASS, đủ 6 module và import nội bộ được xác minh.
- `features/dashboard/snapshot.ts` chạy **strict TypeScript kiểm tra độc lập** với type stubs, PASS.
- Toàn bộ **93 tệp SQL gốc không bị sửa** (gồm 26 migration cũ); một migration SQL mới được bổ sung.
- ZIP kiểm tra CRC và kiểm tra tệp.

**Chưa xác nhận:** chạy ESLint, typecheck toàn bộ dự án, Next.js production build, quyền PostgreSQL/RLS trên DB thật và QA Safari iPhone thực tế. Môi trường không có `node_modules` và DNS tới npm registry trả `EAI_AGAIN`. Vercel phải xác nhận đủ Release Quality Gate trước khi dùng production.
