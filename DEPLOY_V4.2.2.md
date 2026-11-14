# Finzaro V4.2.2 — Report RPC Type Safety & Deploy Hotfix

## Triệu chứng

Deployment trên Vercel của **V4.2.1** (`dc727cf`) đã qua `npm run lint`, nhưng dừng tại `tsc --noEmit` với sáu lỗi **TS18046** trong `features/reports/load-period-snapshot.ts`, dòng 35–38: `summaryResult is of type 'unknown'`.

## Nguyên nhân

RPC tùy chọn `report_period_summary_v412` chưa xuất hiện trong `lib/supabase/database.types.ts` của source hiện tại; lời gọi RPC qua adapter động và `measureServerOperation` khiến TypeScript suy luận kết quả là `unknown`. Không được đọc `.error`/`.data` trước khi kiểm tra giá trị.

## Bản sửa

- Định nghĩa `ReportSummaryRpcResult` và `isReportSummaryRpcResult(value: unknown)` để kiểm tra envelope `data`, `error`, `error.code`, `error.message` khi chạy.
- Chỉ sau khi kiểm tra đúng kiểu mới đọc và xử lý phản hồi RPC. Nếu phản hồi sai cấu trúc, báo lỗi thay vì báo cáo số 0 giả.
- Giữ nguyên đối soát `reconcilePeriodSnapshot` và các nhánh fallback **chỉ** cho lỗi `42883` hoặc `PGRST202` khi function chưa tồn tại.
- Không đổi nguồn dữ liệu hoặc phép tính, không thay đổi các UI Dashboard, chart, card chi tiêu, logic Thu/Chi hay cơ chế cache.
- Bump phiên bản lên **4.2.2**, cập nhật các assertion theo metadata phát hành và bổ sung kiểm thử type guard.

## SQL / Environment

- **Không có migration mới cho V4.2.2.** Giữ nguyên 93 tệp SQL từ V4.2.1, gồm migration V4.2.0.
- Nếu môi trường chưa cài V4.1.2/V4.2.0 migrations, áp dụng các migration còn thiếu theo tài liệu phát hành tương ứng, sau khi kiểm tra staging/backup. Không reset hoặc ghi đè dữ liệu giao dịch.
- Không thay đổi Environment Variables hoặc dependency.

## Bàn giao và triển khai

1. Lưu backup commit đang chạy. Dùng **toàn bộ source V4.2.2** trong ZIP để cập nhật nhánh GitHub deploy.
2. Xác nhận `package.json` và `lib/app-version.ts` đều là **4.2.2**, Vercel phải build đúng commit mới chứ không phải `dc727cf`.
3. Chạy lần lượt `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` hoặc `npm run check` với Node.js 22.x và npm 10.x; giữ mọi gate bắt buộc.
4. Khi build pass, kiểm thử Báo cáo → Tổng quan: chuyển tháng/năm, chuyển Thu/Chi, chọn danh mục/cột. Kiểm tra khi RPC có và chưa có, hiển thị lỗi khi Supabase từ chối.
5. Chỉ đánh dấu production-ready sau khi CI/Vercel qua đủ các bước và dữ liệu được đối soát tại staging.

## Kết quả kiểm chứng trong môi trường đóng gói

- Bộ Node tests bao gồm strict-TypeScript fixture và mô phỏng RPC; xem `docs/V4.2.2_QA.md`.
- **Không thể chạy full Next.js typecheck/lint/build tại đây:** npm registry DNS `EAI_AGAIN` khi tải dependencies. Đừng suy ra deploy PASS từ test source.

## Rollback

Nếu V4.2.2 chưa đạt Release Gate, giữ production ở commit đã được xác nhận; rollback code về bản deploy hợp lệ trước đó. V4.2.2 không thay đổi SQL nên không cần rollback database riêng cho bản vá này.
