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

## Đợt A (tài khoản + bảo mật) — thay đổi so với giai đoạn 2
- **Quên mật khẩu bằng MÃ** (không còn liên kết): nhập email → nhận mã 6 số → nhập mã + mật khẩu mới. Có nút "dùng email khôi phục" (mã gửi tới email khôi phục). Chưa cấu hình máy chủ thư thì web quay về thư liên kết mặc định của Firebase.
- **Đổi mật khẩu trong hồ sơ** (mục Bảo mật): cần mật khẩu hiện tại + mã gửi về email; đổi xong mọi thiết bị bị đăng xuất, có thư cảnh báo.
- **Hồ sơ chia 3 mục:** Tổng quan / Chỉnh sửa hồ sơ / Bảo mật. Nút Đăng xuất nằm ở đầu trang hồ sơ.
- **Kiểm tra IP ngầm:** lần đăng nhập đầu tiên web ghi nhớ dấu vân tay (băm HMAC) của dải IP, KHÔNG lưu IP thật. Đăng nhập từ dải IP khác phải nhập mã gửi về email (thư "new location", có tên thành phố/quốc gia lấy từ header của Vercel). Nhập đúng thì IP đó được tin (tối đa 10 IP). Bật 2 bước thì lần nào cũng cần mã. Cơ chế "cổng" (`gate`) trong `nox_security` được máy chủ đặt, client không tự bỏ được; **phải Publish lại `database.rules.json`** (bản mới dùng `gate`).
- **Bảo trì:** màn bảo trì không còn nút đăng nhập admin (dev vào thẳng `/login`); khi đang bảo trì tài khoản dev không đăng xuất được.
- **Tường lửa nhẹ:** header bảo mật (nosniff, HSTS, COOP, X-Frame-Options, CSP chống nhúng/`object`/`base`), giới hạn 240 yêu cầu / 10 phút mỗi IP cho API, giới hạn riêng cho từng hành động (gửi mã, đổi mật khẩu…). **Chống DDoS thật nằm ở Vercel**: bật *Vercel Firewall / Attack Challenge Mode* trong Project → Firewall; cần mạnh hơn thì đặt Cloudflare (miễn phí) trước web. CSP chặt cho script chưa bật vì chưa thể thử với Google/Cloudflare/Firebase thật mà không làm hỏng captcha.

## Đợt B (đồ họa + giao diện + nội dung) — thay đổi so với đợt A
- **Mức đồ họa (Cài đặt → thanh kéo, 3 bậc):** mặc định **Tối ưu** (nền ô vuông đứng yên, bố cục gọn, không hiệu ứng chuyển động, bỏ màn mở đầu, không hình nền); **Trung bình** (lưới chuyển động nhẹ, hiệu ứng vừa phải, vẫn không hình nền); **Cao** (hình nền website + âm thanh + hiệu ứng nâng cao: ánh sáng theo con trỏ, viền sáng, nút sáng quét). Lên mức Cao có hộp cảnh báo, huỷ thì giữ mức cũ. Lựa chọn nhớ trên từng trình duyệt (`ssw_gfx`). Mỗi mức có kiểu nút/thẻ/danh mục riêng (`assets/css/gfx-*.css`). Âm thanh vẫn bật ở cả 3 mức.
- **Trợ giúp → Câu hỏi thường gặp (`/help`):** ~30 câu chia 5 nhóm, có ô tìm (gõ không dấu cũng được), song ngữ Việt/Anh, nhóm dài chỉ hiện 4 câu kèm nút "Hiển thị tất cả". Nhóm "Trợ giúp" trong menu sẽ chứa thêm Hỗ trợ / Báo cáo / Nhắn tin với dev ở đợt C.
- **Đoạn dài thu gọn:** mô tả mục, bài cập nhật, phần giới thiệu trong hồ sơ tự thu gọn nếu dài, có nút "Hiển thị tất cả" / "Thu gọn" (chỉ hiện khi thật sự dài).
- **Ảnh chỉ lấy từ máy:** ô "Link ảnh" của mục đã bỏ; thay bằng **Chọn ảnh từ máy** (tự thu nhỏ ≤ 640px, nén JPEG ≤ ~30 KB, lưu cùng dữ liệu). Ảnh cũ dạng link ngoài **không còn được tải** (xoá khi bạn lưu lại mục). Ảnh nền/nhạc của Dev và ảnh đại diện vốn đã chọn từ máy. Cần **dán lại `database.rules.json`** (nhánh `img` nay nhận `data:image/...`).
- **Tiêu đề mới:** "SKIBIDI SCRIPT WEB — Nơi chia sẻ APK tiện ích, bảo mật cao" (và bản tiếng Anh), mô tả nói rõ: kiểm duyệt trước khi đăng, cảnh báo phần mềm bên thứ ba, không cổ xúy hack. Áp dụng cho thẻ title/description/Open Graph, manifest, trang chủ, sitemap (có thêm `/help`) và thư chào.

## Đợt C — thay đổi so với đợt B

> **Bắt buộc:** dán lại toàn bộ `database.rules.json` vào Firebase → Realtime Database → Rules → **Publish** (có thêm `nox_perms`, `nox_pending`, `nox_threads`, `nox_msgs`, `nox_tracks`, `nox_trackdata`, loại bài cập nhật, ảnh mục). Chưa publish thì các tính năng mới báo lỗi quyền.

- **Danh mục do dev quản lý (Dev → Danh mục):** Script / APK / iOS / Link không còn cố định — sửa tên, mô tả, màu, xóa và khôi phục như mọi danh mục khác. Xóa danh mục **không** xóa nội dung bên trong (khôi phục lại là thấy đủ). Mỗi danh mục có **loại cần có** (link / code / cả hai) và **phân loại rủi ro** (Bình thường / Bên thứ ba / Hack-mod…). Có phân loại rủi ro thì người xem phải đọc cảnh báo **20 giây** mới bấm "Tôi đã đọc" được; có ô "không hỏi lại với danh mục này".
- **Hỗ trợ · Báo cáo · Nhắn tin với dev (Trợ giúp):** người dùng đăng nhập gửi yêu cầu hỗ trợ, báo cáo một mục (nút **Báo cáo** ở trang mục) hoặc chat; xem lại ở **Tin nhắn của tôi**. Dev xử lý ở **Dev → Hộp thư** (trả lời, đóng cuộc, cấp/thu hồi quyền đăng bài).
- **Người dùng gửi danh mục/mục (Trợ giúp → Đăng nội dung):** cần đủ 3 điều kiện — email đã xác minh, đã bật xác minh 2 bước, và được dev cấp phép (xin phép ở mục Hỗ trợ). Bài hiện nhãn **Đang xem xét**, không bao giờ hiện công khai trước khi dev duyệt ở **Dev → Duyệt bài** (duyệt = đăng, từ chối = kèm lý do cho người gửi). Chỉ nhận link https://, ảnh chọn từ máy.
- **Nhạc nền nối tiếp:** Dev → Giao diện → **Thêm nhạc** (chọn một hoặc nhiều tệp, tối đa ~6,5 MB/bài, 30 bài). Phát hết bài này sang bài kế rồi lặp lại; người dùng có nút **Bài tiếp theo** ở Cài đặt. Dữ liệu nhạc chỉ tải khi tới lượt phát nên trang không nặng hơn. Nhạc đơn cũ (nếu có) vẫn phát đầu tiên và xóa được trong cùng danh sách.
- **Hình nền nổi bật hơn:** lớp phủ nhẹ hơn, tối dần ở mép, màu sống động hơn, mức Cao có chuyển động chậm và nghiêng nhẹ theo con trỏ (`assets/css/bg-stage.css`, `assets/js/lib/fx/parallax.js`).
- **Kính mờ nâng cấp:** cạnh sáng, độ bão hòa cao hơn, ô nhập mờ (`assets/css/glass-plus.css`).
- **Tách file đồ họa:** CSS chia thành `gfx-bg / gfx-low / gfx-mid / gfx-high / gfx-motion / gfx-fx / gfx-ui`; JS hiệu ứng chia thành `assets/js/lib/fx/` (`pointer-light`, `parallax`, `reveal`, `ripple`), `gfx.js` chỉ khởi động. Mức Tối ưu không chạy hiệu ứng nào.
- **SEO:** 6 trang công khai `/about /guide /apk-safety /security /terms /privacy` (hai ngôn ngữ, nội dung ở `lib/info-content.js`), JSON-LD theo trang (breadcrumb, nhà xuất bản, ảnh), logo là `ImageObject` 512×512 trong JSON-LD tổ chức, `favicon.ico` + `mask-icon`, liên kết trang thông tin ở chân trang, sitemap có thêm các trang này và ảnh logo.
- **"Cập nhật này có gì":** mỗi bài có thể gắn loại (Tính năng mới / Cải tiến / Sửa lỗi / Bảo mật), dòng bắt đầu bằng `-` thành danh sách, dev **sửa** được bài đã đăng (không làm chuông sáng lại), trang Thông báo có bộ lọc theo loại.
- **Quên mật khẩu bằng mã:** khi máy chủ gửi thư đã cấu hình đúng, quên mật khẩu hiển thị ô nhập mã 6 số. Nếu `serverReady()` còn sai (thiếu biến môi trường), trang tạm dùng luồng liên kết cũ của Firebase cho tới khi bạn cấu hình xong.
- **Chưa làm / hạn chế:** giới hạn tối đa 30 bài nhạc chỉ được kiểm tra ở phía trình duyệt của dev (Firebase Rules không đếm được số con của nút cha). Tường lửa chỉ ở mức ứng dụng (giới hạn tần suất, quy tắc dữ liệu); không phải tường lửa mạng.

## Không nhận được thư? Kiểm tra theo thứ tự
1. **Redeploy:** thêm/sửa biến môi trường trên Vercel KHÔNG áp dụng cho bản đang chạy. Vào Deployments → bản mới nhất → ⋯ → **Redeploy**.
2. Vào web bằng tài khoản dev → **Dev → Gửi thư**. Trang này tự hiện lý do nếu thiếu/sai biến (tên biến sai chính tả, `MAIL_FROM_EMAIL` có kèm tên, khoá Brevo là khoá SMTP `xsmtpsib-` thay vì khoá API `xkeysib-`, `FIREBASE_SERVICE_ACCOUNT` không phải JSON…). Khi đã bật, bấm **Kiểm tra với Brevo**: web gọi thật tới Brevo và báo (✓/✗) khoá API, SMTP đã bật chưa, địa chỉ người gửi đã xác minh chưa.
3. Phía Brevo: (a) Senders → thêm đúng địa chỉ trong `MAIL_FROM_EMAIL` và bấm liên kết xác minh Brevo gửi về hộp thư đó; (b) tài khoản mới có thể phải được Brevo kích hoạt gửi thư giao dịch (SMTP) — Brevo → SMTP & API.
4. Thư từ địa chỉ Gmail có thể vào **Spam/Quảng cáo**. Muốn vào hộp thư chính nên dùng tên miền riêng đã xác thực (SPF/DKIM) trong Brevo → Domains.
5. Xem log: Vercel → Logs → lọc `account:` — mỗi lần Brevo từ chối sẽ có dòng `mail 4xx …` ghi rõ lý do.

## Đợt D — SEO + tính năng mới

### Rules (quan trọng)
Firebase Rules **không có** `numChildren()`. File `database.rules.json` mới đã bỏ hoàn toàn; giới hạn (10 bài chờ, 30 cuộc trò chuyện, 300 tin, 30 bài nhạc) được kiểm ở phía trình duyệt. Dán lại toàn bộ file vào Realtime Database → Rules → Publish.

### SEO để tìm "skibidiscript" ra website
Code đã làm: thẻ title/description/canonical/Open Graph/Twitter cho từng trang, JSON-LD (WebSite + SearchAction, Organization, WebPage/AboutPage/CollectionPage, BreadcrumbList, FAQPage, CreativeWork cho từng mục), `sitemap.xml` tự sinh từ dữ liệu, `robots.txt`, `feed.xml` (RSS), `opensearch.xml`, `.well-known/security.txt`, `manifest.webmanifest`, `favicon.ico`, trang nội dung riêng: `/skibidiscript`, `/about`, `/guide`, `/apk-safety`, `/security`, `/terms`, `/privacy`, và nội dung `<noscript>` cho bot không chạy JS.

**Code không thể đảm bảo thứ hạng Google.** Tên miền `.vercel.app` bị Google đánh giá thấp. Để thật sự ra web khi gõ "skibidiscript" bạn cần làm:
1. Mua tên miền riêng (vd `skibidiscript.com`), gắn vào Vercel → Settings → Domains.
2. Google Search Console (search.google.com/search-console) → Thêm thuộc tính → xác minh (thẻ meta HTML hoặc DNS) → Sitemaps → gửi `https://<tên-miền>/sitemap.xml` → "Kiểm tra URL" trang chủ rồi bấm **Yêu cầu lập chỉ mục**.
3. Làm tương tự ở Bing Webmaster Tools (bing.com/webmasters) — có thể nhập thẳng từ Search Console.
4. Đặt liên kết về website ở nơi bạn có (kênh YouTube/TikTok/Discord/Telegram, bio mạng xã hội) — backlink là yếu tố lớn nhất.
5. Chờ vài ngày đến vài tuần để Google lập chỉ mục.
Nếu đổi tên miền: đặt biến môi trường `SITE_URL` trên Vercel (dùng cho thư/sitemap/feed) và thay `https://skibidiscript.vercel.app` bằng tên miền mới trong `index.html`, `robots.txt`, `opensearch.xml`, `.well-known/security.txt` (tìm & thay toàn bộ).

### Tính năng mới
- **Tìm nhanh (Ctrl+K / ⌘K)**: nhảy tới trang, danh mục, nội dung.
- **Yêu thích** (nút trái tim ở trang mục) + **Xem gần đây** → trang `/favorites`, mục "Xem gần đây" ở trang chủ. Chỉ lưu trên trình duyệt.
- **Chia sẻ** (Web Share hoặc sao chép liên kết), **Sắp xếp** trong danh mục (mới/cũ/A–Z/Z–A/sao chép nhiều).
- **Màu nhấn** trong Cài đặt (5 màu), **thanh báo mất kết nối**, **nút lên đầu trang**, **huy hiệu** số mục cần xem trên menu.
- **Danh sách nhạc nối tiếp** (dev thêm nhiều bài bằng nút "+"; nút bài kế ở Cài đặt).
- **Thẻ cập nhật** (Mới / Cải thiện / Sửa lỗi / Bảo mật) và bộ lọc ở Thông báo.
- Đồ họa: ánh sáng theo con trỏ, parallax, hiện dần khi cuộn, hiệu ứng ripple; tách file CSS theo mức đồ họa.
