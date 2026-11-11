# Finzaro V3.2.0 — Instant Reports & Fast Copy / Deployment

## Tổng quan

Bản phát hành gộp V3.1.0 + V3.2.0, nâng cấp từ V3.0.0. Giữ nguyên 6 phân hệ cơ bản, dữ liệu hiện có, chức năng biểu đồ, xuất báo cáo Excel/CSV/PDF và các RPC kế toán đã triển khai.

## Quan trọng: SQL migration BẮT BUỘC

**Không deploy V3.2.0 trước khi chạy migration ở môi trường Supabase đích.** Nếu không, chức năng Copy sẽ báo `PGRST202` vì RPC mới chưa được tạo.

Migration: `supabase/migrations/20261111180000_instant_copy_batch_v320.sql`.

Bước triển khai khuyến nghị:

1. Sao lưu và đánh giá phiên bản PostgreSQL/Supabase; xác nhận các migration cũ tới `20261110130000_simple_expense_management_v120.sql` đã chạy.
2. Chạy migration V3.2.0 trên **staging** bằng Supabase CLI (`supabase db push --linked`) hoặc SQL Editor, kiểm tra thành công. Không chạy lại toàn bộ migrations từ đầu trên production.
3. Kiểm thử RPC khi đăng nhập: Copy một ngày, Copy nhiều ngày; gửi lại cùng `source_id`+`dates` và xác nhận không tăng số giao dịch/số dư lần hai. Thử đồng thời hai request giống nhau và thử nguồn bị khóa/nguồn của user khác/nguồn chuyển tiền legacy.
4. Kiểm tra cân đối số dư của các ví trước/sau Copy; thử một ngày không hợp lệ về account/category để xác nhận batch rollback toàn bộ. Kiểm tra xóa giao dịch Copy và bảo toàn giao dịch gốc.
5. Sau khi staging đạt, áp dụng migration lên production bằng quy trình kiểm soát thay đổi; triển khai mã V3.2.0 lên Vercel/Netlify.
6. Ở môi trường có npm registry: chạy `npm install`, `npm run check` hoặc `npm run lint && npm run typecheck && npm run test && npm run build` trước khi phát hành. Kiểm tra PC/mobile và PWA installed app (đặc biệt cập nhật service worker).

## Thay đổi database

- Thêm bảng `public.simple_transaction_copy_receipts_v320` với ràng buộc `(user_id, source_transaction_id, destination_date)` duy nhất, FK tới nguồn/đích và RLS; không cấp quyền truy cập bảng trực tiếp cho client.
- Thêm RPC `public.copy_simple_transaction_batch_v320(uuid,date[])` chỉ cấp `EXECUTE` cho role `authenticated`, `SECURITY DEFINER`, `search_path=''`, xác thực `auth.uid()`, kiểm tra nguồn có quyền sở hữu, giữ nguyên giới hạn 20 ngày.
- RPC dùng `pg_advisory_xact_lock` để xử lý đồng thời theo user + nguồn, tái sử dụng receipt có sẵn; mỗi batch là một transaction PostgreSQL nguyên tử. Hàm gọi RPC kế toán hiện tại `create_simple_transaction_v120` để giữ nguyên validation/category/account/ledger.
- Không sửa dữ liệu cũ và không thay đổi cấu trúc bảng `transactions`, `transaction_entries`, `accounts` hay các hàm kế toán trước đó.

**Lưu ý giới hạn nghiệp vụ:** Một giao dịch gốc chỉ được tạo tối đa **một bản sao cho cùng một ngày đích**, kể cả sau khi tải lại trang. Nếu giao dịch đích bị xóa, receipt tương ứng cũng được xóa theo FK, từ đó cho phép tạo lại.

## Trải nghiệm / hiệu năng

- Báo cáo Thu/Chi: cùng một khoảng kỳ, cả hai snapshot được tổng hợp từ một lần tải server; đổi tab chỉ cập nhật React state và URL bằng `window.history.pushState` (không kích hoạt RSC fetch). Back/Forward giữ trạng thái. Các link tháng/năm/kỳ trước/kỳ sau được đồng bộ với loại Thu/Chi đang chọn.
- Prefetch các kỳ báo cáo **chỉ khi người dùng hover/focus**, không tải sẵn hàng loạt báo cáo tốn tài nguyên.
- Copy: từ danh sách giao dịch hoặc lịch mở `BottomSheet` ngay bằng metadata đã có, không điều hướng sang `/transactions?copy=...`. Server không tin metadata hiển thị; batch RPC xác thực lại nguồn và giá trị từ database. URL Copy trực tiếp vẫn hỗ trợ fallback và chỉ truy vấn một bản ghi nguồn.
- Splash khi khởi động: duy trì màn hình thương hiệu cho tới khi nội dung chính hiện diện; với `/overview` đợi số liệu cốt lõi, không dùng delay cố định 650ms. Có cơ chế fail-open 4 giây để không chặn màn hình lỗi và các route bất thường. Chuyển trang nội bộ không bật lại Splash.
- Các phép cập nhật/xóa/sao chép đều yêu cầu xác nhận server; `revalidatePath` khi batch tạo giao dịch mới thành công. Snapshot báo cáo tính lại ở lượt xem báo cáo tiếp theo, không giữ dữ liệu tài chính lỗi thời.

## Kiểm thử và tình trạng xác nhận

- `node --test tests/*.test.mjs`: kiểm thử regression + V3.2.0, bao gồm runtime mock của server action Copy.
- `node scripts/check-release.mjs`: xác nhận version, 6 module và import nội bộ.
- Chưa kiểm thử được live RPC trên Supabase thật, nhiều user đồng thời, build production hoặc E2E trên trình duyệt thực trong môi trường đóng gói này. Các bước này **bắt buộc thực hiện trên staging** trước khi production.
- Trong môi trường đóng gói hiện tại không cài được dependency offline (`@supabase/ssr` không có trong npm cache), vì vậy chưa xác nhận được ESLint/TypeScript typecheck đầy đủ và Next.js build.

## Rollback

Nếu phát sinh lỗi frontend, rollback bản deploy V3.0.0. **Không xóa** bảng receipt hoặc rollback giao dịch tài chính đã ghi. Migration là additive; các SQL/RPC V3.2.0 có thể tạm giữ cho tới khi có bản vá kế tiếp. Không chạy script reset database.
