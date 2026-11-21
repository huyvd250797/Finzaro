# Finzaro V4.6.10 — Accounts Redeclaration Deploy Hotfix

## Lỗi đã sửa
- `TS2451: Cannot redeclare block-scoped variable` trong `app/(dashboard)/accounts/page.tsx`.
- Gỡ bỏ ba khai báo trùng, cùng các biến `regularAccounts`/`familyAccounts` không sử dụng.
- Giữ nguyên luồng và nghiệp vụ Quỹ gia đình, Công nợ; không đụng Supabase.

## Triển khai
1. Dùng Zipverra Push ZIP nguồn **V4.6.10** lên đúng branch đang deploy.
2. Đây là hotfix source: **không cần bật “Xóa file thừa”** nếu repository V4.6.9 đã sạch.
3. Không cần chạy migration SQL mới; migration V4.6.6 và V4.6.7 vẫn phải đã có nếu sử dụng Quỹ và Công nợ.
4. Redeploy Vercel và xác minh `npm run check` gồm lint, typecheck, test và build thành công.
5. Kiểm tra trang **Tài khoản & Ví**, **Quỹ gia đình**, **Công nợ**, và hai card Dashboard.

## Kiểm thử
- Có regression test khai báo biến ở AccountsPage.
- Full Next.js production build cần xác nhận trên Vercel; nguồn ZIP không bao gồm dependencies đã cài.
