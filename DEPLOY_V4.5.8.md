# Finzaro V4.5.8 — Comparison Icon Alignment Fix

## Nội dung chỉnh sửa
- Khắc phục icon xu hướng nằm lệch xa bên trái khi dòng biến động quá dài, đặc biệt trong card tháng Thu/Chi trên iPhone.
- Nhóm icon với cụm từ chỉ chiều hướng thành một cụm **không tách dòng**, khoảng cách **2px**, icon cùng hàng với chữ: `Tăng chi`, `Giảm chi`, `Tăng thu`, `Giảm thu`, `Thu/Chi vượt`, `Thu/Chi thấp hơn`.
- Giá trị chênh lệch và tỷ lệ % có thể xuống dòng phía sau cụm icon + nhãn, vẫn căn phải và không kéo icon ra khỏi nhãn.
- Trường hợp không đổi sử dụng dấu trừ trung tính đặt inline với chữ.
- Không thay đổi công thức hoặc dữ liệu so sánh theo toàn bộ kỳ trước của V4.5.7.

## Database
- **Không cần SQL migration mới cho V4.5.8**.
- Chỉ yêu cầu DB đã có RPC/migration V4.5.7. Không cần chạy lại migration nếu bản trước hoạt động bình thường.

## QA sau deploy
1. iPhone và desktop, cả light/dark: card Ngày/Tháng/Năm, đổi giữa Thu và Chi; kiểm tra icon luôn sát cụm từ chỉ hướng biến động.
2. Chênh lệch số tiền dài như `Thu thấp hơn 16.637.524 đ (−40,55%)`: phần tiền/phần trăm được phép xuống dòng, không được để icon đứng riêng cách xa nhãn `Thu thấp hơn`.
3. Tăng, giảm, mới phát sinh, không đổi đều giữ dấu, màu sắc đúng và không gây tràn ngang ở màn hình hẹp.
4. Release gate: `npm run check` trong môi trường npm có đầy đủ dependencies. Kiểm tra màn hình thật trên iOS Safari/PWA sau deploy.
