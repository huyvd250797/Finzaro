# Finzaro V3.2.1 — TypeScript Deploy Hotfix

## Lỗi khắc phục

- `app/(dashboard)/reports/page.tsx`: thay `Object.fromEntries(...) as Record<ReportFlowType, ReportFlowSnapshot>` bằng hàm tạo snapshot định kiểu và object có hai key `income`/`expense` tường minh. Áp dụng cùng nguyên tắc cho URL điều hướng kỳ để tránh lỗi TS2352 tương tự.
- `features/transactions/actions.ts`: xác thực phản hồi `unknown` từ `measureServerOperation()` trước khi đọc `.data`. Kiểm tra từng receipt trong RPC Batch Copy bằng type guard, số lượng và ngày đích không trùng.
- Tăng phiên bản source/app thành `3.2.1`, giữ nguyên các API/SQL V3.2.0 và 6 module. Không yêu cầu migration SQL mới so với V3.2.0.

## Kiểm tra trước deploy

1. Dùng trọn bộ source ZIP V3.2.1 (không copy riêng tệp lên repository cũ).
2. Xác nhận đã chạy migration Supabase V3.2.0 SQL FIX. Không chạy lại hoặc reset database chỉ vì hotfix TypeScript.
3. `npm install && npm run lint && npm run typecheck && npm run test && npm run build` trong môi trường mạng/CI có dependency.
4. Smoke test Thu/Chi tại Báo cáo, sao chép giao dịch 1/10 ngày, thử lại batch để xác nhận không tạo trùng.

## Trạng thái xác thực

Type guard và cấu trúc `Record` được sửa theo quy tắc TypeScript strict. Các kiểm thử source tự động được chạy trong môi trường đóng gói; nếu thiếu dependency npm thì chưa thể bảo đảm typecheck đầy đủ hoặc production build và phải kiểm tra trên CI/Vercel.

**Dependency/install note:** Tệp ZIP hiện không có `package-lock.json`, vì vậy sử dụng `npm install` (không dùng `npm ci` cho tới khi đã tạo và commit lockfile). Không thể chạy production build offline tại môi trường đóng gói do thiếu gói `@supabase/ssr` trong npm cache.
