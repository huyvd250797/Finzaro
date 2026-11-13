# Finzaro V4.1.5 — Release Gate Lint Compatibility

## Vấn đề từ Vercel

V4.1.4 ban đầu chặn ở import `eslint/config` (ESLint 9.17.0 không export). Sau khi sửa import, lint chạy sâu hơn và báo **57 errors + 15 warnings**. Đây là các vấn đề có trước trong source nhưng bị che bởi lỗi cấu hình ban đầu; không phải 57 lỗi mới do logic tài chính phát sinh.

## Phạm vi sửa

1. **Giữ nguyên ESLint 9.17.0 / Next.js 16.4.6** và Flat Config tương thích. Không dùng `eslint/config`.
2. **React purity:** Loại bỏ log đo thời gian chỉ dùng trong development khỏi server render; chuyển phép đo tại event handler sang helper phù hợp; tránh `Date.now()` trong ref initializer.
3. **Cú pháp/ESLint:** Sửa `prefer-const`, unused vars, cleanup ref capture, biểu thức không có tác dụng, và đổi hướng khôi phục PWA sang router client.
4. **Supabase legacy adapters:** Giữ nguyên 22 vị trí ép kiểu tương thích schema, nhưng bắt buộc chỉ dẫn `eslint-disable-next-line` theo **từng dòng cụ thể**. `no-explicit-any` vẫn bật cho tất cả dòng khác.
5. **React Hooks legacy:** Tạm giới hạn hai quy tắc compiler (`set-state-in-effect`, `refs`) theo danh sách tệp được liệt kê **tường minh** trong `eslint.config.mjs` để giữ nguyên luồng đồng bộ form/modal, cache và thao tác trên iOS. Các rule này tiếp tục áp dụng cho tệp ngoài danh sách; cần refactor đầy đủ ở giai đoạn Production Hardening. Không tắt toàn bộ `react-hooks`.
6. **Test/benchmark fixtures:** Chỉ loại trừ rule Next.js `no-assign-module-variable` cho `tests/**/*.mjs` và `scripts/benchmark-ledger.mjs` vì những biến giả lập này không phải Next.js runtime.
7. **Bump version:** `package.json`, UI version và tests đều nâng lên **4.1.5**. Không thay SQL hoặc RPC tài chính.

## Hướng dẫn deploy

1. Giải nén ZIP V4.1.5, thay toàn bộ source V4.1.4 trên nhánh deploy; không giữ `eslint.config.mjs` cũ. Bảo đảm `package.json` là `4.1.5`.
2. Cài dependencies bằng Node.js 22: `npm install --no-audit --no-fund`.
3. Chạy `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` hoặc `npm run check` (bao gồm cả bốn bước).
4. Trong Vercel, giữ Build Command là `npm run check`. Khi sửa source ZIP trên GitHub, commit đủ các tệp thay đổi, sau đó redeploy, có thể chọn **Redeploy without build cache** nếu nghi code cũ còn trong cache.
5. **Không chạy SQL migration mới**. Migration `report_period_summary_v412` của V4.1.2 vẫn cần tồn tại trên DB nếu muốn fast path.
6. Nếu xuất hiện lỗi sau lint, cung cấp **phần log đầu tiên của bước mới thất bại** để đối chiếu; không bỏ qua typecheck hay Next production build.

## Tình trạng xác minh

- Node unit/regression tests: chạy được offline (xem `docs/V4.1.5_QA.md`).
- Script `node scripts/check-release.mjs`: đã chạy.
- TypeScript syntax transpile: đã kiểm tra bằng bản TypeScript global; **không thay thế typecheck**.
- `npm run lint` thực thi với `eslint-config-next`, `npm run typecheck`, production `npm run build`: **chưa thể chạy tại môi trường đóng gói** vì không truy cập được npm registry và thiếu dependencies.
- Do đó **chưa xác nhận deploy production PASS**, không cam kết hết tất cả lỗi typecheck/build ở phía Vercel.
