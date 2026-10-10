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

- `V0.8.0` is the current Release Candidate baseline. Any subsequent source package must increment the version before distribution.
- The next production target is `V1.0.0`; any RC-only fixes before that must use a new version rather than reusing `V0.8.0`.
