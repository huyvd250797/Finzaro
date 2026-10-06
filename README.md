# Finzaro V0.0.6 — Budget Engine

Finzaro là PWA quản lý tài chính cá nhân chạy Next.js + Supabase + Vercel. V0.0.6 đưa Budget từ preview thành engine thật dựa trên Category Engine + Transaction Ledger, đồng thời giữ cơ chế cập nhật PWA chủ động đã có từ V0.0.5.

## V0.0.6 có gì mới

### Budget Engine

- `budgets` table thật trên Supabase.
- Budget theo tháng + Expense category + currency.
- RLS theo từng user.
- Minor-unit `BIGINT` cho hạn mức.
- Actual Spending tính từ Expense ledger thật, không lưu counter trùng lặp.
- Category cha tự bao gồm toàn bộ subcategory.
- Chặn budget cha/con chồng lấp trong cùng tháng + currency để tránh double-count.
- Chặn re-parent category nếu thao tác đó làm phát sinh overlap cho budget đang active.
- Progress %, Remaining, Near Limit (>=80%), Over Budget (>100%).
- Month navigation.
- Copy ngân sách từ tháng trước.
- Edit hạn mức.
- Archive/restore budget.
- Multi-currency không tự FX conversion.
- Budget summary trên Dashboard.

### PWA Update Prompt

Cơ chế V0.0.5 tiếp tục được giữ:

- `/api/version` no-store.
- Service Worker phát hiện worker mới.
- Kiểm tra khi app mở/foreground/online.
- Banner **Có phiên bản Finzaro mới**.
- Nút **Cập nhật ngay** activate worker mới và reload.
- Authenticated navigation không cache HTML.

## SQL bắt buộc

Vào **Supabase → SQL Editor → New query**, chạy:

```text
supabase/sql-editor/V0.0.6_budget_engine.sql
```

Không chạy lại các SQL release trước nếu đã chạy thành công.

File verify read-only:

```text
supabase/sql-editor/V0.0.6_budget_engine_verify.sql
```

Chi tiết: [`docs/V0.0.6_BUDGET_ENGINE_SETUP.md`](docs/V0.0.6_BUDGET_ENGINE_SETUP.md)

## Budget model

```text
categories (expense)
      │
      └── budgets
          ├── month_start
          ├── currency_code
          └── amount_minor

transactions (expense)
      │
      ├── category_id
      └── transaction_entries (signed ledger)
                 │
                 └── actual spending
```

Budget parent category bao gồm Expense của descendants. V0.0.6 cấm active budget scope chồng lấp trong cùng month/currency.

## Multi-currency

Finzaro không cộng VND + USD hoặc tự quy đổi FX:

```text
Budget VND → Expense VND
Budget USD → Expense USD
```

FX conversion sẽ được thiết kế thành engine riêng ở roadmap sau.

## ENV

Không có ENV mới:

```dotenv
NEXT_PUBLIC_FINZARO_ENV=development
NEXT_PUBLIC_SITE_URL=https://your-finzaro.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

## Version display

Version tập trung tại:

```text
lib/app-version.ts
```

Hiện tại:

```text
Finzaro V0.0.6 · Budget Engine
```

Version hiển thị ở Header, Sidebar, Auth UI và Settings; `/api/version` + Service Worker cũng dùng cùng version để PWA phát hiện release mới.

## Quality commands

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

hoặc:

```bash
npm run check
```

## GitHub → Vercel

Sau khi SQL V0.0.6 chạy thành công:

```bash
git add .
git commit -m "feat: Finzaro V0.0.6 Budget Engine"
git push
```

Vercel redeploy từ GitHub. Không cần ENV mới.

## Acceptance test nhanh

1. Mở `/budgets`.
2. Tạo `Ăn uống` = `5.000.000 VND`.
3. Ghi Expense `1.000.000 VND` vào `Ăn uống › Cà phê`.
4. Budget parent phải hiển thị 20%.
5. Đạt >=80% phải chuyển `Gần giới hạn`.
6. >100% phải chuyển `Vượt ngân sách`.
7. Thử tạo budget child cùng month/currency và xác nhận bị chặn overlap.
8. Sang tháng mới → **Sao chép tháng trước**.
9. Dashboard phải hiển thị Budget summary.
10. Từ PWA bản cũ, deploy V0.0.6 và kiểm tra prompt **Cập nhật ngay**.

## Phiên bản tiếp theo

**Finzaro V0.0.7 — Recurring Transactions & Financial Calendar**

Mục tiêu là quản lý các dòng tiền có lịch lặp như lương, tiền nhà, Internet, Netflix, bảo hiểm, học phí hoặc khoản thanh toán định kỳ.

Dự kiến gồm:

- `recurring_rules` thật trên Supabase.
- Income/Expense recurring.
- Chu kỳ weekly / monthly / yearly / custom cơ bản.
- Next due date.
- Financial Calendar theo tháng.
- Upcoming payments/income trên Dashboard.
- Mark due item là Paid / Skipped.
- Tạo Transaction thật từ recurring occurrence, không làm giả ledger.
- Nhắc khoản sắp đến hạn làm nền cho notification ở release sau.
- RLS + SQL Editor migration riêng.

Sau V0.0.7, hướng dự kiến là **V0.0.8 — Reports & Financial Insights** để nâng cấp reporting theo period/category/account/budget và chuẩn bị Savings Goals.
