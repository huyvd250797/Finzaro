# Finzaro V3.3.0 — Premium Visual Foundation

**Source baseline:** V3.2.1 (TypeScript Deploy Hotfix). **Release:** V3.3.0. Đây là bản nâng cấp UI/UX, không phải bản bổ sung chức năng tài chính mới.

## Thay đổi giao diện

- Xây dựng hệ token màu Light/Dark dùng chung: nền, bề mặt, chữ, viền, accent, trạng thái cảnh báo, bóng đổ, radius và nhịp chuyển động. CSS cuối `app/globals.css` giữ lớp token V3.3.0 có hiệu lực cao nhất.
- Font system-first (ưu tiên Inter khi máy đã có, sau đó SF Pro / Segoe UI / system-ui). Không tải Google Fonts, không thêm dependency hay tăng network latency chỉ để hiển thị chữ.
- Chuẩn hóa `Card`, `Button` (primary, secondary, ghost, danger), `Input`, `Select`, `Textarea`; nút bấm có hover, pressed, focus và disabled states.
- Nâng cấp visual của header, sidebar, mobile navigation, bottom sheet, auth shell. Không thay đổi cơ chế đóng/mở sheet, focus trap, Escape, scroll hay animation bàn phím nhập tiền.
- Trang Tổng quan được phân cấp bằng card số dư chính có gradient rất nhẹ, nhóm KPI và thẻ danh mục/biểu đồ; các KPI Báo cáo dùng một bề mặt thống nhất.
- Accessibility: skip-to-main link, kiểm tra tương phản các màu lõi, focus visible, hit target >= 44px, high contrast / reduced motion. Giữ các input mobile >= 16px để tránh iOS tự zoom.

## Bảo toàn nghiệp vụ

- Vẫn đúng 6 module: Tổng quan / Giao dịch / Tài khoản & ví / Danh mục / Báo cáo & lịch / Cài đặt.
- Không có thay đổi schema Supabase, không thêm migration SQL; giữ nguyên migration Batch Copy V3.2.0 đã sửa.
- Không thêm npm dependency. Không thay đổi nghiệp vụ hạch toán Thu/Chi/Chuyển, sao chép, lịch, biểu đồ và xuất báo cáo.
- Không thay đổi hoặc xóa 13 module tài chính cũ trong database; chỉ giữ các route của 6 module đang sử dụng.

## Triển khai

1. Sao lưu bản source đang vận hành trên GitHub và chụp ảnh màn hình so sánh của 6 module (PC và mobile; Light/Dark).
2. Giải nén ZIP V3.3.0, cập nhật source. **Nếu push bằng ZIP-overwrite**, giữ cơ chế `npm run source:sync` để không để lại các folder route cũ.
3. Nếu V3.2.1 chạy Batch Copy thành công thì không chạy SQL mới. Không xóa bảng hoặc dữ liệu Supabase.
4. Trên máy có kết nối npm registry, cài dependencies (source hiện không có package-lock), chạy `npm run release:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
5. Kiểm thử dashboard, form Thu/Chi/Chuyển, modal Copy, bộ lọc, xuất Excel/CSV/PDF, mobile bottom navigation và Splash trong hai theme trước khi deploy production.
6. Deploy staging, xác nhận dữ liệu tài chính, các luồng tương tác, screenshot regression và Lighthouse, sau đó mới triển khai production.

**Lưu ý giới hạn QA:** Trong môi trường đóng gói không có node_modules và npm registry/cache phù hợp, nên `lint`, `typecheck` đầy đủ và build Next.js production chưa được xác nhận. Chi tiết trong `docs/V3.3.0_QA.md`.
