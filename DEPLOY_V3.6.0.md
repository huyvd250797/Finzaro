# Finzaro V3.6.0 — Fluid Motion & Navigation

## Phạm vi phát hành

Nâng cấp trực tiếp từ **V3.5.0**. Không bổ sung tính năng tài chính hoặc module mới; giữ 6 module, cấu trúc Supabase, các RPC Thu/Chi/Chuyển và Batch Copy. **Không cần SQL migration mới; không bổ sung npm dependency.**

### 1. Fluid Page Transitions
- `.fin-page-shell` xuất hiện bằng `transform` + `opacity` trong 180 ms; thanh progress chỉ hiển thị nếu điều hướng lâu hơn 180 ms. Tránh kéo dài splash vào các lần đổi tab trong ứng dụng.
- Không đổi đường dẫn báo cáo hoặc yêu cầu tải dữ liệu mới khi chuyển giữa Thu/Chi cùng kỳ.

### 2. Smart Navigation
- Lưu bộ lọc hiện thời của `/transactions`, `/reports` và `/reports/calendar` trong bộ nhớ của phiên dashboard, dùng lại khi bấm tab chính hoặc tab con Báo cáo.
- Lưu/khôi phục vị trí cuộn theo URL; hủy quá trình khôi phục ngay nếu người dùng tự cuộn. Không lưu số dư, giao dịch, token hoặc dữ liệu tài khoản vào localStorage/sessionStorage.
- Các query tạm như `copy`, `edit`, `new`, `message`, `error` không được tự khôi phục khi chuyển tab.

### 3. Micro-interactions và bàn phím nhập tiền
- Thống nhất pressed/focus cho các control. Máy tính số tiền phóng **14%** khi nhấn, duy trì tối thiểu gần 95 ms khi tap nhanh để nhìn thấy phản hồi; không render React chỉ để chạy animation.
- `prefers-reduced-motion: reduce` vô hiệu hóa chuyển động không thiết yếu và hiệu ứng phóng.

### 4. Bottom Sheet, Scroll và thao tác một tay
- Bottom sheet vẫn ở portal, phía trên bottom navigation, có `visualViewport` để tránh bàn phím iPhone che nút Lưu; vùng cuộn riêng và sticky footer V3.4.0 được giữ.
- Kéo xuống grip để đóng; kiểm tra khoảng cách/tốc độ, không đóng ngoài ý muốn khi pointer bị hủy.
- Không thể đóng hoặc chuyển tab nhập tiền trong khi nút Lưu đang `aria-busy=true`.
- Lịch vẫn hỗ trợ vuốt ngang thao tác và vuốt dọc cuộn trang tự nhiên.

### 5. Optimistic Transaction UX
- Danh sách giao dịch ẩn dòng khi bấm xác nhận xóa; server RPC `delete_simple_transaction_v120` vẫn là nguồn sự thật.
- Thành công: refresh dữ liệu từ server. Thất bại hoặc lỗi mạng: hiển thị lại dòng cũ, có thông báo lỗi.
- Các thao tác Lưu/Cập nhật hiển thị `aria-busy`, nhãn pending, không xác nhận thành công khi server chưa trả kết quả.

## Triển khai

1. Sao lưu source V3.5.0 và cấu hình deploy hiện tại. Không reset database và **không chạy lại migration**.
2. Giải nén ZIP V3.6.0, bảo toàn các biến môi trường đang hoạt động.
3. Với Node 22/npm 10 và truy cập npm registry, chạy:

   ```sh
   npm install
   npm run release:check
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```
4. Deploy lên môi trường staging, kiểm tra UAT theo `docs/V3.6.0_QA.md` trước khi thay bản production.
5. Kiểm tra iPhone Safari/PWA cả khi bàn phím ảo mở, Android Chrome, desktop Chrome/Edge, Light/Dark, cả mạng chậm.
6. Nếu xảy ra regression, rollback source V3.5.0; vì không có migration mới nên không cần rollback database. **Không rollback dữ liệu giao dịch** đã tạo trong thời gian chạy V3.6.0.

## Những giới hạn kiểm chứng tại môi trường đóng gói

- `node scripts/check-release.mjs`: đã kiểm tra scope 6 module, version, local imports.
- `node --test tests/*.test.mjs`: kiểm thử cấu trúc và hồi quy; không thay thế kiểm thử click thật trên Safari.
- TypeScript parse qua TypeScript compiler API và CSS parse qua PostCSS; **không tương đương full typecheck/build**.
- Không thể thực hiện `npm run lint`, `npm run typecheck`/`next build` hoàn chỉnh khi môi trường thiếu dependency Next/Supabase. Bắt buộc chạy trên CI/Vercel và sửa các lỗi nếu có trước khi phát hành production.
- Không thực hiện đo p95 mạng thực tế; trải nghiệm mượt phải đo trên thiết bị thật.

## Kiểm chứng nghiệp vụ

Không được thay đổi các số tiền trong báo cáo, bút toán chuyển tài khoản, phân loại Thu/Chi, số dư tài khoản, cách tính ngoại tệ hoặc tính an toàn Batch Copy.
