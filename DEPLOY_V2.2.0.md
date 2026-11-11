# Finzaro V2.2.0 — Performance, Premium Design & Fluid Transactions

**Bản nâng cấp gộp:** V2.0.4 + V2.1.0 + V2.2.0, phát hành một ZIP từ source V2.0.3. Không deploy ba bản trung gian.

## 1. Thay đổi

### V2.0.4 — Performance & Stability Foundation
- Splash chờ tối đa đến sau hai frame của hydration thay vì ép giữ 650 ms; tránh cản thao tác khi đã sẵn sàng.
- Bộ chẩn đoán trình duyệt chỉ chạy nếu đặt `NEXT_PUBLIC_FINZARO_PERF_DEBUG=1`; ghi nhận LCP, layout-shift tích lũy và event duration lớn nhất. Log trên browser console, chỉ gồm tên **nhóm route đã whitelist** và chỉ số; không gửi về máy chủ hoặc bên thứ ba. *Event duration không đồng nghĩa chính xác với INP.*
- Bộ gộp dòng tiền 6 tháng xử lý một lượt giao dịch (O(N+M)) thay vì 6 lần quét, giữ nguyên phân biệt tiền tệ và loại giao dịch tiêu chuẩn.
- Khi lọc Giao dịch theo loại/danh mục, điều kiện được áp dụng ngay trong query Supabase trước khi giới hạn kết quả; các bộ lọc tìm chuỗi/nội dung hoặc tài khoản vẫn áp dụng trong danh sách giao dịch được tải.
- Thanh tiến trình điều hướng không kích hoạt khi bấm URL hiện tại và có tự đóng an toàn nếu việc điều hướng bị hủy.
- Có script `npm run benchmark:ledger` tạo 1.000 / 5.000 / 10.000 giao dịch **giả** để đo thời gian tổng hợp và đối chiếu với thuật toán baseline. Không đọc tài chính thật.

### V2.1.0 — Premium Fintech Design System
- Semantic tokens mới cho surface, text, border, income, expense, transfer, shadow, spacing trong Light/Dark; giữ nhận diện Finzaro xanh ngọc.
- Thống nhất bề mặt card, input, button, bộ lọc, sidebar, top bar, tab bar, overlay/bottom sheet và khung nội dung cho sáu module; responsive desktop/mobile.
- Thống nhất trạng thái hover/focus, targets phù hợp thiết bị cảm ứng và `prefers-reduced-motion`.

### V2.2.0 — Fluid Navigation & Transaction UX
- Prefetch 6 màn hình sidebar và tab chính trên mobile; làm nổi bật mục đang mở với `aria-current` và dấu chỉ thị.
- Form giao dịch mở theo nhu cầu, chỉ khởi tạo form loại giao dịch khi truy cập lần đầu. Khi chuyển Thu ⇄ Chi ⇄ Chuyển trong cùng sheet, form đã mở được giữ mounted/ẩn để bảo toàn dữ liệu nhập dở.
- Tab Thu/Chi/Chuyển hỗ trợ bàn phím ←/→ và ARIA tab semantics; bộ chọn danh mục hỗ trợ điều hướng bằng ↑/↓/←/→, Home, End.
- Tìm giao dịch từ thanh header mở sẵn bộ lọc, không cần thêm bước. Giữ phản hồi đang lưu/chống submit lặp của các action hiện có.
- Loại bỏ giới hạn thao tác `pan-y` ở `body` để các vùng cuộn ngang của lịch hoạt động mà không làm kẹt cuộn dọc.

## 2. Phạm vi và an toàn dữ liệu
- Vẫn 6 module: Tổng quan, Giao dịch, Tài khoản & Ví, Danh mục, Báo cáo & Lịch, Cài đặt.
- Giữ RPC giao dịch nguyên tử V1.2.0; không sửa SQL, không migration DB, không reset bảng, không thay đổi authentication/Supabase env.
- Giao dịch Chuyển không cộng vào Thu/Chi; số dư nhiều tiền tệ không được tự gộp.
- Bản này **không** bao gồm Báo cáo 2.0 (dự kiến V2.3.0) hay các module tài chính nâng cao đã ngừng hỗ trợ.

## 3. Cài đặt & kiểm tra phát hành
1. Sao lưu phiên bản ZIP/repo và xuất snapshot đọc-only số dư, giao dịch trước deploy.
2. Giữ nguyên `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` đang hoạt động. **Không** cấu hình `NEXT_PUBLIC_FINZARO_PERF_DEBUG=1` ở production thường xuyên; chỉ bật staging khi phân tích.
3. Dùng Node 22 và npm 10. Chạy `npm install --no-audit --no-fund`, `npm run release:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
4. Chạy `npm run benchmark:ledger` để kiểm tra CPU tổng hợp 1k/5k/10k; so sánh tốc độ với V2.0.3 nếu có cùng môi trường.
5. Deploy lên staging trước khi thay production; kiểm tra API `/api/version` trả `2.2.0`; kiểm tra PWA cập nhật được và tải lại giao diện mới.
6. Smoke test: mở app Splash, 6 module Light/Dark, điều hướng, chuyển 3 tab đang nhập dở, lưu Thu/Chi/Chuyển, điều hướng category bằng bàn phím, lịch cuộn dọc và vuốt ngang, lọc giao dịch, sao chép ngày nguồn/đích, group lịch sử, báo cáo cũ, archived accounts.
7. Đối chiếu số dư và giao dịch trước/sau theo từng tài khoản/đơn vị tiền. Nếu sai, rollback code về ZIP V2.0.3; không rollback/reset database vì bản này không đổi schema.

## 4. Xác minh và giới hạn
- `node scripts/check-release.mjs` và `node --test tests/*.test.mjs` chạy được mà không cài dependency (trừ benchmark).
- Production TypeScript lint/build bắt buộc chạy ở môi trường có dependency đầy đủ. Không được đánh dấu build pass nếu môi trường này chưa cài được npm modules.
- Chỉ benchmark CPU không thay thế đo LCP/INP/CLS thực tế trên Chrome/Edge và Safari iOS.
