# SKIBIDI SCRIPT WEB — hướng dẫn nhanh

## Cấu trúc
- `index.html` — khung trang, SEO, nạp trước các file cần thiết
- `assets/css/` — tokens (màu), base, layout (menu/đầu trang), components, loader, pages, auth, dev
- `assets/js/lib/` — lõi: router, store (dữ liệu + bộ nhớ đệm), auth, seo, turnstile (captcha), nav, ui...
- `assets/js/pages/` — mỗi trang một file: home, categories, search, profile, settings, notifications, auth/*, items/*, dev/*
- `api/verify-captcha.js` — xác minh captcha ở máy chủ Vercel
- `api/sitemap.js` — tạo sitemap.xml tự động (cả từng mục nội dung)
- `api/account.js` + `api/_lib/` — máy chủ thư/2 bước/khôi phục/ban (cần `package.json` → `firebase-admin`)
- `robots.txt`, `manifest.webmanifest`, `vercel.json`, `database.rules.json`

## Việc bạn cần làm trên Vercel
1. Vercel → Settings → Environment Variables → thêm `TURNSTILE_SECRET_KEY` = khoá bí mật (Secret key) của widget Cloudflare Turnstile → Redeploy.
   (Chưa thêm thì captcha chỉ kiểm tra ở trình duyệt.)
2. Cloudflare Turnstile → widget → Hostname: thêm `skibidiscript.vercel.app`.
3. Firebase Console → Authentication → Settings → Authorized domains: có `skibidiscript.vercel.app`.
4. **Bắt buộc lần này:** dán lại `database.rules.json` vào Firebase Console → Realtime Database → Rules → Publish. Bản này thêm nhánh `nox_admin` (quyền biên tập viên, mute, ban), `bio` + `avatar` trong hồ sơ, và biên tập viên được ghi `nox_data`. Chưa làm thì: đổi mô tả/ảnh, cấp quyền, mute, ban sẽ báo lỗi quyền.
4b. **Đăng nhập khách:** Firebase Console → Authentication → Sign-in method → bật **Anonymous**. Chưa bật thì nút "Tiếp tục với tư cách khách" báo không dùng được.
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

## Giai đoạn 1 (bản này)
- **Ngôn ngữ chính là English.** Ai chưa chọn gì sẽ thấy English; chọn Tiếng Việt trong Cài đặt thì được nhớ.
- **Hộp xác nhận riêng** (không phải hộp "website cho biết" của trình duyệt) cho: đăng xuất, xoá mục/danh mục/bài cập nhật/ảnh đại diện, bật bảo trì, gỡ hình nền/nhạc, đặt lại cài đặt, cấp quyền, mute, ban.
- **Cài đặt mới:** kính mờ có thanh **Độ mờ** và **Độ trong**; **Hình nền** (ẩn hẳn, chỉnh độ sáng); **Âm thanh** (tắt nhạc, âm lượng); **Thoải mái khi dùng** (giảm chuyển động, tương phản cao, bố cục gọn, ẩn màn hình mở đầu); **Đặt lại**.
- **Giao diện sáng:** chữ đã được chỉnh để đủ tương phản (đã kiểm bằng công thức WCAG trên các trang chính, cả khi bật kính mờ).
- **Hồ sơ:** đổi ảnh đại diện (tự cắt vuông, thu nhỏ, lưu trong Realtime Database) và mô tả bản thân (tối đa 300 ký tự).
- **Khách:** vào bằng một nút, chỉ xem/sao chép; không có hồ sơ, không ghi được dữ liệu, không được tính là người dùng.
- **Dev Panel → Người dùng:** cấp/gỡ **biên tập viên** (thêm, sửa, xoá nội dung; không đụng được danh mục, giao diện, người dùng), **mute** (không đổi được tên/mô tả/ảnh), **ban** (bị đăng xuất ngay, không dùng được trong thời hạn đặt). Có thời hạn 1 giờ → vĩnh viễn và lý do.
  Lưu ý: ban được áp dụng bằng Rules + đăng xuất phía trình duyệt; giai đoạn 2 đã thêm khoá thật trên Firebase Authentication (xem bên dưới).
- **Biểu tượng danh mục:** 54 biểu tượng, bảng chọn cuộn được.
- Captcha **không đổi**.

## Giai đoạn 2 (đã làm — cần bạn bật bằng khoá của bạn)
**Có gì:** thư HTML 100% tiếng Anh có logo + "SkibidiScript • skibidiscript.vercel.app" (xác minh email, đặt lại mật khẩu, đổi email, chào mừng, mã 2 bước, email khôi phục, đổi mật khẩu, cấp/gỡ biên tập viên, mute, ban…); **xác minh 2 bước** bằng mã 6 số gửi qua email (hiệu lực 10 phút, tối đa 5 lần sai, gửi lại sau 30 giây); **email khôi phục** (thêm/đổi/xoá, dùng để nhận mã đăng nhập hoặc nhận liên kết đặt lại mật khẩu); **đổi email đăng nhập** (cần mật khẩu, gửi liên kết tới email mới và báo email cũ); trang **/auth/action** (đặt mật khẩu mới, xác minh email…); **ban thật** trên Firebase Authentication (ban vĩnh viễn = vô hiệu hoá tài khoản; ban có thời hạn = thu hồi phiên và chặn bằng Rules); **Dev Panel → Gửi thư**: văn mẫu trả lời người dùng (cảm ơn, nâng cấp, bảo trì…), xem trước mọi thư tự động và gửi thử cho chính bạn.

**Chưa cấu hình thì sao:** web vẫn chạy bình thường như giai đoạn 1 (quên mật khẩu/xác minh dùng thư mặc định của Firebase, mục 2 bước bị ẩn, trang Gửi thư báo "chưa được bật"). Captcha **không đổi**.

**Các bước bạn cần làm:**
1. **Brevo** (brevo.com, gói miễn phí): Senders & IP → thêm và **xác minh** email gửi đi (Brevo gửi thư xác nhận vào hộp thư đó). SMTP & API → tạo **API key**.
2. **Firebase service account:** Firebase Console → Project settings → Service accounts → *Generate new private key* → tải file JSON. (Giữ bí mật, đừng đưa vào mã.)
3. **Vercel → Settings → Environment Variables** (rồi Redeploy):
   - `BREVO_API_KEY` = khoá ở bước 1
   - `MAIL_FROM_EMAIL` = email đã xác minh ở bước 1
   - `MAIL_FROM_NAME` = `skibidiscript` (tuỳ chọn)
   - `MAIL_REPLY_TO` = email nhận trả lời (tuỳ chọn)
   - `FIREBASE_SERVICE_ACCOUNT` = dán nguyên nội dung file JSON (hoặc mã base64 của nó)
   - `FIREBASE_DATABASE_URL` (tuỳ chọn, nếu khác mặc định), `SITE_URL` (tuỳ chọn, mặc định `https://skibidiscript.vercel.app`), `CODE_SALT` (chuỗi ngẫu nhiên dài, nên đặt), `DEV_EMAIL` (tuỳ chọn)
4. Dán lại **`database.rules.json`** vào Firebase Console → Realtime Database → Rules → Publish (thêm nhánh `nox_security` và điều kiện 2 bước cho các quyền ghi). Bật **Anonymous** (xem 4b) nếu chưa.
5. Firebase Console → Authentication → Templates: bạn tự chỉnh tên người gửi (`skibidiscript`) và mẫu thư mặc định nếu muốn (mẫu mặc định chỉ còn dùng khi máy chủ thư chưa bật).
6. Vào **/profile** bằng một tài khoản đã xác minh email: có mục "Two-step verification and recovery". Vào **/dev/mail** để xem trước và gửi thử.

**Lưu ý trung thực:** thư gửi từ địa chỉ Gmail qua Brevo có thể vào thư rác, hoặc Brevo/Gmail đổi người gửi hiển thị; muốn thư vào hộp chính nên dùng tên miền riêng đã xác thực (SPF/DKIM). Logo trong thư chỉ hiện khi website đã được đưa lên `skibidiscript.vercel.app`. Chưa có logo bên cạnh người gửi (BIMI cần tên miền riêng và chứng chỉ).
