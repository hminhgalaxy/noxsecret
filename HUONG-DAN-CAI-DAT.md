# SKIBIDI SCRIPT — hướng dẫn triển khai

## 1. Firebase
- Giữ nguyên Firebase project đang dùng trong `assets/js/lib/config.js`.
- Trong Firebase Authentication, bật Email/Password và Google nếu muốn dùng nút Google.
- Thêm domain triển khai vào Firebase Authentication → Authorized domains.
- Kiểm tra Realtime Database Rules bằng bộ kiểm thử trong thư mục `tests`.

## 2. Cloudflare Turnstile
- Site key công khai đã được đặt trong `assets/js/lib/captcha.js`.
- Trong Cloudflare Turnstile, domain widget phải khớp domain triển khai (ví dụ `skibidiscript.vercel.app`).
- Lấy **Secret key** tương ứng trong Cloudflare Dashboard.
- Vercel → Project → Settings → Environment Variables:
  - Name: `TURNSTILE_SECRET_KEY`
  - Value: Secret key của widget (không đưa secret key vào HTML/JavaScript hoặc GitHub).
  - Chọn Production, Preview và Development theo môi trường cần dùng.
- Redeploy sau khi thêm/cập nhật biến môi trường.
- Endpoint `/api/turnstile` xác minh token ở máy chủ Cloudflare. Nếu thiếu secret key, xác minh sẽ từ chối an toàn.

## 3. Kiểm tra sau triển khai
- Thử đăng ký, đăng nhập email/mật khẩu, quên mật khẩu và Google.
- Thử CAPTCHA trên cả điện thoại và máy tính.
- Thử mở `/profile`, cập nhật tên và ảnh đại diện.
- Kiểm tra menu Danh mục, Dev Panel (bằng tài khoản DEV), các trang Script/APK/iOS/Links.
- SEO: sitemap tại `/sitemap.xml`, robots tại `/robots.txt`.

## 4. Ghi chú
- CAPTCHA hiện được xác minh cho luồng đăng nhập và đăng ký bằng email/mật khẩu. Nút đăng nhập Google dùng Google Identity Services hiện có.
- Không thể cam kết tuyệt đối không phát sinh lỗi trên mọi thiết bị/trình duyệt; cần kiểm thử trên domain thật sau khi cấu hình Firebase, Google OAuth và Turnstile.
- Bộ kiểm thử quy tắc Firebase có thể chạy bằng `node --test tests/rules.test.mjs`. Bộ E2E cần cài Playwright/Chromium riêng.
