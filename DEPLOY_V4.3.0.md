# Finzaro V4.3.0 — One-Tap Transaction UX

## Thay đổi

1. **One-Tap Quick Add:** nút Thêm GD trên taskbar vào thẳng form loại giao dịch dùng gần nhất (mặc định Chi). Bộ ba Thu/Chi/Chuyển ở trang Giao dịch vẫn mở bottom sheet trong một lần chạm. Form giữ bản nháp khi chuyển tab.
2. **Smart Transaction Form:** nhớ tài khoản nguồn, tài khoản nhận và các danh mục đã chọn gần nhất, *chỉ sau khi server xác nhận lưu thành công*. Giá trị tài khoản/danh mục đã xóa hoặc lưu trữ sẽ bị bỏ qua khi tạo form mới.
3. **Instant Transaction Save:** server action trả trạng thái thành công/thất bại rõ ràng. Chỉ sau khi thành công mới đóng sheet, đồng bộ lựa chọn, làm mới React Server Components và các KPI/Báo cáo. Không giả cập nhật số dư client.
4. **Transaction Templates:** tạo/dùng/xóa tối đa 12 mẫu mỗi loại Thu/Chi/Chuyển, bao gồm tài khoản, danh mục, nội dung, tiền và ghi chú. Mẫu không tự gửi; người dùng phải kiểm tra và bấm Lưu. Mẫu được phân vùng theo UUID người dùng nhưng lưu trong **localStorage trên thiết bị**, **chưa đồng bộ giữa thiết bị**; xóa dữ liệu trình duyệt sẽ mất mẫu.
5. **Quick Edit & Duplicate:** Sửa mở dưới dạng bottom sheet thay vì form chen vào lịch sử, tiếp tục dùng update_simple_transaction_v120. Nhân bản tạo bản nháp prefill *ngày hiện tại*, không sửa giao dịch gốc. Nút Copy nhiều ngày cũ vẫn hoạt động riêng qua RPC batch idempotent.
6. **Intelligent Category Selection:** ô tìm danh mục (không dấu), chip danh mục chọn gần đây, vẫn giữ kéo-thả thứ tự khi chưa tìm kiếm.
7. **Mobile-First Bottom Sheet:** tiếp tục giữ scrollport riêng và footer cố định khi bàn phím iOS mở. Form sửa được portal hành động xuống footer của sheet.
8. **Transaction UX Performance:** đo tốc độ mở sheet qua `sessionStorage.setItem('finzaro-perf','1')`, lazy mount loại form, chặn double-tap khi chờ server, không tải full ledger cho Quick Add.

## Database / bảo mật

- **Không có SQL migration mới.** Giữ nguyên 93 file SQL của V4.2.2; RPC tạo/sửa/xóa hiện có giữ nguyên.
- Không ghi dữ liệu giao dịch vào localStorage trừ khi người dùng **chủ động tạo mẫu**. Lựa chọn mặc định lưu tối thiểu account/category IDs; không lưu số tiền ở preference sau thao tác lưu.
- Dữ liệu mẫu localStorage không mã hóa và chỉ nên dùng trên thiết bị cá nhân. Không sử dụng như bản sao lưu, dữ liệu tài chính thực tế nằm ở Supabase RLS.
- Chống nhấn lưu lặp trong cùng form và trạng thái pending; **không** khẳng định chống replay tuyệt đối giữa các thiết bị/tab nếu RPC cũ không hỗ trợ idempotency key.

## Deployment

1. Sao lưu, đẩy đầy đủ source `Finzaro-V4.3.0-One-Tap-Transaction-UX.zip` lên GitHub.
2. Chạy `npm install`, `npm run check` (lint → typecheck → test → build) trên môi trường đầy đủ dependencies trước khi phát hành.
3. Deploy commit mới lên Vercel, kiểm tra log hiển thị `finzaro@4.3.0` và đủ bốn giai đoạn.
4. QA trên iOS Safari/standalone PWA: tap FAB, đổi loại, bàn phím + máy tính số tiền, Save/error, mẫu, nhân bản, sửa, duplicate date/copy batch, cache số dư và Báo cáo.
5. Nếu Vercel báo lỗi, cung cấp đoạn **lỗi đầu tiên** tại đúng commit/version.

## Giới hạn kiểm chứng

Nếu không tải được npm dependencies tại môi trường đóng gói: các bài test Node/TypeScript cú pháp và kiểm tra source không thay thế được eslint/tsc toàn dự án hoặc Next production build. Chỉ xác nhận production-ready khi `npm run check` trên Vercel hoặc CI thành công.
