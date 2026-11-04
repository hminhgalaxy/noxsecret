
# SKIBIDI SCRIPT — bản nâng cấp giao diện

## Cấu trúc
- `index.html`: khung trang và nạp tài nguyên.
- `assets/css/`: màu sắc, bố cục, thành phần, responsive và hồ sơ.
- `assets/js/lib/`: tiện ích, xác thực, Firebase, Turnstile và giao diện dùng chung.
- `assets/js/pages/`: từng màn hình được tải riêng.
- `api/turnstile-verify.js`: xác minh Turnstile ở máy chủ Vercel.
- `database.rules.json`: quyền truy cập Firebase Realtime Database.
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, `assets/og-cover.svg`: SEO và chia sẻ.

## Cấu hình bắt buộc trước khi triển khai
1. Giữ Firebase project đang có trong `assets/js/lib/config.js`; bật Email/Password và Google trong Firebase Authentication.
2. Trong Vercel → Project → Settings → Environment Variables, thêm:
   - `TURNSTILE_SECRET`: Secret Key riêng tư từ Cloudflare.
   - `TURNSTILE_HOSTNAMES`: tên miền triển khai, phân tách bằng dấu phẩy (không gồm `https://`).
3. Redeploy sau khi thêm biến môi trường. Secret Key không được đặt trong HTML, CSS hoặc JS công khai.
4. Cập nhật `YOUR-DOMAIN` trong `sitemap.xml` bằng tên miền thật.
5. Deploy `database.rules.json` vào Firebase Realtime Database.

## Cloudflare Turnstile
Giao diện sử dụng Site Key đã cung cấp, gắn action riêng cho đăng nhập, đăng ký và khôi phục mật khẩu. Mỗi token được gửi đến `/api/turnstile-verify`; endpoint máy chủ gọi Cloudflare Siteverify, kiểm tra `success`, `action` và hostname (nếu đã cấu hình). Token Turnstile hết hạn sau 5 phút và chỉ dùng được một lần.

Cloudflare Turnstile Spin hiện yêu cầu Wrangler 4.109+ và một bước xác nhận mapping trước khi tự lấy secret từ dashboard. Bản này không tự chạy Wrangler hoặc truy cập tài khoản Cloudflare; hãy đặt Secret Key trong Vercel Environment Variables như hướng dẫn trên.

## Hồ sơ
Ảnh đại diện và ảnh bìa được thu nhỏ/nén trên trình duyệt trước khi lưu vào `nox_profiles/{uid}`. ID dùng node `nox_profile_ids` để tránh trùng. Quy tắc Realtime Database khóa ID sau lần đổi và áp dụng thời gian chờ 7 ngày cho tên hiển thị. Nên kiểm thử lại trên project Firebase thật trước khi mở công khai vì rules hiện tại của website cũng bao gồm các node dữ liệu cũ.

## Kiểm thử
Chạy `node --test tests/rules.test.mjs`. Kiểm thử trình duyệt trong `tests/e2e.test.mjs` cần cài Playwright (`npm install` trong thư mục `tests`) và cấu hình browser tương ứng.
