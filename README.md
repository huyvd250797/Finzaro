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
