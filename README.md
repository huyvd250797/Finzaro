# Finzaro V0.2.0 — Financial Health Score & Intelligence

Finzaro là PWA quản lý tài chính cá nhân chạy Next.js + TypeScript + Supabase + Vercel. V0.2.0 bổ sung Financial Health Score có giải thích và Quick Transaction Suggestions để nhập giao dịch nhanh hơn.

## Điểm mới V0.2.0

- Trang `/health` với Financial Health Score 0–100.
- 7 subscore có trọng số: Cash Flow, Savings, Budget, Liquidity, Debt, Credit, Net Worth Trend.
- `Data Confidence` để phân biệt score mạnh/yếu do dữ liệu thiếu.
- Financial Intelligence dạng rule-based với hành động đề xuất và deep-link tới module liên quan.
- Health snapshot theo ngày + lịch sử score.
- Quick transaction suggestions: ưu tiên giao dịch nhập nhiều, sau đó giao dịch gần đây.
- Chọn suggestion sẽ tự fill title, account, amount, category, notes; ngày vẫn là hôm nay.
- Người dùng có thể chỉnh lại field rồi lưu hoặc lưu ngay nếu dữ liệu gợi ý đã đúng.
- Không tạo bảng suggestion riêng; suggestion được suy ra trực tiếp từ ledger.
- Navigation bổ sung `Sức khỏe tài chính` ở desktop và Bottom Sheet `Thêm` trên mobile.
- Giữ nguyên toàn bộ PWA, scroll-lock, theme bootstrap và mobile taskbar từ V0.1.0.

## SQL cần chạy

Supabase → SQL Editor → Run:

`supabase/sql-editor/V0.2.0_financial_health_score.sql`

Verify tùy chọn:

`supabase/sql-editor/V0.2.0_financial_health_score_verify.sql`

Không chạy lại migration cũ nếu database đã ở V0.1.0.

## ENV

Không có biến mới. Xem `.env.example`.

## Commands

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

## Versioning

Finzaro dùng `X.Y.Z`:

- `X`: major workflow/architecture change.
- `Y`: module/feature mới.
- `Z`: bug/UI/performance/deploy fix.

V0.2.0 là feature release nên tăng `Y` từ V0.1.0.

## Tiếp theo

**Finzaro V0.3.0 — Forecasting & Scenario Planning**: dự báo dòng tiền, mô phỏng kịch bản thu nhập/chi tiêu/lãi suất, stress-test nghĩa vụ nợ và runway tài chính dựa trên dữ liệu hiện hữu.
