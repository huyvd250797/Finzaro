## [4.0.1] — 2026-11-12 · Fixed Mobile Chrome & Sheet Actions

- **Fix gap and moving action buttons on mobile:** replaced sticky Hủy/Lưu inside the transaction form scroller with a dedicated action slot at the bottom of the BottomSheet; only contents scroll. Native external form submit and pending state preserved.
- **Navigation pinned to viewport:** moved mobile taskbar into a body portal, synchronized VisualViewport bottom offset, disabled inherited transform, and hid the background tabbar while a sheet or mobile keyboard is open.
- **Cross-app form audit:** anchored Copy, Account/Category create/edit and Calculator Xong actions using the same shared action-slot pattern; updated focus trapping and error scrolling.
- **UX invariants:** safe-area, inner scrolling, existing transaction drafts and six modules preserved. No database migration or new dependency; 91/91 SQL files unchanged.
- **QA:** 161/161 source tests, 136 file syntax transpilation, 3 Chromium static layout scenarios. Full Next.js build/real iPhone Safari remain staging checks. See `DEPLOY_V4.0.1.md` and `docs/V4.0.1_QA.md`.

## [4.0.0] — 2026-11-12 · Premium UX Release

- **Transaction UX hardening:** kiểm tra nhanh số tiền trống/0 trước khi gửi RPC; server tiếp tục xác thực chính thức. Khi form lỗi, focus và cuộn tới thông báo trong vùng sheet thay vì cuộn trang nền; hỗ trợ native invalid input. Không thay đổi cách hạch toán.
- **Mobile-First:** nâng nút Copy/Sửa/Xóa lên 40px, cải thiện bố cục 320–390px tránh tràn ngang, giữ sticky Save/Cancel, safe area và cuộn độc lập.
- **Bottom Sheet:** giữ khóa cuộn nền cho cả thời gian đóng animation; VisualViewport, portal, focus trap, Escape và reduced motion tiếp tục hoạt động.
- **Intelligent Loading:** skeleton riêng Tài khoản, Danh mục, Giao dịch, Cài đặt và Sổ báo cáo. Splash không coi skeleton là hoàn thành tải dữ liệu.
- **Light/Dark Mode:** theo thay đổi chế độ hệ điều hành trước khi người dùng tự lựa chọn, cập nhật trạng thái khi thay đổi giữa các tab; không tạo thêm dependency.
- **Motion:** hiệu ứng vào trang tinh chỉnh không mờ số liệu, vẫn giữ keypad scale 1.14; tập trung tương tác và khả năng truy cập.
- **Error/Empty & Calendar:** mở nhanh giao dịch mới từ danh sách trống, xử lý đường lui khi không có dữ liệu; hỗ trợ phím mũi tên, Home/End để chọn ngày trong Lịch. Giữ những cải tiến ở Dashboard, Reports, Calendar, Smart Navigation của V3.5/V3.6.
- **Stability:** 6 module, toàn bộ SQL nguyên trạng (91 tệp), không migration mới, không thêm dependency. Cần chạy build và E2E trên staging trước production.

## [3.6.0] — 2026-11-12 · Fluid Motion & Navigation

- **Smart Navigation:** nhớ các bộ lọc hợp lệ của Giao dịch/Báo cáo, kỳ và ngày Lịch; đường dẫn thanh tab mobile/desktop và khu vực Báo cáo sử dụng lại trạng thái đã chọn trong cùng phiên đăng nhập. Nhớ vị trí cuộn theo URL (bộ nhớ tạm thời, không lưu dữ liệu tài chính vào storage); hủy khôi phục nếu người dùng tự cuộn.
- **Fluid Page Transitions:** hiệu ứng xuất hiện 180 ms nhẹ bằng opacity/transform, nav progress trì hoãn 180 ms để không nhấp nháy khi dữ liệu tải nhanh; có đo thời gian điều hướng khi bật debug.
- **Micro-interactions 2.0:** thống nhất trạng thái nhấn/chọn/focus cho button, tab, card danh mục, ô lịch và các hành động giao dịch.
- **Premium Bottom Sheet:** cải thiện kéo-thả grip với ngưỡng khoảng cách/tốc độ, không đóng do `pointercancel`; giữ Portal + VisualViewport + sticky Save iPhone từ V3.4.0, chặn đóng/đổi tab khi server đang lưu.
- **Intelligent Loading:** giữ skeleton theo màn của V3.5.0 và delay progress; ưu tiên dữ liệu đã render và trạng thái client hiện có; không thêm tải nền hoặc RPC mới.
- **Optimistic Transaction UX:** danh sách giao dịch ẩn dòng khi xác nhận xóa, chờ kết quả server; nếu server lỗi dòng hiện lại cùng thông báo. Lưu/sửa có trạng thái pending thông qua form status. Không thao tác số dư tại client.
- **Scroll & Gesture:** duy trì cuộn dọc tự nhiên khi vuốt ngang giao dịch, giới hạn scroll trong sheet, giữ scroll position khi quay lại URL; hỗ trợ nút Lưu có safe-area.
- **Accessibility & keypad:** phím máy tính tiền scale 1.14 khi nhấn; giữ phản hồi 95 ms cho thao tác chạm nhanh, hỗ trợ pointer/keyboard/focus và Reduced Motion. Tăng focus-visible cho control, không thêm animation layout nặng.
- **Phạm vi:** 6 module cơ bản, RPC tài chính không đổi, toàn bộ SQL migration giữ nguyên; không thêm dependency.

## [3.5.0] — 2026-11-12 · Premium Overview & Reports

- **Tổng quan:** hero số dư/Thu/Chi/Ròng mới, phân cấp số liệu, card danh mục và hoạt động gần đây, bố cục responsive có đủ vùng an toàn mobile.
- **Biểu đồ dòng tiền:** chọn tháng bằng cảm ứng/bàn phím, xem giá trị Thu/Chi ngay, SVG animation nhẹ và Reduced Motion.
- **Báo cáo:** KPI dùng chung theo tone, dòng tiền và tỷ lệ giữ lại, thiết kế lại thanh chọn kỳ, giữ chuyển Thu/Chi nội bộ không phát sinh request RSC cùng kỳ.
- **Biểu đồ danh mục:** donut có trung tâm hiển thị danh mục/tỷ lệ đang chọn, legend và chi tiết giao dịch hoạt động như cũ. Biểu đồ cột có thể chọn kỳ.
- **Lịch:** hiển thị ngày hôm nay/ngày chọn/ngày có số liệu phân biệt rõ, ô hai dòng Thu/Chi, danh sách giao dịch với cuộn dọc và thao tác vuốt ngang Sửa/Xóa; bỏ prefetch ba form trên mỗi lần mở lịch.
- **Loading:** skeleton riêng Tổng quan/Báo cáo/Lịch/Phân tích, tôn trọng reduced motion; Light/Dark palette báo cáo thống nhất.
- **Giới hạn:** chỉ UI/UX, không thay đổi nghiệp vụ giao dịch, không đổi SQL migration, không thêm dependency. Cần kiểm tra build Next.js, typecheck, mobile thực tế trên staging trước deploy production.

## [3.4.0] — 2026-11-12 · Mobile-First Transaction UX

- **Fix lỗi iPhone không cuộn đến Lưu:** BottomSheet dùng portal ra `document.body` để tránh lớp điều hướng mobile che form; tách vùng cuộn trong sheet, đưa footer Hủy/Lưu thành sticky và bổ sung safe-area.
- **Visual viewport:** sheet co giãn theo kích thước vùng hiển thị trên Safari/PWA khi bàn phím ảo mở, không cố định chiều cao vượt khỏi màn hình.
- Danh mục giữ tối đa bốn hàng, giới hạn thêm theo 32dvh với iPhone màn hình ngắn, vẫn cuộn danh mục độc lập và cho phép cuộn form tại biên.
- Tab Chi/Thu/Chuyển giữ bản nháp cũ và tự cuộn lại đầu form khi đổi loại giao dịch; thao tác bàn phím và máy tính tiền được giữ nguyên.
- Không bổ sung SQL migration/dependency; giữ nguyên 6 module và các hàm RPC giao dịch. Xem `DEPLOY_V3.4.0.md` và `docs/V3.4.0_QA.md`.

## [3.3.0] — 2026-11-12 · Premium Visual Foundation

- Thiết kế hệ token Light/Dark thống nhất cho nền ứng dụng, surface, text, border, semantic Thu/Chi/Chuyển, radius và shadow.
- Nâng cấp typography system-first, hierarchy tiêu đề và số liệu tabular; không bổ sung font/network dependency.
- Bổ sung shared `Button` variants, `Input`, `Select`, `Textarea`; sử dụng trực tiếp tại Cài đặt.
- Làm mới header, sidebar, mobile tabbar, theme toggle, bottom sheet, auth shell, Tổng quan và KPI Báo cáo.
- Bổ sung skip-to-main, nâng tương phản cơ bản, focus, reduced motion, high contrast, mobile hit area.
- Giữ nguyên sáu module, nghiệp vụ tài chính và toàn bộ SQL migrations; không cần chạy SQL mới. `DEPLOY_V3.3.0.md` và `docs/V3.3.0_QA.md`.

## V3.2.1 — TypeScript Deploy Hotfix (2026-11-11)

- Sửa lỗi TS2352 ở Report snapshot và period links bằng đối tượng `income`/`expense` được kiểm tra kiểu tường minh.
- Sửa lỗi TS18046 ở Batch Copy bằng runtime guard cho phản hồi RPC `unknown`, đồng thời từ chối kết quả receipt trả về bị trùng ngày.
- Không thay đổi SQL migration, Supabase schema, nghiệp vụ và UI; giữ nguyên 6 module của V3.2.0.
- Chi tiết: `DEPLOY_V3.2.1.md`.

## [3.2.0] — 2026-11-11 · Instant Reports, Fast Copy & Splash

### V3.1.0 — Instant Reports & Navigation
- Báo cáo tính đồng thời hai snapshot Thu/Chi từ đúng một lần tải ledger trong kỳ, đổi tab client-side không fetch lại server.
- Đồng bộ URL, browser Back/Forward và các nút kỳ trước/kỳ sau/Tháng/Năm với loại báo cáo hiện tại; prefetch theo ý định sử dụng thay vì hàng loạt.
- Giữ KPI và thông tin tổng hợp chính xác; tiếp tục không cộng chuyển tiền và giao dịch chuyên biệt vào Thu/Chi.

### V3.2.0 — Instant Copy & Batch Engine
- Copy từ Lịch và Lịch sử mở bottom sheet tại chỗ, không reload danh sách; deep-link Copy chỉ truy vấn bản ghi nguồn.
- Một RPC PostgreSQL nguyên tử cho tối đa 20 ngày. Ràng buộc idempotency qua receipt, transaction advisory lock để chống gửi đồng thời/lặp lại, không tự copy giao dịch legacy.
- Cải thiện splash khởi động dựa trên readiness của nội dung thực (Overview đợi KPI cốt lõi), không áp đặt thời gian chờ cố định; fail-open 4 giây.
- Migration mới **bắt buộc** trước deploy: `20261111180000_instant_copy_batch_v320.sql`.
- Kiểm tra cú pháp TypeScript/TSX và suite hồi quy; chưa chạy production build hoặc Supabase live DB ở môi trường này.

## [3.0.0] — 2026-11-11 · Professional Release (combined V2.6 + V3.0)

### V2.6.0 — Scale, Motion & Accessibility
- Progressive interactive transaction history (80 rows at first render, subsequent batches) and stable `id` ordering; list caps remain clear to users and filters provide date scoping.
- Trend-chart visual aggregation for long reporting ranges; retain full underlying data for financial totals and exports. Limit initial rendered bar count, keep accurate drill-down dates.
- O(N+E) category subtree expansion with a parent adjacency index and cycle protection.
- Tactile calculator keys: 7.5% scale-up while pressed, spring-out on release, pointer/keyboard support, `prefers-reduced-motion` compliance.
- Modal focus trapping, Escape handling, focus restoration, improved focus visibility and high-contrast support.

### V3.0.0 — Final UX/Stability consolidation
- Short GPU-friendly navigation press micro-interactions; no page-wide motion overhead.
- Central application version 3.0.0, six-module release gate, separate V3.0 smoke tests and QA/deploy documentation.
- No database migration or changes to Supabase transaction RPCs; ordinary income/expense accounting logic retained.
- Verification: 109/109 source tests, 114 source syntax checks, synthetic cashflow aggregation validated at 1k/5k/10k rows; full production build not confirmed in this environment.

## V2.5.0 — Financial Dashboard, Advanced Analytics & Professional Statements (2026-11-11)

Combined production source release integrating three roadmap milestones on Finzaro V2.2.0:

- **V2.3.0 — Financial Dashboard & Reports 2.0:** summary retention rate on main Reports dashboard, detailed KPI cards, interactive monthly chart with accessible month selection and transaction drill-down, integrated report navigation.
- **V2.4.0 — Advanced Financial Analytics:** same-length adjacent-period comparisons, income/expense/net delta, retention percentage-point movement, category movement, account spending, contextual insights, calendar-month aggregation in one pass and correct multi-month totals without a silent 24-month truncation; custom date changes switch to Custom range.
- **V2.5.0 — Professional Financial Statements & Export:** consolidated financial statement page, monthly income/expense/net table, category/account breakdown, transaction listing, filtered Excel (.xlsx) workbook with five sheets, UTF-8 CSV, browser print / Save as PDF, Vietnamese print layout and clear accounting scope warnings.
- Preserved all six core Finzaro modules and the existing authenticated Supabase transaction model, RPCs, light/dark theme and PWA. No database migration or new npm dependencies.
- QA: source release gate passed; 103/103 source/runtime tests passed, including XLSX payload check and accounting exclusions. Full lint/typecheck/build pending an environment with installable dependencies.

# V2.2.0 — Performance, Premium Fintech Design & Fluid Transactions (2026-11-11)

- Gộp V2.0.4 + V2.1.0 + V2.2.0 trong một bản phát hành, nâng cấp từ V2.0.3.
- Đo chỉ số trình duyệt có kiểm soát (opt-in, không log nội dung giao dịch), loại splash chờ cố định; tăng ổn định navigation progress.
- Gộp dòng tiền 6 tháng trong một lượt, thêm filter loại và danh mục ở query thay vì sau khi tải (với màn hình danh sách).
- Semantic UI tokens Light/Dark; chuẩn hóa card/inputs/buttons/filter/sidebar/mobile/sheets xuyên suốt 6 module.
- Form nhập Thu/Chi/Chuyển giữ dữ liệu từng tab khi chuyển qua lại; lazy mount các tab chưa mở, hỗ trợ bàn phím.
- Search mở bộ lọc; category picker hỗ trợ keyboard; body touch-action auto giúp gesture lịch ngang + cuộn dọc.
- Bổ sung regression tests, benchmark synthetic ledger, DEPLOY_V2.2.0.md. Không SQL migration và không sửa RPC hạch toán.

## V2.0.3 — Splash & Calendar Interaction Fixes (2026-11-11)

- **Splash restored:** mount existing Finzaro branded splash at the root, visible immediately on a fresh browser/PWA load; close after hydration with a bounded 650 ms reveal. Route-to-route navigation retains lightweight loading and avoids replaying splash on every tap.
- **Copy-date clarity:** start on the original transaction's month; mark original date violet (purple border retained if also selected), prospective destinations sky, and completed copies green, with text legend and accessible date labels. Retain 20-day limit and idempotent RPC/state.
- **Category input:** show at most four category rows (4 × 78px + three 8px gaps); scroll the category grid internally on desktop/touch. Maintain single selection and long-press reorder.
- **Transaction history:** independent native day accordions, all expanded initially, with the existing day headers, counts and transaction actions preserved.
- **Scroll UX:** calendar swipe-action rows accept vertical page scrolling as well as horizontal swipe; sheet/category scroll containers have explicit touch and overscroll behavior; installed PWA allows vertical chaining.
- **Scope:** no database changes, no new services, no retired finance modules; source remains compatible with existing Supabase RPCs.

## V2.0.2 – Mobile Navigation TypeScript Deploy Fix

- Fixed `TS2345` in `components/mobile-nav.tsx`: `item.style` inferred as `unknown` after an `in`-operator guard on a union of navigation item shapes.
- Gave each module shortcut an explicit string `style`, shared across both module shortcuts and transaction shortcuts; retained green income, red expense, blue transfer, and unchanged module appearance.
- Preserved V2.0.1 features (multi-day transaction copy, grouped ledger, bottom sheets, calendar, and entry speed optimizations).
- Added a regression guard against reintroducing the unsafe mixed-shape `style` access.
- No database migration required. Full production build remains subject to CI/Vercel dependency installation.

## V2.0.1 — Performance & Transaction Experience (2026-11-11)

- Faster perceived initial loading: removed forced splash delay; streamed monthly summary, six-month trends and recent history independently; deferred profile enrichment and disabled eager main-nav prefetch.
- Calendar cells made smaller without removing the two colored daily totals.
- Transaction launchers use consistent red/green/blue for Expense/Income/Transfer.
- Transaction history explicitly grouped by the transaction's effective date.
- Multi-date transaction duplication via existing simple-transaction RPC with owner validation and partial-success retry safety; calendar and history include duplicate entrypoints.
- Reusable slide-up/slide-down bottom sheets with drag-to-close handle; applied to main mobile overlays and calculator.
- Brand header and sidebar show Finzaro name and V2.0.1 next to logo.
- No SQL migration or legacy-finance module reactivation.

## V2.0.0 — Finzaro UX Release (2026-11-11)

Three UI/UX phases are delivered together in **one V2.0.0 source ZIP**: V1.8.0 Accounts & Categories UX; V1.9.0 Speed, Motion & Accessibility; and V2.0.0 Finzaro UX Release. Baseline V1.7.1.

- **Accounts & Wallets:** new compact responsive account cards; client-side instant search, account-type tabs and name/balance sorting; one-tap account transaction history; clear active/archived statuses. Existing balances are read from the same ledger without recalculation or data mutations.
- **Categories:** client-side search; long-press pointer-capture drag with stable optimistic order; left/right accessible buttons; explicit saving/error feedback. Failure triggers refresh, with best-effort server compensation for a partially saved order. Archived view now only shows archived categories.
- **Speed & motion:** filter/sort locally with deferred text input rather than round-tripping to Supabase on every key; minimize re-renders; isolate visual animations to hover-capable devices and obey reduced-motion preferences. No performance claims without production measurements.
- **Accessibility & PWA:** modal focus entry, keyboard Tab trapping, Escape close, focus restoration; mobile More dialog labelling; native pinch zoom permitted on installed iOS PWA; service-worker install no longer fails entirely when an offline fallback or optional icon is unavailable. Authenticated navigation remains network-only.
- **Version visible:** `V2.0.0` shown on mobile and desktop header, desktop sidebar, mobile More sheet and Settings, all from `lib/app-version.ts`. `/api/version` and SW registration refer to the same current version.
- **Deploy hardening:** keep V1.7.1 source-sync gate before build, six-module release verification, strict TypeScript checking in CI, no `ignoreBuildErrors` escape hatch. Removed a diagnostic-only ambient shim file that could corrupt semantic type checking when real React/Next types are installed.
- **Financial safety:** no database migration; no change to the constrained V1.2.0 RPCs or archived financial records. Legacy module source remains retired.
- **Release verification caveat:** Node regression tests, source/import checks and TS/TSX parse/transpile are distinct from the full Next.js production build. That build must pass in CI/Vercel with all npm dependencies installed.

## V1.7.1 — GitHub Overlay Deploy Stability Fix (2026-11-11)

- Root cause confirmed from Vercel build logs, and live `huyvd250797/Finzaro` main: a ZIP-overwrite push did **not delete 13 discontinued dashboard route directories** (plus retired components, feature services and old root-level tests). The `prebuild` source gate correctly failed with `Unexpected active routes`. This was not a TypeScript or Supabase environment error.
- Added `scripts/sync-retired-source.mjs` and `npm run source:sync`. It deterministically removes only obsolete application source paths: retired route directories, specialized feature folders, the SSI refresh endpoint/service, replaced UI components and redundant root tests. All surviving six modules, financial SQL migrations and original database data remain untouched. It is idempotent and safe on a clean V1.7.1 checkout.
- `prebuild`, `release:check`, `prelint`, `pretypecheck` and `pretest` now reconcile those retired paths **before** source/type checks. `check-release` remains strict about the six-route invariant and supplies remediation when it fails.
- Added an automated overlay regression test that simulates the same stale GitHub file layout and verifies preservation of active routes and migration files.
- No new SQL migration, no financial accounting logic change and no UI redesign beyond the V1.7.0 scope. Retains Next 16.4.6 / React 19.3.1.
- Caveat: cleaning in Vercel's temporary build checkout is not a GitHub commit. For a permanently clean repository, remove the same retired paths in Git (see `DEPLOY_V1.7.1.md`) or upload with a mirror/sync tool that records deletes.

## V1.7.0 — Calendar, Reports & Overview UX Redesign (2026-11-10)

Combined implementation of three approved phases: V1.5.0 Smart Calendar Experience, V1.6.0 Reports & Charts Redesign, and V1.7.0 Overview & Navigation Redesign. Published source version is **V1.7.0** only.

- Calendar: compact readable Thu/Chi in each daily cell, flexible 4–6 week month height, immediate client-side date selection, double-tap quick-create, swipe row actions, and preservation of selected date after saving.
- Reports: full category-colored pie with keyboard/tap selection, integrated compact legend, item amount and percent, and one-tap category drill-down. Consolidated redundant legend cards.
- Overview: compact balance-and-3-KPI panel, responsive trends, category progress bars using configured colors, and shorter navigation to transaction/calendar screens.
- Mobile navigation: fully visible center Add button without negative positioning, safe-area-conscious fixed taskbar and compact header.
- Removed orphaned route/components/actions for the 13 discontinued advanced modules from the shipped app source. **Database tables, migrations and historical finance records are retained.**
- This is a UI/source release: **no new SQL migration**. Keep V1.2.0 DB RPCs for Thu/Chi/Chuyển.
- Security: bumped `next` and `eslint-config-next` to `16.4.6`, and React/React DOM to `19.3.1` based on November 2026 patched stable releases.
- Deployment gate: TypeScript strict + lint + regression tests + `next build` on dependency-complete CI/Vercel; do not mark production-ready without those checks.

## V1.4.1 — Transaction RPC TypeScript Deploy Fix (2026-11-10)

- Fix production type-check errors TS2339 at `features/transactions/actions.ts` on the create, delete, and update RPC calls. The generic `measureServerOperation` returns `unknown` for a callback where `.rpc` is accessed through an `any` cast; destructuring `.error` is invalid.
- Add `transactionRpcError(response: unknown)` to validate the Supabase RPC response envelope once, then inspect `.error` safely. Invalid response shapes now fail visibly rather than being accepted as successful transactions.
- Preserve the V1.4.0 transaction UI, 6-module scope, atomic V1.2.0 RPCs, and existing financial data. **No SQL migration**.
- Add regression tests for the RPC response and all three call sites.
- Production `next build` still requires dependencies and configured environment variables; not claimed as passed unless run.

## V1.4.0 — Stability, Modern Design System & Transaction UX 2.0 (2026-11-10)

Combined implementation of the approved V1.2.3, V1.3.0 and V1.4.0 stages:

- **Stability & performance:** fast transaction-entry route loads only 24 recent ledger rows, versus the previous 500; ordinary list is bounded to 160 rows (up to 1,000 when filtering) with clearly disclosed limits. Editing locates a historic transaction's date before loading just that day. A quick-entry route avoids fetching transfer-delete metadata. Development logs report non-sensitive loader timing; opt-in `FINZARO_PERF_LOG=1` measures Overview/Reports/Calendar read and transaction RPC latency without logging amounts or IDs.
- **Unified design system:** shared radius/surface/focus/card/button/input tokens in `app/globals.css`, accessible control targets, compact cards, responsive modal and standard error styling. Reduced motion remains respected.
- **Transaction UX 2.0:** money first in a prominent calculator field; category visual grid with auto-suggested title; recent account defaults and suggestion chips; a compact date/notes details section; a single same-currency transfer amount and a second receive amount only for cross-currency transfers; separate form state per transaction type.
- **Save reliability:** `useActionState` keeps entered values and displays server-side validation/RPC errors inline rather than redirecting away and discarding user input; pending save control prevents repeat submits. All inserts/updates/deletes still rely on V1.2.0 atomic RPCs with no client-side balance mutation.
- **Data safety:** the existing 6 modules, historical transaction classifications, Reports and CSV safety behavior stay intact. No database migration and no destructive schema change.
- **Release gate:** production lint/typecheck/build requires installing dependencies in CI/Vercel; parser/Node tests alone are not sufficient.

## V1.2.2 — Transaction TypeScript Deploy Fix (2026-11-10)

- Fixed `TS18047` in `features/transactions/actions.ts`: bind the validated account row to a local `account` constant before currency `.find()` callback, preserving non-null narrowing across the closure.
- Validate the currency query result before lookup; distinguish missing account/currency without changing existing validation messages or financial behavior.
- No SQL migration or transaction data changes. This patch is based on the complete V1.2.1 source and preserves its Reports loader/concurrency improvements.
- Adds a regression test for the precise type-narrowing regression that blocked Vercel deployment. Production build must still be confirmed with installed dependencies.

## V1.2.1 — Performance & Report Integrity (2026-11-10)

- Reports loader removes the extra initial schema-probe query and retries older projections only after a missing-column/schema-cache error on the first page.
- Ledger entry hydration now uses batches of 80 transaction IDs with a maximum of four concurrent requests, rather than one sequential request per 60 IDs; full-result safety limits remain in place.
- Independent category/account metadata requests run alongside entry loading, reducing round trips on report/navigation screens.
- Added a visible recovery warning when all report data sources are unavailable, instead of presenting a blank report as verified zero activity. The CSV endpoint now returns HTTP 503 rather than exporting an apparently valid empty file on total data-source failure.
- Hardens the date helpers against invalid or obsolete timezone preferences. No change to transaction balances, formulas, report inclusion rules, or the six-module navigation.
- Added behavioral regression tests for bounded concurrency, schema fallback, report export safety, and source-only release metadata.
- **No SQL migration for V1.2.1.** The V1.2.0 migration remains required for first-time migrations from V1.1.x.
- Production build must still be verified in the target Vercel environment; parser and Node regression tests do not replace semantic type-check/full Next.js build.

## V1.2.0 — Simple Expense Management (2026-11-10)

**Breaking product-scope change, non-destructive database rollout.**

- Removed 13 non-core modules from active UI/routes: Credit Cards, Loans, Debt Strategy, Deposits, Assets, Net Worth, Financial Health, Forecast, Cash Flow Planner, Goal Planner, Goals, Budgets, Recurring.
- Retained six areas: Overview, Transactions, Accounts & Wallets, Categories, Reports & Calendar, Settings. Mobile navigation remains compact.
- Rebuilt income/expense/transfer form without any borrowing, debt, deposit or goal input; retained money calculator, category grid, date picker, recent suggestions and safe return-to-calendar interaction.
- Rebuilt Overview for a three-KPI row, ordinary-account balance, monthly trends, category ranking and recent ordinary transactions; removed advanced data loaders.
- Simplified Reports Analysis, CSV exports and historical transaction classification; special historical financial flows are not relabeled as normal income/expense.
- Added restricted RPCs and markers (`create_simple_transaction_v120`, `update_simple_transaction_v120`, `delete_simple_transaction_v120`, `simple_transaction_ids_v120`) and revoked direct authenticated execution of older specialized transaction mutation endpoints. The SQL is additive; historic tables remain.
- Archived superseded advanced-module regression suites under `tests/legacy/` and added a V1.2.0-specific contract/regression suite.
- No existing transaction rows or balances are rewritten by the migration. See `DEPLOY_V1.2.0.md` for coordinated rollout, backup/reconciliation and limitations.

# V1.1.9 — Category Grid & Save Performance Fix

- Replaced the income/expense category dropdown with a visual 3–4 column block grid using each category's configured icon and color.
- Added hold-and-drag category ordering backed by the existing `sort_order` field.
- Updated Category Management to compact category blocks and removed the unexplained high-contrast Transactions shortcut.
- Parallelized create/edit transaction validation lookups to reduce Supabase round-trips before the atomic RPC.
- Scoped post-save route invalidation to the financial modules actually affected by the transaction.
- No database migration is required.

# V1.1.8 — Calendar Interaction & Performance Fix

- Calendar day selection is now client-side after the month loads, eliminating a full server/Supabase reload on every date tap.
- Increased mobile day-cell height and display space; calendar amounts are rounded to whole major currency units with no decimal fraction.
- Added double-tap/double-click quick entry on a date with Chi tiền / Thu tiền / Chuyển tiền choices and the selected transaction date prefilled.
- Added swipe-left actions for the selected day's transaction rows: Edit for ordinary Income/Expense and Delete with balance rollback.
- Calendar-originated create/edit/delete operations return to the same month, selected date and day-detail scroll position.
- Prefetches transaction entry routes and reduces ledger payload for calendar-originated transaction/edit flows.
- Keeps three compact monthly KPI blocks on one row and preserves V1.1.7 Category-color pie/report UI.
- No database migration is required.

# V1.1.7 — Reports UI & Calendar Polish

- Compacted Reports navigation and combined month/year selection with the period navigator to reduce vertical space.
- Kept Chi tiêu / Thu nhập / Ròng in one compact row on mobile and desktop.
- Changed pie slices and category progress indicators to use each Category's configured color instead of the Reports palette.
- Reduced pie size, removed redundant legend rows, preserved direct slice selection and large-slice labels, and moved category annotations into a compact two-column list.
- Removed the mobile 700px calendar canvas; all seven weekday columns now fit the viewport.
- Calendar cells show exact green income and red expense on two lines without `0đ` or a currency suffix, preventing amount clipping.
- Calendar KPI cards now remain three columns at every breakpoint.
- No database migration is required.

# V1.1.6 — Reports RSC Boundary Root Cause Fix

- Fixed the confirmed persistent Reports crash: the server-rendered `/reports` route was importing and invoking `reportSliceColor()` from `components/report-donut.tsx`, a `"use client"` module. Next.js React Server Components cannot execute client-module functions on the server.
- Moved `REPORT_SLICE_COLORS` and `reportSliceColor()` into the server-safe `features/reports/palette.ts` module.
- `ReportDonut` remains a Client Component, while the server-rendered category ranking now imports colors only from the shared server-safe palette.
- Added regression coverage for React Server Component boundary safety across all Reports routes.
- Preserved the V1.1.5 pie stability, V1.1.4 data recovery/PWA refresh and V1.1.2 Deposit → Goal transaction integrity.
- No database migration is required for V1.1.6.

# V1.1.5 — Reports Render & Pie Stability Fix

- Replaced the interactive SVG pie implementation introduced in V1.1.0 with a safer `conic-gradient` pie while preserving direct slice tap selection, large-slice labels and category detail display.
- Added `ReportVisualBoundary` so visualization failures are contained locally and cannot trigger the Reports route error screen.
- Hardened `formatMinorMoney` against malformed numeric/currency input and unsupported `Intl` currency values.
- Hardened Reports timezone parsing and transaction entry reads for legacy data.
- Preserved V1.1.4 force-dynamic Reports and the three-stage ledger recovery strategy.
- No database migration is required for V1.1.5.

# V1.1.4 — Reports Recovery & PWA Refresh Fix

- Added three-tier Reports recovery: direct ledger, canonical Transactions loader, then V0.0.4-compatible legacy core reader.
- Reports no longer throw the authenticated shell when a ledger read strategy fails; failures are retained in Runtime Logs and the next fallback is attempted.
- Marked all Reports routes force-dynamic with `revalidate = 0` to avoid stale authenticated RSC output.
- Added installed-PWA server-version hard refresh so an old bundle such as V1.1.2 cannot remain active after a newer deployment is available.
- No database migration is required for V1.1.4.

# V1.1.3 — Reports Runtime Reliability Fix

- Removed the V1.1.2 report RPC from the default Reports runtime path; Overview, Calendar, Category Detail and Analysis now read the stable Transaction Ledger tables directly.
- Added schema-compatible transaction projection fallback so Reports can still load when optional newer columns are not yet present in the PostgREST schema cache.
- Made Category, Account and Currency metadata best-effort. Optional metadata failures no longer blank the entire Reports module.
- Reduced Transaction Entry IN-query chunk size and removed embedded PostgREST relations from the mandatory report path.
- Updated the Reports recovery message so V1.1.3 no longer incorrectly tells users that the report RPC migration is required.
- No V1.1.3 database migration is required. V1.1.2 remains required only for Account → Deposit funding / Goal rollback.

# V1.1.2 — Deposit Transfer & Reports Reliability Fix

- Fixed the Transfer data model: the Tiền gửi module is `public.deposits`, not an Account with `account_type = savings`. Active Deposit records now appear directly as Transfer destinations.
- Added atomic Account → Deposit funding with optional same-currency Savings Goal contribution and exact rollback metadata.
- Added `delete_financial_transaction_v112` so deleting Deposit funding reverses the source Account, Deposit principal and associated Goal entry.
- Replaced the failing Reports embedded-relation hydration path with paginated `report_flow_rows_v112`; added a relation-free fallback that works during migration rollout.
- Added a Reports-specific recovery boundary and regression coverage for Deposit destinations, Goal funding and report loading.
- Added the required V1.1.2 Supabase migration and read-only verification script.

# V1.1.1 — Transfer & Reports Reliability Fix

- Fixed Transfer destination UX so active Savings accounts are explicitly grouped first and exposed as quick-select chips on mobile.
- Restored the Goal selector flow after selecting a Savings destination; linked Goals are prioritized and protected against accidental double-goal updates.
- Reverted Reports transaction hydration to the production-proven `loadLedger(..., fetchAll: true)` path after the lighter V1.1.0 loader caused empty/failed reports on some Supabase deployments.
- Kept the V1.1.0 Reports Calendar, interactive pie, three-KPI overview row and design-system polish unchanged.
- No new database migration is introduced; the existing V1.1.0 Savings → Goal RPC migration is still required.

# V1.1.0 — UI Design System & Visual Polish

- Introduced centralized surface/radius/shadow/semantic UI tokens and refined shared Card/Button primitives for a more consistent visual system.
- Added optional **Thêm vào mục tiêu** when transferring into a Savings account. A new `create_transfer_with_goal_v110` RPC updates the transfer and Goal contribution atomically and avoids duplicate Goal progress when the Goal is already linked to the destination Savings account.
- Reworked Reports Calendar day cells for mobile readability with a wider scrollable grid, larger cells and non-truncated Income/Expense values; zero values remain hidden.
- Replaced the center-covered donut with an interactive full pie: slices/legend items are selectable, selection reveals category/percentage/amount, and large slices render labels inside the pie.
- Compacted Reports Overview so Expense, Income and Net sit on one three-card row.
- Added a report-specific paginated ledger loader and parallel supporting queries so overview/calendar/category/analysis no longer fetch unnecessary account/category data.
- Added Reports loading skeletons and retained the V1.0.2 Next.js 16.4.0 security stack.
- Added V1.1.0 migration + verification scripts and regression coverage for the new Savings/Goal and Reports/UI behavior.

# V1.0.2 — Next.js Security Patch

- Upgraded Next.js from `16.0.0` to `16.4.0` after Vercel blocked the vulnerable framework version.
- Upgraded `eslint-config-next` from `16.0.0` to `16.4.0` to keep lint tooling aligned with the framework.
- Kept React / React DOM / React types on the aligned `19.3.0` line.
- Removed the Vercel/npm `legacy-peer-deps` bypass; installs now resolve the declared peer graph normally while still skipping audit/fund network work.
- No database schema or financial-data changes.

# V1.0.1 — Production Deploy Fix

- Fixed Vercel dependency resolution that could backtrack between React 19.2 and React DOM 19.3 and exceed the build time limit.
- Aligned `react` and `react-dom` to 19.3.0 and aligned `@types/react` / `@types/react-dom` to 19.3.0.
- Updated TypeScript to 5.9.3 to match the resolved toolchain.
- Pinned the deployment runtime to Node 22.x / npm 10.x.
- Added deterministic Vercel install flags and project `.npmrc` to avoid peer-resolution loops, audit/fund network work, and unnecessary registry churn during deploy.
- No database schema or financial-data changes.

# V1.0.0 — Production Release

- Promoted the V0.8.0 Release Candidate to the first production baseline without adding a new finance module.
- Added root/dashboard/global error recovery and a custom 404 surface so transient rendering failures do not leave a blank app.
- Hardened response headers with anti-framing, COOP, HSTS in production, MIME-sniffing protection, referrer policy and restricted browser permissions.
- Added a `prebuild` environment validation gate and stricter placeholder/HTTPS checks for production deploys.
- Pinned application and build dependencies to exact versions in `package.json` to reduce deployment drift.
- Removed the silent 10,000-row ceiling from Reports/Calendar/category drill-down/CSV export by adding full-range pagination with a visible 100,000-row safety ceiling.
- Removed the silent 10,000-row ceiling from Category historical usage counting.
- Preserved the V0.8.0 Reports UX, 84-icon Category library, atomic liability funding and conservative authenticated-PWA cache strategy.
- Added a read-only V1.0.0 Supabase production verification script and pgTAP production smoke checks; no V1.0.0 schema migration is required.

# V0.8.0 — Release Candidate

- Reworked Reports into three focused surfaces: `Tổng quan`, `Lịch`, and `Phân tích` without adding a new top-level finance module.
- Added monthly/yearly overview with Income/Expense toggle, net cashflow summary, donut category breakdown and category drill-down.
- Added Transaction Calendar at `/reports/calendar`; every day can show both Income (green) and Expense (red), and `0đ` values are intentionally hidden.
- Added category detail trend views for 6-month and annual analysis with direct drill-down to transaction history.
- Preserved existing advanced report filters and insights under `/reports/analysis` and increased report-ledger read ceiling from 5,000 to 10,000 rows per selected range.
- Promoted Reports to the mobile taskbar; Recurring remains accessible from the module sheet.
- Expanded Category icons from 52 to 84 options, added Vietnamese labels and icon search.
- Added V0.8.0 database migration to expand the Category icon CHECK constraint so UI validation and Supabase validation remain aligned.
- Standard Income remains the only Income counted in Reports; debt funding from Loans/Credit Cards is still excluded from real income analytics.

# V0.7.5 — Release Stabilization

- Feature freeze: no new user-facing module or workflow.
- Fixed consecutive calculator operator handling so changing `+ / - / × / ÷` before the next operand replaces the pending operator instead of reapplying the previous amount.
- Made overlay scroll locking reference-counted to keep nested modal/bottom-sheet states stable on iPhone/PWA.
- Hardened service-worker installation: recovery pages remain required, optional icon caching cannot abort installation, and activation only deletes old Finzaro cache namespaces.
- Added user/date indexes for Loan Payments, Credit Card Payments and Asset Valuations to protect loading performance as history grows.
- Added V0.7.5 SQL Editor migration + verification files and release-stabilization regression tests.

# V0.7.4 — Money Thousands + Full Mobile Taskbar

- All `MoneyCalculatorInput` displays now group thousands with dots (for example `1.000.000`).
- Decimal money remains entered with the `.` calculator key and stored canonically; visible decimal money uses `1.234,56` so thousands and decimals are unambiguous.
- Numeric money placeholders are formatted with the same visible grouping.
- Reworked the mobile center `+` control so it no longer relies on a negative top margin.
- Removed CSS paint containment that clipped the floating `+` button.
- Added reserved top space plus safe-area bottom padding while keeping the taskbar fixed to the viewport bottom; dashboard content and the PWA update prompt now also clear the taller safe-area-aware bar.
- Added regression tests for money display formatting and taskbar clipping.
- No database migration required.

# V0.7.3 — Deploy TypeScript Fix 2

- Fixed LoanForm money inputs referencing undefined `code`; both now use the in-scope `selectedCurrency`.
- Added a regression test covering the Loans Vercel type-check failure.
- No database migration required.

# V0.7.2 — Deploy TypeScript Fix

- Fixed Transactions credit-card query typing when generated `Database` types do not yet include `credit_cards`, preventing `never` inference during Vercel type checking.
- Fixed Next.js 16 `revalidatePath` callback signature by wrapping it in a unary `forEach` callback.
- Added regression tests for both Vercel build failures.
- No database migration required.

# Finzaro Changelog

## V0.7.1 — Mobile Money UX + Debt Funding

### Added
- App-wide `MoneyCalculatorInput` bottom sheet for money-entry fields; **Xong** commits the displayed value and closes the calculator.
- Decimal-safe `%` / interest inputs that normalize iPhone comma input to canonical dot-decimal values.
- `Thu nhập → Lấy tiền từ thẻ tín dụng`: credits the receiving Account and increases the selected Credit Card debt atomically.
- `Thu nhập → Giải ngân khoản vay mới`: captures loan terms, creates the Loan and credits the receiving Account atomically.
- `liability_funding_events` audit linkage plus rollback-aware `delete_financial_transaction_v071`.

### Changed
- Mobile create/edit overlays now behave as bottom sheets and are capped to the real dynamic viewport.
- Mobile taskbar remains fixed against the viewport bottom; overlay scroll locking no longer fixes/repositions `<body>` on iOS/PWA.
- Form controls are width-hardened so long values cannot push past modal/bottom-sheet boundaries.
- Borrowed funds are excluded from real-income totals and monthly report cashflow.
- Transaction-page loading now parallelizes core requests, reads active Credit Cards directly, and reuses Ledger account/currency data instead of invoking the heavier full Loan loader.
- Money parsing accepts both `,` and `.` user input while storing canonical values according to currency precision.
- Version `0.7.0 → 0.7.1`.

### Database upgrade
- Run `supabase/sql-editor/V0.7.1_mobile_money_debt_funding.sql` after the V0.7.0 schema.
- Optional smoke verification: `supabase/sql-editor/V0.7.1_mobile_money_debt_funding_verify.sql`.

## V0.7.0 — Advanced Debt Strategy

### Added
- New `/debt-strategy` module.
- Debt Avalanche and Debt Snowball simulation across active Loan + Credit Card balances.
- Extra-monthly-payment calculator, baseline comparison, estimated debt-free month count, interest estimate and payoff order.
- Saved `debt_strategy_plans` preference per user/currency.
- Stock holding metadata on `investment_assets`: ticker, exchange, average buy price, market price, provider and auto-price flag.
- Official SSI Node SDK dependency `@ssi.developer/ssi-sdk@3.2.1`.
- Server-only SSI FastConnect market-data adapter and `/api/market/ssi/refresh` route.
- Automatic 30-second quote refresh while Assets page is visible, with manual refresh control.
- Daily coalescing of repeated SSI valuation updates to avoid excessive `asset_valuations` rows.
- SSI/Vietnam-equity quote normalization to VND/share before market-value and unrealized P/L calculations.

### Changed
- Stock Cost Basis can be derived from average buy price × quantity.
- Stock cards show ticker/exchange, market price, average buy price and SSI last-update time.
- Sidebar/mobile navigation and Overview include Advanced Debt Strategy.
- Version `0.6.0 → 0.7.0`.

### Security / architecture
- SSI API Key/Secret stay server-side and are never exposed as public env values.
- SSI integration is read-only Market Data; Finzaro does not place securities orders in V0.7.0.
- Existing V0.6.0 Transaction Core behavior for Credit Card/Loan payments and Goal-linked Savings remains intact.

### Next
- V0.8.0 — Credit Intelligence.
