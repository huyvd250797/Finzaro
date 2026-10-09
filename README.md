# Finzaro V0.6.0 — Investment & Asset Tracking

> Feature release: mở rộng Net Worth sang tài sản đầu tư/thực và hợp nhất Transaction Core với Credit Card, Loan và Savings Goal liên kết.

## V0.6.0 highlights
- Module **Đầu tư & tài sản** tại `/assets`: vàng, cổ phiếu, quỹ/ETF, bất động sản, xe, góp vốn, collectibles và tài sản khác.
- Theo dõi Quantity, Cost Basis, Current Value, valuation date, linked account, icon/color và lịch sử định giá.
- Investment Assets được cộng vào Net Worth theo từng currency, không tự quy đổi FX.
- **Chi tiền** có 3 mục đích: chi tiêu thông thường, thanh toán Credit Card, thanh toán Loan.
- Thanh toán Credit Card từ Transaction Core tự giảm `credit_cards.current_balance_minor` và tạo payment history.
- Thanh toán Loan từ Transaction Core tách Gốc/Lãi/Phí; chỉ phần Gốc làm giảm dư nợ.
- **Chuyển tiền** vẫn là Account → Account. Khi chuyển vào/ra Savings Account đang liên kết Savings Goal, Goal tự tạo contribution/withdrawal từ ledger.
- Mỗi Savings Account chỉ liên kết tối đa một active Goal để tránh double-count.
- Xóa transaction V0.6.0 hoàn nguyên Account + Credit Card/Loan + Goal link trong cùng workflow.
- Quick Suggestions chỉ dùng transaction thông thường, tránh tự điền nhầm payment liability.

## Database
Chạy duy nhất SQL mới:

`supabase/sql-editor/V0.6.0_investment_assets_unified_transactions.sql`

Sau đó có thể kiểm tra bằng:

`supabase/sql-editor/V0.6.0_investment_assets_unified_transactions_verify.sql`

Không chạy lại SQL V0.5.0 trở xuống nếu database hiện đã ở V0.5.0.

## Environment
Không có ENV mới.

---
# Finzaro V0.5.0 — Financial Goals Planner

> Feature release: điều phối nhiều Savings Goal trên cùng nguồn tiền, ưu tiên mục tiêu, phân bổ tự động/cân bằng và ước tính target date mới.

## V0.5.0 highlights
- Financial Goals Planner tại `/goal-planner`.
- Nguồn tiền mặc định lấy từ Savings Reserve của Smart Cash Flow Planner khi có.
- Strategy: **Theo ưu tiên** hoặc **Cân bằng**.
- Phân bổ tự động và chỉnh allocation từng goal.
- Cảnh báo thiếu hụt monthly funding.
- Ước tính ngày hoàn thành mới theo allocation.
- Lưu plan + allocations bằng RPC atomic và RLS.
- Không tự tạo Transaction hoặc thay đổi số dư.

Xem `docs/V0.5.0_FINANCIAL_GOALS_PLANNER_SETUP.md` để cấu hình database.

---

# Finzaro V0.4.1 — Smart Cash Flow Planner · Deploy Fix

Finzaro V0.4.1 is a patch release for V0.4.0. It fixes a Vercel/Next.js production build error in the Money Calculator keypad.

## Fixed

`components/money-calculator-input.tsx` imported `Backspace` from `lucide-react`, but the installed Lucide package does not export that symbol. V0.4.1 removes that dependency and renders the backspace glyph as a small inline SVG.

## Database

No new SQL is required for V0.4.1. If V0.4.0 database setup was already applied, do not run any additional migration for this patch.

## Environment

No new environment variables are required.

## Deploy

1. Replace the V0.4.0 source with this V0.4.1 package.
2. Push to GitHub.
3. Redeploy on Vercel.
4. The installed Finzaro PWA can use its update prompt to load V0.4.1.

All Smart Cash Flow Planner features, horizontal quick suggestions and Money Calculator behavior from V0.4.0 remain intact.
