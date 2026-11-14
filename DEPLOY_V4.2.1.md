# Finzaro V4.2.1 — React Error Boundary & Release Gate Hotfix

## Symptom / nguyên nhân

Vercel `npm run check` dừng ở bước ESLint trong V4.2.0:

- `app/(dashboard)/overview/page.tsx`: `react-hooks/error-boundaries` báo nhiều lần vì JSX cây Dashboard nằm trong `try/catch`.
- `app/(dashboard)/reports/page.tsx`: `FastReportOverview` và JSX thông báo lỗi được tạo trong `try/catch`.
- Hai cảnh báo: ref cleanup của chart và biến chưa dùng trong test.

JSX trong `try/catch` không bắt được lỗi render của React (việc render xảy ra sau đó); chỉ nên dùng `try/catch` cho `await loadDashboardSnapshot(...)` hoặc `await loadPeriodSnapshot(...)`.

## Fix

1. `OverviewDashboard`: giới hạn `try/catch` cho việc lấy ngữ cảnh và gọi `loadDashboardSnapshot`; UI chính và fallback `role=alert` nằm ngoài `try/catch`.
2. `ReportsPage`: giới hạn `try/catch` cho `loadPeriodSnapshot`; chuyển JSX của báo cáo và fallback ra bên ngoài.
3. `CashflowChart`: capture `expandRef.current` tại thời điểm effect được tạo, dùng biến capture khi cleanup.
4. Xóa biến chưa dùng trong kiểm thử splash V4.0.3.
5. `package.json`, `lib/app-version.ts` và test metadata cập nhật thành `4.2.1`, bổ sung bốn bài regression AST/Release Gate.

Không bỏ rule ESLint, không thay đổi `npm run check`. Không sửa các hàm Thu/Chi/Ròng, cache, UI của chart hoặc database.

## Migration

**V4.2.1 không có SQL migration mới.** Nếu chưa áp dụng SQL V4.2.0, cần chạy migration V4.2.0 theo `DEPLOY_V4.2.0.md` trên staging trước khi chuyển production; không chạy lại toàn bộ SQL lịch sử.

## Deployment

1. Sao lưu source/ghi nhận commit production hiện tại.
2. Thay trọn bộ source V4.2.0 bằng source V4.2.1 trong ZIP; xác nhận `package.json` phiên bản `4.2.1`.
3. Push GitHub. Vercel build trên commit mới (nếu gặp cache cũ: redeploy without build cache).
4. Xác nhận lần lượt `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. Không bỏ bước hoặc tắt chặn lỗi.
5. QA thủ công trên staging: Dashboard ba card chi tiêu, biểu đồ 5 mốc và modal; Báo cáo Thu/Chi theo tháng/năm; mở chi tiết danh mục; logout/login/PWA.
6. Chỉ xác nhận release hoàn thành khi Vercel qua đủ toàn bộ build và QA staging.

## Local verification

- `node --test tests/*.test.mjs`: **221/221 PASS**.
- `node scripts/check-release.mjs`: **PASS** (6 modules, 149 source, 360 local imports).
- TypeScript transpile syntax for 149 TS/TSX/JS/MJS sources: **PASS**.
- CSS token parse: **PASS**.
- 93/93 SQL files SHA256 identical to user-provided V4.2.0.
- ZIP CRC and structure: verify before hand-off.

**Limit:** complete `npm run lint`, full semantic typecheck and Next.js production build could not run here; npm package installation timed out. These gates are required in CI/Vercel.

## Rollback

If deployment or staging validation fails, revert to the last known working Git commit/source; V4.2.1 has no DB changes to roll back. The required V4.2.0 database migration is managed separately.
