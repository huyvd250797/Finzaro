# Finzaro V3.3.0 — Premium Visual Foundation Design System

## Nguyên tắc thiết kế

Giao diện quản lý tài chính phải ưu tiên phân cấp số liệu, độ tương phản dễ đọc, tốc độ tương tác và nhận diện xanh ngọc Finzaro. Hạn chế animation trang rộng, filter blur lớn, font tải từ mạng và shadow nặng. Không sử dụng mã màu để biểu thị Thu/Chi mà không kèm text hoặc ký hiệu.

## Semantic tokens

| Mục đích | CSS token | Light | Dark |
|---|---|---|---|
| Nền ứng dụng | `--fin-canvas` | `#f3f7f5` | `#0b1412` |
| Bề mặt thẻ | `--fin-surface` | `#ffffff` | `#121f1a` |
| Bề mặt cao | `--fin-surface-elevated` | `#ffffff` | `#192a22` |
| Chữ chính | `--fin-text-primary` | `#142720` | `#ebf6ef` |
| Chữ phụ | `--fin-text-secondary` | `#60756c` | `#a3b8ab` |
| Đường viền | `--fin-edge` | `#dce8e1` | `#294036` |
| Brand accent | `--primary` | `#087e5c` | `#43d6a2` |
| Thu | `--fin-income` | `#087e5c` | `#43d6a2` |
| Chi | `--fin-expense` | `#c83652` | `#ff889d` |
| Chuyển | `--fin-transfer` | `#2369ad` | `#8ec2ff` |

Color on action buttons: trắng trên xanh đậm Light, xanh đen trên xanh sáng Dark. Các cặp màu cốt lõi đo bằng WCAG AA từ 4.5:1 trở lên (xem test).

## Typography và spacing

- Font stack: Inter nếu có sẵn → SF Pro → Segoe UI → system-ui. Không tự tải tài nguyên font bên ngoài.
- Tiêu đề trang h1: weight 780, letter spacing `-.04em`, line-height `1.16`; text số liệu dùng tabular numerals.
- Form controls: chiều cao tối thiểu 44px, border radius `.9rem`, tập trung dùng outline rõ và ring 3px. Mobile input 16px nhằm tránh auto-zoom Safari.
- Panel radius `1.35rem` (mobile `1.15rem`); màu viền và shadow sử dụng token. Không thêm blur tùy ý vào mỗi card.

## Components

- `components/ui/card.tsx`: `Card`, `CardHeader`, `CardContent`.
- `components/ui/button.tsx`: `Button` với `variant="primary|secondary|ghost|danger"` và `size="default|compact"`.
- `components/ui/input.tsx`: `Input`, `Select`, `Textarea`; tương thích props HTML gốc, cả controlled và uncontrolled.
- `components/bottom-sheet.tsx`: giữ khóa scroll, focus trap, Escape và drag-to-dismiss; bổ sung bề mặt `.fin-premium-dialog`.
- `components/app-header.tsx`, `app-sidebar.tsx`, `mobile-nav.tsx`: dùng class hook riêng, theme nhất quán.
- `components/theme-toggle.tsx`: vẫn lưu lựa chọn vào `localStorage`; init theme trước hydration tại `app/layout.tsx`.

## Accessibility & UAT

1. Tab tới skip link → Enter chuyển tới nội dung chính. Shift+Tab/Tab trong modal không thoát focus; Escape đóng được.
2. Nhấn phím số, giữ/nhả vẫn hoạt động; Reduced Motion không tạo hiệu ứng phóng thu lớn.
3. Light/Dark: card, nút, input, error, label, tooltip/badge và số tiền phải đọc được.
4. iPhone (Safari/PWA): input không zoom ngoài ý muốn, bottom bar không che vùng tương tác, scroll sheet/danh mục hoạt động bình thường.
5. Mobile 320px–430px, tablet và desktop 1024px+: không tràn ngang, số tiền dài không lấn vào nút.
6. Sau mỗi giao dịch, Tổng quan và Báo cáo nhất quán; không lặp giao dịch khi Copy; xuất Excel/CSV/PDF không đổi số liệu.
