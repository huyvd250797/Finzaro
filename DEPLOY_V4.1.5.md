# Finzaro V4.1.5 — ESLint Flat Config Deploy Hotfix

## Lỗi được xử lý

Vercel báo `ERR_PACKAGE_PATH_NOT_EXPORTED` khi thực hiện `npm run check` trong `eslint.config.mjs`, tại import `eslint/config`. Source V4.1.4 khóa `eslint@9.17.0` nhưng API `defineConfig` / `globalIgnores` từ `eslint/config` chỉ được giới thiệu ở ESLint 9.22.0.

## Thay đổi

- `eslint.config.mjs`: thay helper từ `eslint/config` bằng export mảng Flat Config và `{ ignores: [...] }` toàn cục theo chuẩn ESLint 9.17.0. Vẫn áp dụng `eslint-config-next/core-web-vitals` và `eslint-config-next/typescript`.
- Giữ nguyên `eslint@9.17.0`, `eslint-config-next@16.4.6`, Next 16.4.6, React, SQL, các giao dịch và hàm báo cáo. Không thêm dependency hay migration.
- Tăng phiên bản package và UI thành `4.1.5`, cập nhật tests và CHANGELOG.
- **Không bỏ qua lint hay bất cứ bước kiểm soát nào**; `vercel.json` tiếp tục chạy `npm run check`.

## Deploy

1. Sử dụng toàn bộ source V4.1.5 thay cho V4.1.4 trong GitHub. Xác nhận `eslint.config.mjs` đã được ghi đè đúng, không còn `from "eslint/config"`.
2. Trên staging dùng Node 22 / npm 10, cài dependency bằng `npm install --no-audit --no-fund` (không giữ cấu hình ESLint cũ khi merge source).
3. Chạy `npm run check` hoặc để Vercel chạy theo `vercel.json`. Phải hoàn tất lint, typecheck, tests và production build trước khi cho vào production.
4. Nếu Vercel báo lỗi mới ở bước lint/typecheck/build, xem toàn bộ log để xác định vấn đề thực tế; không chuyển sang `next build` trực tiếp để vượt gate.
5. Kiểm tra phiên bản hiển thị V4.1.5 và thử 3 bộ lọc báo cáo Thu / Chi / Tất cả. PWA nếu còn cache giao diện cũ thì cập nhật ứng dụng.

Không cần chạy SQL mới cho V4.1.5. Giữ các migration V3.2.0 và V4.1.2 đã được triển khai.

## QA và giới hạn

- Verified: 198/198 Node tests, `node --check eslint.config.mjs`, `scripts/check-release.mjs`, kiểm tra cú pháp source/CSS và ZIP integrity.
- Unverified: `npm run lint`, `npm run typecheck`, `npm run build` trong môi trường đầy đủ dependency, vì môi trường đóng gói thiếu package npm; chưa kiểm tra deploy trên Vercel của người dùng.

## Rollback

Có thể redeploy V4.1.4 nếu cần, nhưng lỗi import ESLint sẽ tái xuất hiện. Không cần rollback dữ liệu hoặc SQL vì bản vá không thay đổi schema.
