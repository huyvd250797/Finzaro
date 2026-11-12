# Finzaro V4.0.2 — Mobile Viewport Hard Lock & Keyboard Focus Hotfix

**Cơ sở:** Source ZIP V4.0.1 do người dùng cung cấp. **Phạm vi:** sửa UI/UX cho Safari/PWA iPhone, không thay đổi nghiệp vụ, Supabase, số dư hay schema.

## Nguyên nhân gốc

1. V4.0.1 có `components/mobile-nav.tsx` tính `--fin-mobile-nav-bottom` bằng `window.innerHeight - visualViewport.offsetTop - visualViewport.height`. Khi kéo quá cuối danh sách, mở/đóng bàn phím, cập nhật server action hoặc thay đổi thanh công cụ Safari, `VisualViewport` phát sự kiện `scroll/resize` với giá trị nhất thời. CSS taskbar dùng giá trị này nên **bị đẩy lên và có thể giữ nguyên khoảng hở** phía dưới.
2. Trang dashboard dùng document làm vùng cuộn chính. Trên iOS, kéo quá điểm cuối có thể gây elastic/rubber-band overscroll cho trang chứa thanh điều hướng.
3. BottomSheet còn đồng bộ `top/height` với VisualViewport **kể cả lúc không có bàn phím**, nên thanh Hủy/Lưu có thể dao động theo hiện tượng overscroll; ô nhập Nội dung chưa có cơ chế luôn tự đưa vào vùng nhìn thấy sau khi bàn phím đã mở xong.

## Thay đổi trong V4.0.2

- **Taskbar hard fixed:** `position: fixed; bottom: 0 !important; inset-block-end: 0 !important`. Không còn bất kỳ biến `--fin-mobile-nav-bottom` hay phép đo scroll nào dùng để dịch taskbar. Taskbar vẫn portal ra `document.body`, tách khỏi transform/animation của các trang.
- **Cô lập vùng cuộn:** ở mobile/tablet <= 1023 px, `<html>/<body>` không cuộn và `fin-app-shell` có `height: 100dvh; overflow: hidden`. `#fin-main-content` là vùng cuộn riêng, có `overscroll-behavior-y: none`; header và taskbar nằm ngoài vùng này. Có khoảng đệm cuối danh sách để giao dịch không bị taskbar che.
- **Giữ vị trí khi chuyển trang:** `NavigationMemory` nay lưu/khôi phục `main.scrollTop` trên mobile; desktop vẫn dùng `window.scrollY`. Không kéo cửa sổ chính đi theo dữ liệu vừa thay đổi.
- **BottomSheet fixed footer:** tiếp tục giữ `fin-sheet-action-slot` là **flex sibling** của `fin-sheet-scroll`. Chặn scroll chaining/overscroll ở nội dung sheet. Hủy/Lưu, Copy, form tài khoản/danh mục và Xong máy tính không nằm trong vùng cuộn.
- **Keyboard-aware focus:** chỉ áp dụng điều chỉnh `VisualViewport.top/height` cho sheet khi vùng hiển thị thực sự thu nhỏ bởi bàn phím **và** người dùng đang focus ô nhập. Khi bàn phím không mở, bỏ inline style, để CSS `100dvh` cố định sheet. Khi focus Nội dung/Ghi chú, sau sự kiện `focusin` và trong/đến cuối chuyển động bàn phím, tự cuộn vùng nội dung sheet để ô nhập và nhãn liên quan nằm phía trên thanh Hủy/Lưu.
- **Không thay đổi:** splash, keypad 114%, copy batch RPC, danh mục 4 dòng, Thu/Chi/Chuyển, 6 module, data Supabase, Light/Dark, các migration.

## Bước deploy

1. Sao lưu source đang chạy, đẩy nguyên source V4.0.2 lên staging/GitHub, không chạy SQL mới.
2. Dùng Node 22.x / npm 10.x, cài dependencies (`npm install --no-audit --no-fund`; source không có package-lock.json) rồi chạy `npm run check`. **Chỉ deploy production khi typecheck/build không lỗi.**
3. Kiểm thử **Safari iPhone qua browser và PWA Home Screen**. Truy cập Giao dịch, vuốt tới đáy rồi **tiếp tục kéo xuống nhiều lần**: taskbar không được nhích khỏi đáy, kể cả khi có save/delete và sau `router.refresh()`.
4. Mở Thêm giao dịch → Chi/Thu/Chuyển. Cuộn từ đầu đến đáy, kéo thêm: Hủy/Lưu không trôi. Chạm **Nội dung giao dịch**, bàn phím mở thì input và chữ đang gõ phải hiện rõ, phía trên thanh thao tác; thử tiếp Ghi chú/Ngày giao dịch. Lặp lại cho Copy, form Tài khoản/Danh mục và máy tính tiền.
5. Thử tại màn 320×568, 390×844 và màn thấp (~420px), cả Light/Dark, khi thay đổi orientation và khi mất mạng.
6. Sau deploy, kiểm tra `/api/version` hiển thị **4.0.2**. Nếu iPhone vẫn dùng V4.0.1 thì cập nhật/reload PWA (tránh service worker cache cũ); sau đó thử lại.
7. Nếu có lỗi, rollback frontend về V4.0.1; không có migration cần hoàn tác.

## Kiểm tra tại môi trường đóng gói

- 166/166 automated source tests, gồm 5 regression mới về taskbar, vùng cuộn, focused input.
- Chromium **HTML/CSS fixture**, không phải app Next.js đầy đủ: 390×844, 320×568, 390×420; cố định taskbar sau scroll/overscroll/mutation và footer tại đáy sheet; mô phỏng thu hẹp viewport, gọi đúng helper reveal để kiểm tra ô Nội dung được nhìn thấy.
- `node scripts/check-release.mjs`: PASS, 6 module.
- Transpile kiểm tra cú pháp toàn bộ nguồn và so sánh SHA-256 91/91 SQL với ZIP V4.0.1 được cung cấp (xem `docs/V4.0.2_QA.md`).

**Chưa xác nhận:** Next.js production build, ESLint/typecheck đầy đủ, server action với Supabase thật và Safari iOS/PWA thật vì môi trường đóng gói không có đầy đủ dependencies/máy iPhone. Không đánh đồng kiểm thử source/fixture với nghiệm thu production.
