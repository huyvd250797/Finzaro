# Finzaro V0.0.5 — Category Engine

Finzaro là PWA quản lý tài chính cá nhân chạy Next.js + Supabase + Vercel. V0.0.5 chuẩn hóa category cho Income/Expense và bổ sung cơ chế cảnh báo cập nhật phiên bản cho PWA đã Add to Home Screen.

## V0.0.5 có gì mới

### Category Engine

- `categories` table thật trên Supabase.
- RLS theo từng user.
- Category loại `income` / `expense`.
- Default categories tự tạo cho user hiện tại và user đăng ký mới.
- Custom category.
- Subcategory.
- Icon riêng cho từng category bằng allow-list Lucide icons.
- Sửa tên/icon/parent.
- Archive/restore thay vì hard delete.
- Transaction mới dùng `category_id` thật.
- `category_label` cũ được giữ làm historical snapshot.
- Migration tự chuyển category text V0.0.4 sang model mới.
- Transaction history và Dashboard hiển thị icon category.
- Filter transaction theo category.

### PWA Update Prompt

- `/api/version` trả version hiện hành với `no-store`.
- Service Worker V0.0.5 không tự `skipWaiting` khi update.
- App phát hiện server version hoặc worker mới khi mở/foreground/online.
- Banner **Có phiên bản Finzaro mới**.
- Nút **Cập nhật ngay** activate worker mới và reload.
- `/sw.js` không cache để update detection đáng tin cậy hơn.
- Authenticated navigation vẫn network-only.

## SQL bắt buộc

Vào Supabase SQL Editor và chạy:

```text
supabase/sql-editor/V0.0.5_category_engine.sql
```

Không chạy lại V0.1.1 / V0.0.3 / V0.0.4 nếu đã chạy trước đó.

Optional verification:

```text
supabase/sql-editor/V0.0.5_category_engine_verify.sql
```

Chi tiết: [`docs/V0.0.5_CATEGORY_ENGINE_SETUP.md`](docs/V0.0.5_CATEGORY_ENGINE_SETUP.md)

## Data model

```text
auth.users
   │
   └── categories
       ├── income / expense
       ├── icon_name
       ├── parent_id
       ├── system_key
       └── archive state

transactions
   ├── category_id ─────→ categories.id
   └── category_label    historical snapshot
```

Transaction ledger tiếp tục dùng `transaction_entries` và RPC atomic từ Transaction Core.

## Category icons

UI chỉ chấp nhận icon nằm trong allow-list tại:

```text
features/categories/icons.tsx
```

Điều này tránh lưu component/code tùy ý trong database. DB chỉ lưu key như:

```text
Utensils
Home
Car
ShoppingBag
HeartPulse
Briefcase
CircleDollarSign
...
```

## PWA update flow

```text
PWA đang mở
   ↓
check /api/version + registration.update()
   ↓
phát hiện bản mới
   ↓
Update Prompt
   ↓
Cập nhật ngay
   ↓
SKIP_WAITING (nếu worker đang chờ)
   ↓
reload
   ↓
Finzaro release mới
```

Lần chuyển **V0.0.4 → V0.0.5** có thể cần đóng/mở lại PWA hoặc refresh một lần vì V0.0.4 chưa có update prompt. Sau khi V0.0.5 đã được nạp, các release sau sẽ được phát hiện tự động.

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
Finzaro V0.0.5 · Category Engine
```

Version hiển thị trong Header, Sidebar, Auth UI và Settings.

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

Sau khi SQL V0.0.5 chạy thành công:

```bash
git add .
git commit -m "feat: Finzaro V0.0.5 Category Engine"
git push
```

Vercel redeploy từ GitHub như các bản trước. Không cần ENV mới.

## Acceptance test

1. Mở `/categories` và kiểm tra default categories.
2. Tạo `Cà phê` dưới `Ăn uống`, chọn icon `Coffee`.
3. Tạo Expense mới và chọn `Ăn uống › Cà phê`.
4. Kiểm tra transaction history hiển thị icon Coffee.
5. Kiểm tra Dashboard expense category lấy dữ liệu thật.
6. Archive category và xác nhận category không còn dùng được cho transaction mới nhưng giao dịch cũ vẫn hiển thị.
7. Deploy một release mới hơn và mở PWA để kiểm tra update prompt.

## Phiên bản tiếp theo

**Finzaro V0.0.6 – Budget Engine**

Mục tiêu: dùng Category Engine + Transaction Core để quản lý ngân sách thật.

Dự kiến gồm:

- Monthly budgets.
- Budget theo category.
- Actual vs Budget.
- Progress %.
- Remaining amount.
- Near-limit / over-budget states.
- Budget summary trên Dashboard.
- Copy budget từ tháng trước.
- RLS và SQL Editor migration riêng.

Sau V0.0.6, hướng tiếp theo dự kiến là **V0.0.7 – Recurring Transactions & Financial Calendar**.
