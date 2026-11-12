**Latest patch:** V1.7.1 – GitHub Overlay Deploy Stability Fix. Source sync clears stale discontinued module code before the strict six-module prebuild gate.

# Finzaro Versioning Policy

Từ release Net Worth & Financial Position, Finzaro dùng phiên bản `X.Y.Z` theo quy ước dự án:

- `X` — nâng cấp lớn: thay đổi quy trình chính, kiến trúc vận hành hoặc đưa vào một workflow mới có ảnh hưởng lớn tới cách người dùng sử dụng Finzaro.
- `Y` — feature release: thêm module/chức năng mới nhưng không làm thay đổi lớn các quy trình hiện hữu.
- `Z` — patch release: sửa bug, deploy fix, tối ưu hiệu năng, accessibility, giao diện/UX hoặc thay đổi nhỏ không tạo module nghiệp vụ mới.

Quy tắc tăng version:

- Tăng `X` → reset `Y = 0`, `Z = 0`.
- Tăng `Y` → reset `Z = 0`.
- Tăng `Z` → giữ nguyên `X.Y`.
- **Mỗi lần source được hiệu chỉnh và đóng gói thành một release mới để push/deploy, version bắt buộc phải tăng.** Không phát hành hai gói source khác nhau cùng một version.
- Bugfix, deploy fix, UI/UX fix, performance tuning hoặc thay đổi nhỏ nối tiếp cùng feature line → tăng `Z` tuần tự (`0.7.1` → `0.7.2` → `0.7.3`...).

Ví dụ:

- `0.1.0` — Net Worth & Financial Position: module mới → tăng `Y`.
- `0.1.1` — fix UI/PWA/build cho release `0.1.0` → tăng `Z`.
- `0.2.0` — Financial Health Score & Intelligence: module mới tiếp theo → tăng `Y`.
- `1.0.0` — khi Finzaro có thay đổi workflow/architecture lớn đủ để coi là major release → tăng `X`.

Lưu ý: release từng được dự kiến tên `V0.0.13 – Net Worth & Financial Position` được phát hành thành **V0.1.0** để bắt đầu áp dụng quy ước mới.


## Current baseline

- `V1.0.0` is the historic Production Release milestone.
- `V1.1.9` was the last feature-heavy source release.
- **`V1.2.0 — Simple Expense Management`** is the new simplified product baseline, removing 13 advanced financial modules and keeping 6 basic modules.
- Any subsequent source patch must increment the version (`V1.2.1`, `V1.2.2`...). Do not reuse `V1.2.0` for different source bundles.
- Supabase legacy schema migration identifiers and old transaction data are deliberately preserved even though those modules are no longer presented to users.

- **`V1.2.1 — Performance & Report Integrity`** is the source-only stability/performance patch on V1.2.0. Next source release must be `V1.2.2` or higher.

- **`V1.2.2 — Transaction TypeScript Deploy Fix`** patches the V1.2.1 source to address `TS18047` in transaction edit. Next changed source package must be `V1.2.3` or higher.

- **`V1.4.0 — Combined Stability + Design System + Transaction UX 2.0`** includes all approved V1.2.3/V1.3.0 work. The prior source baseline was V1.2.2; V1.2.3 and V1.3.0 are implementation phases, not separate distributed ZIPs. Next changed release must be V1.4.1 or higher.

- **`V1.4.1 — Transaction RPC TypeScript Deploy Fix`** corrects TS2339 for all three transaction RPC responses. The next planned combined UX source release is V1.7.0.

- **`V1.7.0 — Combined Smart Calendar + Reports & Charts + Overview & Navigation UX`** includes the V1.5.0 and V1.6.0 implementation phases. Source baseline: V1.4.1. Only V1.7.0 is shipped; V1.5.0 and V1.6.0 were not separate ZIP releases. The next changed source package must be `V1.7.1` or higher.

- **`V1.7.1 — GitHub Overlay Deploy Stability Fix`** guarantees source reconciliation before prebuild.
- **`V2.0.0 — Finzaro UX Release`** combines V1.8.0, V1.9.0, V2.0.0 phases in a single release on V1.7.1. Next modified source must be V2.0.1 or higher.

- **`V2.0.1 — Performance & Transaction Experience`** removes the fixed 700 ms splash, streams the first dashboard separately from historical charts, groups transaction history by transaction date, adds safeguarded multi-day copying, and unifies swipe-dismissable bottom sheets. The next source update must increment to V2.0.2 or higher.

- **`V3.3.0 — Premium Visual Foundation`** nâng cấp đồng bộ giao diện Light/Dark và các UI primitives; source baseline V3.2.1, không có SQL migration mới.

- **`V3.4.0 — Mobile-First Transaction UX`** sửa bottom sheet/scroll và nút Lưu trên iPhone, kế thừa V3.3.0. Không có SQL mới; bản tiếp theo phải cao hơn V3.4.0.
