# Finzaro V3.5.0 — Premium Overview & Reports

## Phạm vi

Bản phát hành này thay đổi **UI/UX** tại Tổng quan, Báo cáo, Lịch tài chính và biểu đồ. Giữ nguyên 6 module và cơ chế hạch toán `Thu / Chi / Chuyển`, Batch Copy V3.2.x, giao dịch đang lưu và bản vá bottom sheet/nút Lưu trên iPhone ở V3.4.0.

**Không cần migration SQL mới.** Đã đối chiếu byte-for-byte toàn bộ **91 file `.sql`** trong ZIP gốc V3.4.0 với V3.5.0: không thay đổi. Không thêm npm dependency.

## Thay đổi đáng chú ý

1. Dashboard: hero số dư có diễn giải rõ phạm vi theo đồng tiền, chỉ số Thu/Chi/Ròng, top danh mục chi, dòng tiền, danh sách mới nhất.
2. Biểu đồ dòng tiền: sáu điểm/tháng chọn trên mobile và desktop; giá trị hiển thị theo đúng tiền tệ người dùng. Không request mạng khi chọn một tháng.
3. Biểu đồ cột: chọn kỳ với `aria-pressed`, thể hiện giá trị tại kỳ chọn; tương thích keyboard.
4. Donut: vòng tròn có nhãn trung tâm và vùng chọn danh mục, giữ link mở chi tiết.
5. Báo cáo: KPI từ thành phần dùng chung; thanh kỳ tháng/năm 44px; chuyển Thu/Chi trong cùng kỳ bằng dữ liệu đã tải, không request RSC khi chuyển.
6. Lịch: các trạng thái hôm nay, được chọn, có giao dịch; hiển thị 2 dòng Thu/Chi; vẫn hỗ trợ vuốt ngang Sửa/Xóa trong ngày và cuộn dọc trang tự nhiên; không prefetch ba form Thu/Chi/Chuyển ngay khi mở lịch.
7. Loading: skeleton riêng cho Overview, Reports, Calendar, Analysis, không thay đổi chiều cao bố cục bất ngờ khi tải và hỗ trợ Reduced Motion.
8. Theme: bổ sung màu vai trò tài chính riêng Light/Dark, focus/contrast cao.

## Hướng dẫn deploy an toàn

1. Sao lưu code/release V3.4.0 để có thể rollback; không chạy lại migration.
2. Giải nén ZIP V3.5.0, giữ nguyên biến môi trường Supabase của dự án.
3. Trên môi trường đủ Node 22/npm 10, chạy:

   ```sh
   npm install
   npm run release:check
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

4. Push lên GitHub hoặc deploy qua Vercel như quy trình hiện hành. Không copy thư mục `node_modules` hoặc `.next` từ máy khác.
5. Test thực tế iPhone Safari/PWA, Android Chrome, Chrome/Edge desktop và Light/Dark. Chi tiết trong `docs/V3.5.0_QA.md`.
6. Chỉ quảng bá production khi build + UAT thành công. Khi rollback, có thể deploy lại V3.4.0 mà không cần phục hồi DB vì không có migration ở V3.5.0.

## Kết quả kiểm tra trong môi trường đóng gói

- `node scripts/check-release.mjs`: **PASS** (6 module, 124 files TS/JS dưới app/components/features/lib/scripts).
- `node --test tests/*.test.mjs`: **140/140 PASS** (gồm 8 test của V3.5.0).
- TypeScript parser: **124 files, 0 syntax diagnostics** (không tương đương `tsc --noEmit`).
- PostCSS parser: **CSS parse OK**.
- Database source: **91/91 `.sql` unchanged**.
- Kiểm tra ZIP: dùng `zipfile.testzip` sau khi đóng gói.
- **Chưa chạy được `npm run lint`, `npm run typecheck`, `npm run build`:** npm offline cache không có `@supabase/ssr` nên không cài đủ dependencies. Cần bắt buộc chạy và sửa lỗi (nếu có) trên môi trường có npm registry trước khi deploy production.

## Những điểm không thay đổi

- Dữ liệu/SQL/RLS/Supabase, nghiệp vụ tài chính, đường dẫn API, logic tính tổng tiền.
- Không gộp ngoại tệ; không đưa chuyển khoản vào Thu/Chi.
- Không bổ sung lại các module tài chính nâng cao đã bỏ trước đó.
