# Finzaro V4.5.5 — Financial Comparison Clarity Fix

## Nguồn và phạm vi

Kế thừa nguyên vẹn source **Finzaro V4.5.4 — Category Drag Lint Deploy Hotfix** do người dùng cung cấp. Giữ sáu module, danh mục kéo thả và full Vercel release gate. Chỉ thay đổi tính năng so sánh Thu/Chi, phạm vi tổng hợp khi có giao dịch ghi ngày trong tương lai, kiểm chứng số liệu, bộ test và tài liệu.

## Thay đổi nghiệp vụ

1. `chênh lệch = hôm nay − hôm qua` và `tỷ lệ = chênh lệch / hôm qua × 100%`. Dấu +/- phản ánh tăng/giảm số học, màu sắc cho biết tác động tài chính (giảm chi/tăng thu xanh lá; ngược lại đỏ).
2. Trường hợp **hôm nay chi 45.000 đ, hôm qua chi 1.200.000 đ**: `Giảm chi 1.155.000 đ (−96,25%)`, xanh lá. Không được hiển thị `+1.155.000 đ`.
3. Hôm qua = 0, hôm nay > 0: `Tăng chi ... · Mới phát sinh`, không hiển thị phần trăm vì chia cho 0. Cả hai = 0: `Không phát sinh ở cả hai kỳ (0%)`.
4. **Phương án B:** Hôm nay từ 00:00 đến hiện tại **so với toàn bộ ngày hôm qua**; tuyệt đối không dùng cùng số giờ. Nhãn giao diện ghi `So với toàn bộ hôm qua`.
5. Tháng và năm đang diễn ra: so sánh từ đầu kỳ đến **cùng ngày trong kỳ trước**; tháng ngắn/năm nhuận chốt ngày cuối hợp lệ. Các giao dịch ghi ngày tương lai không bị tính vào kỳ hiện tại.
6. Ở mỗi card hiển thị và có thể nhấn xem tổng số của kỳ trước với lọc từ ngày/đến ngày; giúp truy nguyên các khoản tạo nên chênh lệch.

## Migration bắt buộc trước khi deploy source

Chạy file `supabase/migrations/20261117110000_financial_comparison_clarity_v455.sql` vào Supabase sau các migration V4.5.0 và V4.5.1. File:

- `CREATE OR REPLACE` RPC `dashboard_snapshot_v450` (giữ signature) để bỏ khoản có ngày ghi nhận **sau** `p_today` ở mọi tổng Thu/Chi (số dư khả dụng giữ như cũ).
- Tạo RPC **mới** `dashboard_period_comparison_v455(p_currency text, p_today date)`. RPC read-only, `SECURITY INVOKER`, `auth.uid()`, chỉ tính `standard` income/expense, đúng đồng tiền và user; tổng hợp **cả** kỳ hiện tại lẫn kỳ đối chiếu và trả phạm vi ngày dùng để đối soát.
- **Không có** INSERT/UPDATE/DELETE lên bảng giao dịch, ví hoặc tài khoản.
- Nếu DB chưa có v455: ứng dụng dùng ledger fallback để tính đúng kỳ mới, nhưng sẽ chậm hơn. Lỗi DB khác (không phải thiếu RPC) không được che giấu. Do có thay đổi cách tính giao dịch tương lai, khuyến nghị triển khai migration **trước** ZIP source.

## Điều tra chênh lệch 1.254.000 đ

Không thể khẳng định căn nguyên của mức chênh 1.254.000 đ từ source; cần kiểm tra dữ liệu thực tế. Nếu hôm nay 45.000 đ, chênh lệch cũ 1.254.000 đ tương ứng kỳ trước 1.299.000 đ, cao hơn số 1.200.000 đ được nêu **99.000 đ**. Đây chỉ là phép suy luận.

Truy vấn đối soát **chỉ đọc** trên SQL Editor (thay UUID và ngày):

```sql
select t.id, t.transaction_date, t.title, t.transaction_type,
       coalesce(t.transaction_purpose, 'standard') as purpose,
       e.entry_role, e.currency_code, e.amount_minor,
       abs(e.amount_minor::numeric) as chi_tieu_duoc_tinh
from public.transactions t
join public.transaction_entries e on e.transaction_id = t.id
where t.user_id = 'THAY_USER_UUID'::uuid
  and e.user_id = t.user_id
  and t.transaction_date = date '2026-11-16'
  and t.transaction_type = 'expense'
  and coalesce(t.transaction_purpose, 'standard') = 'standard'
  and e.entry_role = 'expense'
  and e.currency_code = 'VND'
order by t.created_at, t.id;
```

Cộng cột `chi_tieu_duoc_tinh` để đối chiếu tổng hôm qua. Nếu có chênh, kiểm tra giao dịch trùng, xóa/sửa, đồng tiền, ngày, trạng thái và bản ghi entry. Đây là truy vấn để kiểm tra tài khoản cụ thể, không được giả định số hiển thị 1.254.000 đ có nguyên nhân cố định.

## QA triển khai

1. Chạy `npm run check` sau khi cài dependencies pinned (lint, typecheck, tests, build).
2. Mở Dashboard: Thu/Chi ở ba card; 45.000 đ vs 1.200.000 đ -> `Giảm chi 1.155.000 đ (−96,25%)` màu xanh lá.
3. Kỳ trước 0, kỳ hiện tại 45.000 đ -> `Mới phát sinh`, không ±100%; hai kỳ cùng 0 -> trung tính.
4. Nhấn tổng hôm qua -> mở bộ lọc giao dịch đúng ngày; kiểm tra tháng/năm tới cùng ngày năm/tháng trước (31/03 -> 28/02 năm thường, 29/02 năm nhuận; 29/02 -> 28/02 năm trước).
5. Thử tạo một giao dịch ghi ngày tương lai; số Thu/Chi tháng/năm hiện tại không đổi. Thử xóa/sửa giao dịch trong ngày, số tổng đồng bộ giữa card và RPC.
6. Test kiểm soát sai lệch giữa 6 totals RPC v455 và snapshot v450: nếu lệch phải hiển thị lỗi đối soát, không hiển thị kết quả bịa.

## Xác minh trong môi trường xây dựng

- `node scripts/check-release.mjs`: OK.
- `npm test`: **301/301 bài kiểm thử đạt**.
- Kiểm tra cú pháp TypeScript/JavaScript: **154/154 file hợp lệ**; release preflight **đạt**.
- **Chưa xác minh full release gate**: môi trường chưa cài được npm dependencies. `npm run lint` báo `eslint: not found`; `npm run typecheck` báo thiếu React/Next/Supabase/@types và các lỗi dẫn xuất; không thể xác nhận `npm run build`. Phải chạy `npm install` + `npm run check` trên CI/Vercel trước khi đưa lên production.
- **Không có truy cập DB người dùng** trong gói ZIP: chưa thể kiểm chứng tận gốc chênh lệch 1.254.000 đ trên dữ liệu thực.
