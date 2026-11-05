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
4. Deploy lại `database.rules.json` nếu bạn dùng Firebase CLI.
5. Nếu dùng tên miền riêng, thay `https://skibidiscript.vercel.app` trong `index.html`, `robots.txt`, `api/sitemap.js`, `assets/js/lib/seo.js`.

## Kiểm thử (tuỳ chọn)
`cd tests && node rules.test.mjs && node e2e.test.mjs` (cần Playwright + Chromium).
