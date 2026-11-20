# Finzaro V4.6.2 — Market Price Reliability Deploy Hotfix

## Sự cố
Trên Vercel, `npm run check` đạt lint/typecheck nhưng `node --test` báo `tests/v462-market-price-reliability.test.mjs` thất bại trước khi chạy các ca kiểm thử. Nguyên nhân: bài test hard-code `/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript`, đường dẫn cục bộ không có trên Vercel.

## Sửa lỗi
Đổi duy nhất trong test loader:

```js
const ts = require('typescript');
```

TypeScript đã được khai báo trong `devDependencies` của dự án, nên khi Vercel cài phụ thuộc cho `npm run check`, test đọc được package từ `node_modules` bất kể đường dẫn cài Node.

## Deploy
1. Sử dụng Zipverra để **đồng bộ toàn bộ source và xóa file dư** trên GitHub branch đang deploy.
2. Redeploy Vercel, xem đầy đủ `npm run check` (lint, typecheck, test, build).
3. Kết quả kỳ vọng: 340/340 test qua; nếu có lỗi khác thì lấy log mới ở đúng bước.

**Không có migration mới.** Nếu migration V4.6.2 đã chạy, không chạy lại. Không đổi tính năng lấy giá theo yêu cầu, không bật Cron/Supabase Realtime.

## Giới hạn xác minh
Đã chạy thành công 340/340 `node --test` và kiểm tra release trong môi trường đóng gói, với TypeScript có sẵn toàn cục được nạp qua đường dẫn package. Full `npm run check` chưa chạy hết vì `eslint` không có trong môi trường đóng gói; kết quả build cần xác minh trên Vercel có đầy đủ dependencies.
