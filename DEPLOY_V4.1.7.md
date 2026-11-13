# Finzaro V4.1.7 — Portable Test Runner CI Hotfix

## Vấn đề Vercel ghi nhận

```
# tests 201
# pass 199
# fail 2
Error: Command "npm run check" exited with 1
```

Lỗi xảy ra ở `npm run test`, sau khi lint/typecheck đã chạy. Hai suite kiểm thử cũ nạp TypeScript từ đường dẫn global được tính bằng `process.execPath`, thay vì `require("typescript")` theo đúng package đã khai báo trong `devDependencies` của Finzaro.

- `tests/v412-compact-fast-periods.test.mjs` có **5 bài test**. Nếu file import thất bại, Node ghi **một lỗi suite** thay vì ghi 5 bài test đó.
- `tests/v413-report-period-typescript-hotfix.test.mjs` có **2 bài test**. Nếu file import thất bại, Node ghi **một lỗi suite** thay vì ghi 2 bài test đó.
- Vì vậy `206 - (5 + 2) + 2 = 201` khớp chính xác tổng Vercel báo cáo, với `199` thành công và `2` lỗi.

## Bản sửa

- Cả hai file dùng `const ts = require('typescript')` thông qua Node `createRequire(import.meta.url)`, trỏ tới dependency dự án thay vì thư mục cài Node toàn cục.
- Bổ sung `tests/v417-portable-test-runner.test.mjs` để chặn dùng lại đường dẫn Node hardcoded và xác minh TypeScript được resolve từ context hai suite.
- Nâng `package.json` và `lib/app-version.ts` lên **4.1.7**. Các assertions metadata trong test cũ được cập nhật để nhận phiên bản/tên bản phát hành mới. Không bỏ hoặc bỏ qua test.
- Giữ nguyên tính toán báo cáo, logic giao dịch, database, chính sách lint/typecheck và `vercel.json`.

## Xác minh lỗi và bản sửa

Đã **tái hiện chính xác** trên cùng ZIP nguồn V4.1.6 khi chạy bằng Node từ một đường dẫn không có global TypeScript:

| Test run | Tổng | Pass | Fail |
|---|---:|---:|---:|
| Trước sửa (Node path thay đổi) | 201 | 199 | 2 |
| Sau sửa (cùng Node path) | 209 | 209 | 0 |

Ba bài mới cũng kiểm tra 2 suite cũ và Release Quality Gate.

## Hướng dẫn triển khai

1. **Thay toàn bộ source V4.1.6 bằng source V4.1.7** trong ZIP, không trộn file với bản cũ. Kiểm tra `package.json` phiên bản `4.1.7`.
2. Đảm bảo cả hai file `tests/v412-compact-fast-periods.test.mjs`, `tests/v413-report-period-typescript-hotfix.test.mjs` được cập nhật và test mới `tests/v417-portable-test-runner.test.mjs` được commit.
3. Commit/push lên GitHub, redeploy Vercel từ commit mới, tốt nhất không dùng build cache của lần deploy lỗi.
4. Trên Vercel xác nhận đủ `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build`. Không đánh dấu production-ready nếu bất kỳ bước nào chưa PASS.
5. **Không có migration SQL mới** ở V4.1.7 và không có yêu cầu thay đổi Supabase hoặc Environment Variables. Các migration cũ phải được giữ nguyên.

## Lưu ý kiểm chứng

- Đã chạy Node unit/regression tests trong môi trường mô phỏng CI khác đường dẫn Node, kiểm tra cú pháp và release validation.
- Chưa chạy được production build Next.js với đầy đủ npm dependencies trong môi trường đóng gói. Việc Vercel có lỗi phát sinh ở bước `npm run build` hay không chỉ được khẳng định sau deploy.
