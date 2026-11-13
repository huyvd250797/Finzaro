# Finzaro V4.1.3 — Period Snapshot TypeScript Deploy Fix

## Mục tiêu
Sửa hai lỗi `TS2345` trong `app/api/reports/period-snapshot/route.ts` xảy ra khi chạy `npm run build` trên Vercel.

### Nguyên nhân và cách sửa
- `const mode = condition ? "year" : "month"` suy luận biến `mode` là `string` khi khai báo, trong khi `snapshotFromSummaryRows()` và `snapshotFromTransactions()` yêu cầu `CategoryDrilldownMode = "month" | "year"`.
- Đã khai báo `const mode: CategoryDrilldownMode = ...` bằng type import từ module danh mục báo cáo.
- Đã thêm toán tử `satisfies Parameters<typeof snapshotFromSummaryRows>[1]` vào `args` để TypeScript bắt lỗi không tương thích ngay tại nơi tạo tham số, thay vì lỗi ở các lệnh gọi sau.
- Không dùng `as unknown`, không tắt strict TypeScript và không đổi cách tính dữ liệu.

## Triển khai
1. Sử dụng nguyên gói source V4.1.3 thay cho V4.1.2, đưa lên nhánh deploy của GitHub.
2. Đảm bảo các biến môi trường Supabase trên Vercel không đổi.
3. Nếu đã chạy migration `20261113160000_report_period_summary_v412.sql` ở V4.1.2 thì **không chạy lại SQL** chỉ vì bản vá này. Nếu chưa chạy, áp dụng theo hướng dẫn V4.1.2 trên staging trước, rồi production.
4. Trên môi trường có npm dependencies, chạy `npm install`, `npm run typecheck`, `npm test`, `npm run build`. Chỉ deploy production sau khi build thành công.
5. Kiểm thử Báo cáo → Tổng quan: Tháng/Năm, chuyển kỳ, Thu/Chi, mở modal danh mục, chọn cột để xem giao dịch.

## Phạm vi an toàn
- Không thay đổi database hoặc migration SQL.
- Giữ nguyên 6 module, dashboard, taskbar, form giao dịch, công thức tổng Thu/Chi và API báo cáo.
- Không thêm dependencies.

## QA trong môi trường bàn giao
- Các bài `npm test`, source release gate và kiểm tra loại TS `mode` của API.
- Đã chạy kiểm tra TypeScript độc lập cho tệp API với khai báo dependency rút gọn: file sau sửa không có TS2345; khi bỏ sửa, tái hiện đúng hai lỗi TS2345. Đây **không phải typecheck hay build Next.js toàn dự án**.
- Chưa xác nhận `npm run typecheck`/`npm run build` đầy đủ; môi trường cài dependency npm không hoàn tất.
