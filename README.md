> **Latest release: Finzaro V4.2.2 — Report RPC Type Safety & Deploy Hotfix.** Vá lỗi deploy TypeScript `TS18046` tại `features/reports/load-period-snapshot.ts`: kiểm tra phản hồi RPC chưa được khai báo trong Supabase generated types trước khi truy cập `data/error`. Giữ nguyên báo cáo Thu/Chi, đối soát, fallback RPC và SQL. Không cần migration mới. Xem [`DEPLOY_V4.2.2.md`](DEPLOY_V4.2.2.md) và [`docs/V4.2.2_QA.md`](docs/V4.2.2_QA.md). Cần xác nhận `npm run check` thành công trên Vercel.

> **Latest release: Finzaro V4.2.1 — React Error Boundary & Release Gate Hotfix.** Sửa lỗi deploy V4.2.0 do Dashboard (`overview/page.tsx`) và Reports (`reports/page.tsx`) tạo JSX trong `try/catch`, bị ESLint `react-hooks/error-boundaries` chặn. Giữ nguyên toàn bộ nghiệp vụ và migration V4.2.0, bổ sung test chống tái diễn, sửa hai cảnh báo lint. **Không cần SQL mới cho V4.2.1.** Xem [`DEPLOY_V4.2.1.md`](DEPLOY_V4.2.1.md) và [`docs/V4.2.1_QA.md`](docs/V4.2.1_QA.md). Chưa xác nhận build Vercel/Next.js production tại môi trường đóng gói.

> **Latest release: Finzaro V4.2.0 — Unified Fast Data Layer.** Dashboard một snapshot cho KPI/3 card chi tiêu/chart 5 kỳ, có đường vị thế tiền mặt-ngân hàng-ví màu xanh và modal biểu đồ toàn màn hình; bỏ Phân bổ ngân sách và tab Phân tích Báo cáo. Báo cáo lần đầu dùng RPC giống chuyển kỳ; cache/prefetch và đo thời gian có kiểm soát. **Cần chạy SQL migration V4.2.0 trước khi bật tối ưu đầy đủ.** Xem [`DEPLOY_V4.2.0.md`](DEPLOY_V4.2.0.md) và [`docs/V4.2.0_QA.md`](docs/V4.2.0_QA.md). Chưa xác nhận production build/Supabase thật.

> **Latest release: Finzaro V4.1.7 — Portable Test Runner CI Hotfix.** Sửa lỗi 2 suite kiểm thử V4.1.2/V4.1.3 tải TypeScript bằng đường dẫn cài Node tuyệt đối. Đã tái hiện đúng `201 tests / 199 pass / 2 fail` và xác nhận sau sửa `209/209` test đạt trong môi trường mô phỏng Node path khác. Giữ nguyên nghiệp vụ, SQL và các bước Release Quality Gate. Xem [`DEPLOY_V4.1.7.md`](DEPLOY_V4.1.7.md). Cần xác nhận Next.js production build trên Vercel.

> **Latest release: Finzaro V4.1.6 — Financial Snapshot Type Safety Hotfix.** Sửa lỗi Vercel `TS2345` trong đối soát báo cáo do `DonutSlice.id` có thể `undefined`; giữ nguyên dữ liệu, công thức và Release Quality Gate. Không cần SQL migration. Xem [`DEPLOY_V4.1.6.md`](DEPLOY_V4.1.6.md). Cần xác nhận build đầy đủ trên Vercel.

> **Latest release: Finzaro V4.1.5 — Release Gate Lint Compatibility.** Vá lint failure xuất hiện sau khi sửa `eslint/config` trên V4.1.4; giữ nguyên tính toán tài chính, 6 module và DB. Không tắt Quality Gate. Xem [`DEPLOY_V4.1.5.md`](DEPLOY_V4.1.5.md). Lint/typecheck/build production vẫn cần xác nhận trên Vercel.

> **Latest release: Finzaro V4.1.4 — Financial Accuracy & Release Gate.** Chuẩn hóa số liệu Thu/Chi/Ròng; sửa tỷ trọng Top 5 và Excel/PDF theo bộ lọc; đối soát báo cáo; cấu hình Vercel chỉ deploy sau khi ESLint, TypeScript, tests và production build đều đạt. **Không cần SQL migration V4.1.4.** Xem [`DEPLOY_V4.1.4.md`](DEPLOY_V4.1.4.md). Chưa xác nhận build production trong môi trường đóng gói.

> **Latest release: V4.1.3 — Period Snapshot TypeScript Deploy Hotfix.** Sửa hai lỗi TS2345 của `/api/reports/period-snapshot` khi chuyển Tháng/Năm; không thay đổi nghiệp vụ hoặc SQL. Xem `DEPLOY_V4.1.3.md`.

> **Latest release: V4.1.2 — Compact Reports & Instant Period Navigation.** Báo cáo Tổng quan gọn hơn, bỏ hiệu quả dòng tiền và CTA Phân tích nâng cao. Chuyển Tháng/Năm và kỳ trước/sau bằng API tổng hợp nhanh, cache kỳ đã xem; SQL mới chỉ thêm hàm tổng hợp, không sửa dữ liệu. Xem `DEPLOY_V4.1.2.md`.

> **Latest release: V4.1.1 — Full-screen Category Analytics & Instant Details.** Chi tiêu hôm nay mặc định thu gọn danh sách giao dịch; Báo cáo Tổng quan nhóm theo danh mục, cho phép chọn danh mục rồi chọn cột ngày (khi xem tháng) hoặc cột tháng (khi xem năm) để tải giao dịch đúng kỳ. Không yêu cầu SQL migration. Xem `DEPLOY_V4.1.1.md`.

> **Latest release: V4.0.3 — Instant Launch Splash, Clean Sheet Grip & Today Spending.** Khởi động PWA bằng Splash HTML ngay khi nhận được phản hồi, không chờ redirect xác thực; xử lý viền focus thanh kéo bottom sheet; thêm Chi tiêu hôm nay trên Tổng quan. Không cần chạy SQL mới. Xem `DEPLOY_V4.0.3.md`.

> **Phiên bản hiện tại: Finzaro V4.0.2 — Viewport-Locked Mobile Chrome & Keyboard Focus.** Bản vá V4.0.1 xử lý nguyên nhân taskbar bị đẩy lên sau lưu/xóa hoặc khi kéo quá cuối danh sách: bỏ phép tính VisualViewport bottom, cô lập vùng cuộn chính, cố định Hủy/Lưu ngoài vùng cuộn và tự đưa ô Nội dung vào tầm nhìn khi bàn phím iPhone mở. Không thay đổi 6 module, SQL, dữ liệu hoặc nghiệp vụ. Xem [`DEPLOY_V4.0.2.md`](DEPLOY_V4.0.2.md) và [`docs/V4.0.2_QA.md`](docs/V4.0.2_QA.md).

> **Phiên bản hiện tại: Finzaro V4.0.1 — Fixed Mobile Chrome & Sheet Actions.** Bản vá từ V4.0.0 xử lý thanh điều hướng mobile và thanh Hủy/Lưu bị trôi khi cuộn iPhone. Thanh thao tác tách khỏi vùng cuộn, cố định ở đáy bottom sheet; Copy, tài khoản, danh mục và máy tính tiền sử dụng cùng nền tảng. Không thay đổi dữ liệu hay SQL. Xem [`DEPLOY_V4.0.1.md`](DEPLOY_V4.0.1.md) và [`docs/V4.0.1_QA.md`](docs/V4.0.1_QA.md).

> **Phiên bản hiện tại: Finzaro V4.0.0 — Premium UX Release.** Giai đoạn hoàn thiện UI/UX, không bổ sung nghiệp vụ tài chính. Bổ sung kiểm tra số tiền trước khi lưu và tự đưa lỗi vào vùng nhìn thấy, skeleton theo module, tối ưu list trên iPhone hẹp, Scroll/Focus bottom sheet và đồng bộ theme hệ điều hành. Giữ 6 module và 91 migration SQL. Xem [`DEPLOY_V4.0.0.md`](DEPLOY_V4.0.0.md) và [`docs/V4.0.0_QA.md`](docs/V4.0.0_QA.md).

> **Phiên bản hiện tại: Finzaro V3.6.0 — Fluid Motion & Navigation.** Nâng cấp điều hướng nhớ bộ lọc/kỳ và vị trí cuộn, loading ít nhấp nháy, chuyển cảnh và bottom sheet mượt, phản hồi phím số phóng lớn 14%, và xóa giao dịch phản hồi tức thời có khôi phục khi server lỗi. Giữ 6 module, không thay đổi SQL. Xem [`DEPLOY_V3.6.0.md`](DEPLOY_V3.6.0.md) và [`docs/V3.6.0_QA.md`](docs/V3.6.0_QA.md).

> **Nâng cấp:** Áp dụng trên source V3.5.0. Giữ nguyên tính năng Tổng quan/Báo cáo/Lịch, bản vá nút Lưu trên iPhone và Batch Copy V3.2.x. Không cần SQL migration mới; không thêm dependency. Các chỉ số hiệu năng thực tế phải kiểm chứng sau deploy.

# Finzaro V3.2.0 — Instant Reports & Fast Copy

**Bản phát hành hiện tại**, nâng cấp từ source V3.0.0 do người dùng cung cấp, kết hợp hai giai đoạn V3.1.0 + V3.2.0. Giữ nguyên 6 module: Tổng quan, Giao dịch, Tài khoản & Ví, Danh mục, Báo cáo & Lịch, Cài đặt.

**Quan trọng:** Phiên bản này **có migration SQL mới**. Trước khi deploy frontend, áp dụng `supabase/migrations/20261111180000_instant_copy_batch_v320.sql` trên staging và production theo `DEPLOY_V3.2.0.md`. Không reset database, không sửa dữ liệu giao dịch hiện tại.

- **Báo cáo:** Đổi Thu/Chi cùng kỳ ngay trên client, không tải lại RSC; period navigation duy trì loại đang chọn, prefetch theo tương tác.
- **Sao chép giao dịch:** Mở bottom sheet tại Lịch/Giao dịch, không cần chuyển sang trang khác. SQL batch 1 RPC cho tối đa 20 ngày và idempotency chống gửi trùng/thử lại.
- **Splash:** Tự đóng khi nội dung đầu tiên đã sẵn sàng, overview đợi dữ liệu cốt lõi; không dùng thời gian chờ cố định.
- **Chẩn đoán tốc độ:** Trên thiết bị test, chạy `sessionStorage.setItem('finzaro-perf','1')` trong DevTools để xem `reports.flow.toggle` và `transactions.copy.open` click-to-paint (không log dữ liệu riêng tư). Server có thể bật `FINZARO_PERF_LOG=1` trên staging.
- **QA:** Các kiểm thử source hiện có và kiểm thử chuyên biệt V3.2.0. Chưa xác nhận build, kiểm thử E2E/trình duyệt và PostgreSQL RPC thật trong môi trường đóng gói. Xem `docs/V3.2.0_QA.md`.

## Lịch sử phát hành

> **Previous release: Finzaro V3.0.0 — Professional Release (V2.6.0 + V3.0.0).** Source upgraded from the user-provided V2.5.0 ZIP. See [`DEPLOY_V3.0.0.md`](DEPLOY_V3.0.0.md) and [`docs/V3.0.0_QA.md`](docs/V3.0.0_QA.md). V3.0.0 itself did not need SQL migration.

**V3.0.0 highlights:** Staged history with 80 records per view; scalable reports with grouped but total-preserving trend bars; faster category tree traversal; tactile money keypad; focus trapping, reduced motion and contrast. Six modules. The prior release validated 109 source tests, but did not verify production build in its packaging environment.

---

> **Current release: Finzaro V2.5.0 — Financial Dashboard, Advanced Analytics & Professional Statements.** This single source package combines V2.3.0 + V2.4.0 + V2.5.0 on top of V2.2.0. See [`DEPLOY_V2.5.0.md`](DEPLOY_V2.5.0.md). No SQL migration.

**V2.5.0 highlights:** financial KPIs (Thu/Chi/Ròng/tỷ lệ giữ lại), interactive monthly drill-down to transaction history, comparable-period insights, category and account breakdowns, professional financial-statement tables, native ZIP-based XLSX and CSV downloads, plus browser Print / Save as PDF with Vietnamese labels. Same filters and currency govern all exports. Transfers and legacy finance transactions are excluded from ordinary income/expense aggregates.

**QA:** `npm run release:check`; `npm test` (103/103); and TypeScript/TSX isolated syntax transpilation. Full `npm run check` (ESLint, TypeScript typecheck, Next.js production build) is **not yet verified** because this environment cannot install dependencies from npm registry. Before deploying, install dependencies in a network-enabled environment and run `npm run check`. See [`docs/V2.5.0_QA.md`](docs/V2.5.0_QA.md).

---

> **Previous release: Finzaro V2.2.0 — Performance, Premium Fintech Design & Fluid Transactions.** This single release combines V2.0.4 + V2.1.0 + V2.2.0 on top of V2.0.3. See [`DEPLOY_V2.2.0.md`](DEPLOY_V2.2.0.md). No SQL migration.

**V2.2.0 highlights:** opt-in browser performance diagnostics; faster 6-month aggregation; semantic Light/Dark UI; warmed navigation; preserving Thu/Chi/Chuyển drafts when switching tabs; keyboard-accessible category selection and smoother calendar gestures.

Quick quality checks: `npm run release:check`, `npm run test`, `npm run benchmark:ledger` (TypeScript dependency required), then `npm run check` with dependencies and environment variables installed. Production deployment must pass full lint/typecheck/build; source-only tests are not a replacement. QA record: [`docs/V2.2.0_QA.md`](docs/V2.2.0_QA.md).

# Finzaro V2.0.0 — Finzaro UX Release

**V2.0.0 combines V1.8.0 Accounts & Categories, V1.9.0 Speed/Motion/Accessibility and V2.0.0 UX Release** on the V1.7.1 baseline. One final source package is distributed. The product remains six modules and 3 transaction types: Thu, Chi, Chuyển.

Current deployment: [`DEPLOY_V2.0.0.md`](DEPLOY_V2.0.0.md). Prior deploy fix: [`DEPLOY_V1.7.1.md`](DEPLOY_V1.7.1.md). Previous UI checklist: [`DEPLOY_V1.7.0.md`](DEPLOY_V1.7.0.md). QA evidence: [`docs/V1.7.0_QA.md`](docs/V1.7.0_QA.md).

## Product overview

Finzaro is now a **simple personal income, expense and account-balance tracker**. This release removes 13 advanced financial modules from the running product. Source base: V1.1.9. The original financial history is **not deleted**.

## Six modules in the app

| Module | Route | Purpose |
| --- | --- | --- |
| Tổng quan | `/overview` | Three KPIs (Thu / Chi / Ròng), cash balance, spending trends, recent ordinary transactions |
| Giao dịch | `/transactions` | Ordinary Thu / Chi / Chuyển between standard accounts; edit ordinary Thu/Chi, safely delete transactions |
| Tài khoản & Ví | `/accounts` | Cash, bank and e-wallet accounts, live balances |
| Danh mục | `/categories` | Color/icon, category grid, drag-to-reorder |
| Báo cáo & Lịch | `/reports`, `/reports/calendar`, `/reports/analysis` | Monthly/yearly summaries, daily calendar, category breakdown and CSV |
| Cài đặt | `/settings` | Profile, currency and app preferences |

Mobile navigation: **Tổng quan · Giao dịch · + Thêm GD · Báo cáo · Thêm**. The last menu offers Accounts, Categories and Settings. The 13 removed modules are not navigable; their old URLs redirect to `/overview`.

## Accounting safety and historical data

**V1.4.0 includes the V1.2.3 + V1.3.0 + V1.4.0 milestones in one source release.** The V1.2.0 restricted ledger RPC schema remains unchanged, so there is no new SQL migration.

**Do not delete tables or records from the former module set.** The V1.2.0 migration is additive: it creates a safe marker table and constrained transaction RPCs. Historical credit-card/loan/deposit/goal/investment/recurring records remain untouched and are no longer writable through the ordinary UI.

- Standard Income/Expense: selectable only against active `cash`, `bank`, `ewallet` accounts; category must match transaction type.
- Standard Transfer: only between those account types, never counted as Income or Expense. Same-currency transfers must balance exactly.
- Special historical transactions: excluded from normal cashflow totals, retained in the readonly historical list (`/transactions?legacy=1`) and database.
- Historical accounts of type `savings`: still visible for archival review, not editable/transferrable in the simplified app, and **excluded from the new regular-account balance total**. Reconciliation of any assets in those accounts requires a separate, explicitly approved migration.
- Database writes use `create_simple_transaction_v120`, `update_simple_transaction_v120` and `delete_simple_transaction_v120`; former financial creation/edit/deletion RPCs are revoked from direct use by authenticated clients. Transaction mutations are atomic via the existing ledger DB routines.
- The reports do not reclassify old borrowings, card advances, debt repayments or deposit funding as ordinary Income/Expense.

**Important:** This release changes what is included in the simplified visible account total. It does not rewrite saved balances. Compare opening/closing balances for each retained `cash/bank/ewallet` account before approving production rollout.

## Installation / migration

See [`DEPLOY_V1.2.2.md`](DEPLOY_V1.2.2.md) for the deploy fix and [`DEPLOY_V1.2.1.md`](DEPLOY_V1.2.1.md) for reporting improvements and [`DEPLOY_V1.2.0.md`](DEPLOY_V1.2.0.md) for the required baseline migration.

1. Back up the Supabase database and export a read-only transaction/account snapshot.
2. Ensure previous schema migrations through V1.1.2 have been applied.
3. Run `supabase/sql-editor/V1.2.0_simple_expense_management.sql` in Supabase SQL Editor.
4. Run `supabase/sql-editor/V1.2.0_simple_expense_management_verify.sql` to verify the marker table and RPCs.
5. Install dependencies (`npm install`), then run `npm run check` to test/lint/typecheck/build in an environment with network access and valid `.env` settings.
6. Deploy the V2.0.0 source ZIP root to Vercel and clear build cache once. Verify visible `V2.0.0` badge. Source sync removes GitHub-overlaid old application code during `prebuild`.
7. Smoke-test all three transaction types, deletion rollback, calendar/day edit, Reports, category icon/color, account balances and archived historical records.

This ZIP does not include `node_modules`, compiled `.next` output or a database backup. Migration has **not** been run against your real Supabase instance. No customer data was deleted by preparing this release.

## Environment

Copy `.env.example` to `.env.local` and fill in Supabase app keys. The `prebuild` validator checks required public variables. No SSI/market-data API keys are needed in V1.2.0.

## Testing

`npm run test` runs the V1.2.0/1.2.1/1.2.2 compatibility regression suites plus the V1.4.0 UX/performance regressions and still-valid PWA/auth/calculator tests. Historical advanced-module tests are preserved in `tests/legacy/` for traceability but are no longer part of the simplified product's active test contract.

See [`docs/VERSIONING.md`](docs/VERSIONING.md) for patch version policy. Increment the version for each later release; do not reuse a published version. See `DEPLOY_V3.2.0.md` for the current release.


## V1.4.1 TypeScript deployment patch

The three RPC actions for create, update, and delete now validate the RPC envelope before reading `.error`, resolving the TypeScript TS2339 `unknown` regression while preserving the atomic V1.2.0 SQL functions and all V1.4.0 functionality. See `DEPLOY_V1.4.1.md`. No new SQL migration.


## V1.7.0 UI/UX consolidation

- **Calendar:** 7 visible date columns, compact integer Thu/Chi (`+1,25tr`, `-850k`), no zero labels; tapping dates filters the existing month locally. Double-tap (or selected-day Add action) opens a date-prefilled transaction form. Swiping day items exposes Edit/Delete; saving returns to that month and date.
- **Reports:** category color is the source of truth for every pie segment and legend item. Select any slice or legend entry to see share and amount, then choose `Chi tiết` to drill down. No center overlay masks the pie.
- **Overview:** merged balance and 3 KPI cards, compressed headings and controls, compact top-5 categories and recent transactions. Navigation fixed to the bottom with a fully visible Add control.
- **Simplified scope:** exactly six active modules. Discontinued routes use safe redirects and their application code is no longer shipped. Financial history and SQL migrations are untouched.

See [`DEPLOY_V1.7.0.md`](DEPLOY_V1.7.0.md). No new SQL migration for V1.7.0. Run `npm run check` on a dependency-complete system with valid environment variables before deploying.

Security compatibility: Next.js / eslint-config-next `16.4.6` and React / React DOM `19.3.1` replace known-vulnerable pre-October versions in the source baseline. Keep dependency versions aligned and clear Vercel build cache when switching.

## V1.7.1 GitHub overlay deploy fix

`npm run source:sync` removes only known retired application source files that old GitHub ZIP-overwrite uploads may have left behind. `prebuild` runs it automatically, then enforces the six-module release gate. It does **not** modify database data/migrations or automatically delete tracked files on GitHub. To permanently clean remote source, follow `DEPLOY_V1.7.1.md`.

## V2.0.0 UX consolidation

Accounts search/filter and quick history, category drag-and-drop plus keyboard move, mobile-visible version, modal focus handling and resilient PWA updates. The application still has exactly six modules. See `DEPLOY_V2.0.0.md` and `docs/V2.0.0_UX_QA.md`. No new SQL migration is required.
