# SKIBIDI SCRIPT WEB — hướng dẫn nhanh

## Cấu trúc
- `index.html` — khung trang, SEO, nạp trước các file cần thiết
- `assets/css/` — tokens (màu), base, layout (menu/đầu trang), components, loader, pages, auth, dev
- `assets/js/lib/` — lõi: router, store (dữ liệu + bộ nhớ đệm), auth, seo, turnstile (captcha), nav, ui...
- `assets/js/pages/` — mỗi trang một file: home, categories, search, profile, settings, notifications, auth/*, items/*, dev/*
- `api/verify-captcha.js` — xác minh captcha ở máy chủ Vercel
- `api/sitemap.js` — tạo sitemap.xml tự động (cả từng mục nội dung)
- `robots.txt`, `manifest.webmanifest`, `vercel.json`, `database.rules.json`

## Việc bạn cần làm trên Vercel
1. Vercel → Settings → Environment Variables → thêm `TURNSTILE_SECRET_KEY` = khoá bí mật (Secret key) của widget Cloudflare Turnstile → Redeploy.
   (Chưa thêm thì captcha chỉ kiểm tra ở trình duyệt.)
2. Cloudflare Turnstile → widget → Hostname: thêm `skibidiscript.vercel.app`.
3. Firebase Console → Authentication → Settings → Authorized domains: có `skibidiscript.vercel.app`.
4. **Bắt buộc lần này:** dán lại `database.rules.json` vào Firebase Console → Realtime Database → Rules → Publish (có thêm nhánh `nox_updates` cho mục "Cập nhật này có gì?"). Chưa làm thì DEV đăng cập nhật sẽ báo lỗi quyền.
5. Nếu dùng tên miền riêng, thay `https://skibidiscript.vercel.app` trong `index.html`, `robots.txt`, `api/sitemap.js`, `assets/js/lib/seo.js`.

## Kiểm thử (tuỳ chọn)
`cd tests && node rules.test.mjs && node e2e.test.mjs` (cần Playwright + Chromium).


## Tính năng mới (bản này)
- **Đầu trang:** menu bên trái, chuông + avatar bên phải, logo + tên SKIBIDI SCRIPT ở chính giữa (tự cân bằng trên điện thoại / máy tính).
- **Chuông thông báo:** sáng khi DEV đăng bài mới ở Dev Panel → Cập nhật (hoặc sửa thông báo). Mở trang Thông báo là tắt.
- **Cài đặt:** Giao diện (Tối / Sáng / Theo thiết bị), **Kính mờ** (tắt = khung màu đặc đen/trắng; bật = khung trong suốt chỉ còn viền), **Ngôn ngữ** (Tiếng Việt / English).
  Bản English dùng từ điển `assets/js/lib/i18n-en.js` (chuỗi nào chưa có sẽ giữ tiếng Việt). Nội dung do DEV/người dùng nhập không bị dịch.
- **Email:** gợi ý `example@gmail.com`; kiểm tra phải có `@` và phần đuôi tên miền (ví dụ `.com`). Đuôi khác như `.vn` vẫn được chấp nhận.
- **Dev Panel → Kiểm tra hệ thống:** chạy thử kết nối dữ liệu, quyền ghi, đăng nhập, Google, Cloudflare, tệp SEO, tốc độ, bộ nhớ; lỗi nào cũng hiện nguyên nhân + cách sửa ngay.
- **Cloudflare:** `*.vercel.app` không thể đặt sau Cloudflare. Muốn Cloudflare bảo vệ cả website: thêm tên miền riêng vào Cloudflare, bật Proxied (đám mây cam) cho bản ghi trỏ tới Vercel. Trang Kiểm tra hệ thống sẽ báo khi đã chạy qua Cloudflare.
- Captcha ở đăng nhập / đăng ký / Google **giữ nguyên** như bản trước.
