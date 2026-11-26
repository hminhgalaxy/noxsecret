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

## Đợt E — thiết kế lại, hộp thư, thông báo, bảo mật, SEO

### Việc bạn cần làm (theo thứ tự)
1. **Dán lại `database.rules.json`** vào Firebase → Realtime Database → Rules → **Publish** (có thêm `nox_likes`, `nox_saved`, `nox_maintnotes`, `nox_probe` và xem trước tin nhắn). Thiếu bước này thì Thích / Lưu / Thông báo bảo trì / Chẩn đoán DEV sẽ báo "không có quyền".
2. **Redeploy** trên Vercel (có hàm mới `api/page.js` và `vercel.json` đã đổi: mỗi trang con có `<head>` riêng).
3. Vào Google Search Console → **Kiểm tra URL** trang chủ và vài trang con (vd `/apk`, `/about`) → **Yêu cầu lập chỉ mục**; gửi lại `sitemap.xml`. Logo (favicon) ở kết quả tìm kiếm do Google cập nhật chậm (vài ngày–vài tuần). Đã thêm favicon PNG 48/96/192 px và logo 512 px trong JSON-LD.

### Mới
- **Giao diện v2**: font Plus Jakarta Sans, màu nhấn tím–xanh, thẻ/nút/thanh tab mới, trang chủ có mục **Đăng bài**. Giao diện đẹp hơn mặc định; **Cài đặt → Sắc nét** bật chữ rõ hơn + nút bóng như bong bóng.
- **Chống nháy/giật**: giữ chiều cao khi đổi trang, chống tràn ngang, tự bật **chế độ nhẹ** khi máy giật (tắt hiệu ứng nặng), tạm dừng video nền khi chuyển tab.
- **Hộp thư** (biểu tượng thư ở đầu trang, mọi tài khoản thật dùng được): kiểu ứng dụng nhắn tin, có huy hiệu riêng. **Dev → không còn mục Hộp thư riêng**, dev trả lời ngay trong hộp thư chung.
- **Thông báo là popup** (chuông ở đầu trang), có 2 thẻ: Cập nhật · Bảo trì. Đã xóa khỏi menu.
- **Thông báo bảo trì**: Dev → Bảo trì & thông báo → mục "Thông báo bảo trì" (lên lịch / đang bảo trì / đã xong). Mục đang hoạt động hiện thành dải ngay dưới thanh trên.
- **Popup riêng cho từng việc** (xác nhận xóa, ban, mute, mật khẩu, mã xác nhận, duyệt bài…) thay cho hộp thoại cũ; trên điện thoại là tấm trượt từ đáy.
- **Bài viết**: nút **Thích** (đếm công khai, cần tài khoản thật), menu **3 chấm** (Lưu, Chia sẻ, Sao chép liên kết, Mở tab mới, Báo cáo; nhân sự có thêm Sửa/Xóa), **Lưu bài viết** → trang `/favorites` (Đã lưu · Đã thích · Gần đây). **Tìm kiếm** chỉ còn ở trang chủ/Ctrl+K (đã bỏ khỏi menu); **Đăng bài** bỏ khỏi menu, có ở trang chủ.
- **Bảo mật**: tài khoản Google **bắt buộc bật xác minh 2 bước** (web tự dẫn tới Hồ sơ). **Đổi mật khẩu** cần một trong: mật khẩu hiện tại · mã 2 bước · mã gửi tới email khôi phục.
- **Chẩn đoán quyền DEV**: Dev Panel có thẻ tự kiểm tra (email đã xác minh? token có xác nhận? phiên có thẻ 2 bước? thử ghi thật vào `nox_probe`). Bấm **Kiểm tra & sửa** để tự khắc phục; nếu thiếu thẻ phiên sẽ đưa bạn tới trang nhập mã 2 bước. Nguyên nhân gốc đã sửa: trạng thái "email đã xác minh" bị cũ sau khi tải lại, và Rules yêu cầu thẻ phiên khi cổng 2 bước đang bật.

### Còn hạn chế (nói thật)
- Đã kiểm thử bằng Firebase giả + Rules mô phỏng; **chưa thử trên Firebase/Vercel thật của bạn**.
- Không ai đảm bảo được thứ hạng/logo trên Google; phải chờ Google lập chỉ mục lại.

## Đợt Shop — web thành cửa hàng, ví, nạp tiền QR, chat nổi

> ⚠️ Phần nạp tiền tự động (SePay/Casso/webhook/VietQR) trong các đợt Shop 1–2 **đã bị gỡ ở Đợt Shop 6** (xem cuối file). Giữ lại ở đây chỉ để tham khảo lịch sử.

**Trang chủ `/` giờ là Cửa hàng.** Kho script/APK cũ vẫn còn, chuyển sang `/library` ("Kho nội dung").

### Bạn cần làm (theo thứ tự)
1. **Dán `database.rules.json` mới** vào Firebase → Realtime Database → Rules → Publish. (Rules khóa chặt: trình duyệt KHÔNG thể ghi ví/đơn/giao dịch/sản phẩm; chỉ máy chủ ghi.)
2. **Bảo đảm Vercel đã có biến Firebase Admin** (như các đợt trước: dùng để ghi ví, đơn hàng).
3. **Bật nhận tiền tự động (bắt buộc nếu muốn "chuyển khoản là tự cộng tiền")**: ngân hàng không tự báo cho web, nên phải dùng một dịch vụ trung gian đọc biến động số dư rồi gọi web của bạn. Hỗ trợ **SePay** hoặc **Casso** (cả hai đều có gói miễn phí/giá rẻ — bạn tự đăng ký, mình không đăng ký thay được):
   - Đăng ký SePay (hoặc Casso) → liên kết tài khoản **Techcombank** của bạn.
   - Thêm Webhook, địa chỉ: `https://<tên-miền-của-bạn>/api/bank-webhook`.
   - SePay: chọn kiểu xác thực **API Key**, đặt khóa bất kỳ dài, rồi đặt biến Vercel `SEPAY_API_KEY` = đúng khóa đó. (Nếu dùng chữ ký HMAC thì thêm `SEPAY_SECRET`.) Casso: đặt `CASSO_SECURE_TOKEN` = secure-token của Casso.
   - Vercel → Settings → Environment Variables → thêm biến → **Redeploy**.
   - Vào `/dev/shop` → tab **Nạp tiền & ví**: phải hiện "Máy chủ đã có khoá bảo mật cho webhook". Chuyển thử 10.000 ₫ kèm mã `SKN…` của chính bạn để kiểm tra.
4. (Tuỳ chọn) đổi tài khoản nhận tiền bằng biến `BANK_BIN`, `BANK_ACCOUNT`, `BANK_ACCOUNT_NAME`, `BANK_NAME`. Mặc định đã là Techcombank của bạn theo QR bạn gửi.

### Cách hoạt động
- Mỗi tài khoản có **mã nạp riêng** dạng `SKN12345678` (trang **Ví**). Khách chuyển khoản **kèm đúng mã này trong nội dung**, web nhận biến động số dư qua webhook và cộng tiền (thường 30–60 giây). Một giao dịch chỉ cộng **một lần** dù webhook gửi lại.
- **Nạp tiền** (chỉ với tài khoản đã đăng nhập và xác minh email, chỉ qua ngân hàng): chọn mức giá cố định (hoặc nhập số khác, 10.000–50.000.000 ₫, làm tròn nghìn) → web tạo **mã QR VietQR kèm đúng số tiền và nội dung**; quét bằng app ngân hàng nào cũng được. Popup tự đổi sang "Nạp tiền thành công" khi tiền vào.
- **Cửa hàng**: mục lục (lọc), tìm kiếm, sắp xếp, giỏ hàng, trang sản phẩm có SEO riêng. Thanh toán bằng số dư ví; hàng tự động giao ngay (mỗi dòng 1 key, hoặc cùng 1 nội dung), hoặc "giao tay" qua Hộp thư. Hết hàng thì khóa nút mua. Trừ tiền/tồn kho làm trong giao dịch nguyên tử, lỗi giữa chừng tự hoàn lại.
- **Số dư** hiện ngay trên thanh đầu trang và trong khung chat. **Lịch sử mua hàng** ở `/orders`, lịch sử giao dịch ở `/wallet`.
- **Dev** (`/dev/shop`): thêm/sửa/xóa/ẩn sản phẩm (ảnh bìa + nhiều ảnh, giá, số lượng, mục lục, cách giao hàng), quản lý mục lục, xem đơn + hoàn tiền, cộng/trừ tiền thủ công, gán giao dịch chuyển sai nội dung, xem trạng thái webhook.
- **Chat nổi** góc dưới bên phải (thay cho trang "Nhắn tin với dev"): gửi chữ, **ảnh, video, tệp**. Vì dùng Realtime Database (không có Firebase Storage) nên giới hạn: **ảnh ≤ 300 KB (tự nén), video và tệp ≤ 450 KB**. Tệp chạy được như .exe/.bat bị từ chối.

### Chưa kiểm chứng được ở đây (nói thật)
- Webhook đã test với dữ liệu giả theo định dạng SePay/Casso, **chưa test với tài khoản SePay/Casso/Techcombank thật** (cần khóa của bạn). Hãy chuyển thử số nhỏ sau khi cấu hình.
- Mã QR đã kiểm tra bằng bộ giải mã (khung khớp đúng mã QR tĩnh của bạn), nhưng chưa quét bằng app ngân hàng thật.
- Không ai bảo đảm thứ hạng Google; trang sản phẩm đã có tiêu đề/mô tả/schema Product riêng, có trong sitemap.

## Đợt Shop 2 — liên kết ngân hàng, hóa đơn 10 phút, cửa sổ nhỏ, giao diện mới

### Bạn cần làm
1. **Dán lại `database.rules.json`** (Firebase → Realtime Database → Rules → Publish). Có thêm `nox_shopcfg` (chỉ dev đọc, chỉ máy chủ ghi), dev đọc được nhật ký ví/đơn để quản trị, và cuộc trò chuyện mới chỉ còn kiểu "chat".
2. **Vercel → Redeploy** (biến môi trường như đợt trước; vẫn cần `SEPAY_API_KEY` hoặc Casso). Không cần biến mới.
3. **Liên kết ngân hàng**: đăng nhập dev → `/dev/shop` → tab **Nạp tiền & ví** → thẻ **Ngân hàng nhận tiền** → **Liên kết** (chọn ngân hàng, nhập số tài khoản, tên chủ tài khoản VIẾT HOA không dấu). Từ lúc đó mọi mã QR nạp tiền dùng tài khoản này. **Tạo mã QR** = tạo QR bất kỳ (nhập số tiền + nội dung) để tự thu tiền. **Gỡ liên kết** = quay về tài khoản mặc định/biến môi trường.
   - Nhớ: tài khoản liên kết trên web phải **trùng tài khoản đã gắn với SePay/Casso**, nếu không webhook sẽ không khớp.

### Thay đổi chính
- **Hóa đơn nạp tiền có hạn 10 phút** (đồng hồ đếm ngược). Quá hạn mà chưa được duyệt ⇒ **Thất bại**. Tạo hóa đơn mới sẽ hủy hóa đơn chờ cũ. Danh sách hóa đơn ở trang **Ví**, bấm vào để mở lại.
  - Thiết kế "không mất tiền khách": nếu khách vẫn chuyển sau khi hóa đơn thất bại, tiền **vẫn được cộng** và hóa đơn chuyển thành hoàn tất (đánh dấu "đến muộn").
- **Cửa sổ nhỏ (pop-up) riêng** thay cho các hộp thoại xấu: xác nhận, hoàn tiền, điều chỉnh ví, xóa, liên kết ngân hàng, hóa đơn, chi tiết đơn…
- **Hộp thư** là cửa sổ nhỏ bấm từ biểu tượng thư (2 tab: Tin nhắn / Hoạt động). Trang `/inbox` đầy đủ có lọc (chưa đọc, cũ…); dev có thêm khối "Việc cần xử lý".
- **Đã xóa**: Báo cáo, Hỗ trợ, FAQ, trang Nhắn tin với dev. Chat chỉ còn là cửa sổ nhỏ góc dưới. Các đường dẫn cũ (`/help/*`) tự mở khung chat. Cuộc trò chuyện cũ (hỗ trợ/báo cáo) vẫn xem được ở Hộp thư → lọc "Cũ".
- **Mỗi món đã mua**: Xem trực tiếp, Tải file về, Chia sẻ, mã đơn (`#XXXXXXXX`), thời gian mua, số tiền, trạng thái "Thành công". Mở ở `/orders` hoặc bấm từ lịch sử ví.
- **Số dư hiện trên thanh đầu cả trên điện thoại** (giỏ hàng chuyển xuống thanh dưới).
- **Chủ đề màu** (Cài đặt): Midnight (mặc định), Aurora, Ocean, Emerald, Sunset, Rose, Cổ điển (đen–trắng–xám cũ).
- **Cookie**: tùy chọn giao diện/giỏ hàng/ngôn ngữ lưu bằng cookie (có dự phòng localStorage); có thanh xin đồng ý và mục quản lý/xóa cookie trong Cài đặt.
- **Kính lỏng**: viền kính, ánh sáng; menu và popup được làm đục hơn để chữ phía sau không đè lên. (Đã sửa lỗi CSS làm nền menu bị trong suốt.)
- **Sửa lỗi**: trang Cài đặt từng bị lỗi script; mở thẳng `/inbox?tab=activity` không hiện nội dung.

### Về đoạn Python Firebase Admin bạn gửi
Website chạy Node trên Vercel (đã dùng `FIREBASE_SERVICE_ACCOUNT` + `firebase-admin`), nên đoạn Python không được web dùng. Mình thêm `tools/admin.py` để bạn tự chạy trên máy: xem ví/đơn/hóa đơn, xem ngân hàng đã liên kết, cộng/trừ ví. **Chưa chạy thử với dữ liệu thật** — giữ file khóa `serviceAccountKey.json` bí mật.

### Chưa kiểm chứng được (nói thật)
- Chưa test với SePay/Casso/ngân hàng thật; chưa quét mã QR bằng app ngân hàng thật; chưa thử trên thiết bị thật (chỉ trình duyệt giả lập kích thước điện thoại).
- Không ai bảo đảm thứ hạng Google.

## Đợt Shop 3 — nhận Firebase Admin suôn sẻ, SEO cửa hàng, Scott người que

### Bạn cần làm (theo thứ tự)
1. **Dán lại `database.rules.json`** vào Firebase → Realtime Database → Rules → Publish (có thêm nút `nox_shopseo`). Quên bước này thì chỉ mục SEO shop không đọc được.
2. Giải nén zip, đẩy lên GitHub, để Vercel deploy.
3. Đăng nhập tài khoản dev → **Dev Panel → "Kết nối máy chủ"** (địa chỉ `/dev/connect`):
   - Dán nguyên file khóa Firebase Admin (kể cả khi bị xuống dòng sai, thiếu ngoặc, dính `*****`…) — trang tự sửa những lỗi thường gặp và báo rõ lỗi nào không sửa được.
   - Bấm sao chép giá trị → vào **Vercel → Settings → Environment Variables → tên `FIREBASE_SERVICE_ACCOUNT`** → dán → **Redeploy**.
   - Quay lại trang, bấm "Kiểm tra máy chủ": thấy ✓ Firebase Admin là xong. Khóa **không bao giờ được lưu** ở trang web/cookie/cơ sở dữ liệu (máy chủ cần chính khóa này để vào được cơ sở dữ liệu nên không thể cất trong đó).
   - Khóa bạn đã dán công khai trong chat trước đây coi như đã lộ: nên tạo khóa mới (Firebase → Project settings → Service accounts → Generate new private key) rồi xóa khóa cũ.
4. Vào **Dev → Cửa hàng** một lần: web tự dựng chỉ mục SEO (`nox_shopseo`). Mỗi lần thêm/sửa/ẩn/xóa sản phẩm cũng tự cập nhật. Bán hàng xong số đã bán/tồn kho cũng tự cập nhật.
5. Google Search Console: gửi lại `https://skibidiscript.vercel.app/sitemap.xml`, rồi "Xác thực bản sửa lỗi" cho báo cáo *"Bị loại trừ bởi thẻ noindex"*.

### Mới
- **Trang Kết nối máy chủ** cho dev (xem trên) + banner nhắc ở Dev Panel khi máy chủ chưa nhận Firebase Admin. Máy chủ giờ đọc được khóa dù dán sai kiểu (JSON, base64, có dấu nháy, xuống dòng thật…).
- **SEO cửa hàng**: trang chủ shop có danh sách sản phẩm + mục lục cho Google đọc ngay; **mỗi mục lục là một trang riêng** `/shop/c/<mục>`; mỗi sản phẩm có ảnh thật `/img/shop/<id>.jpg` (dùng cho Google Hình ảnh, og:image, dữ liệu Product); sơ đồ trang có sản phẩm + mục lục + ảnh; `/shop` chuyển hướng vĩnh viễn về `/`; khi Firebase lỗi tạm thời trang trả 503 để Google thử lại, không bị gắn noindex nhầm.
- **Scott** — người que ở góc dưới bên trái: chào mỗi lần vào web (tiếng Anh + tiếng Việt), trả lời ~50 chủ đề đơn giản (nạp tiền, đơn hàng, tài khoản, an toàn APK, cài đặt…), tính nhẩm, nói giờ, dịch vài chục từ Anh ↔ Việt, kể chuyện cười, thỉnh thoảng nhắc mẹo kèm từ vựng. Có hiệu ứng người que vẫy tay, suy nghĩ (đám mây + bóng đèn), nói, nhảy mừng. Bật/tắt ở Cài đặt.
- **Gửi dev qua Scott**: nói "gửi dev" (hoặc "gửi dev: mô tả lỗi"). Scott hiện từng bước xem xét (đọc lỗi gần đây, kiểm tra kết nối/máy chủ) rồi gửi một tin vào cuộc trò chuyện với dev, kèm trang, lỗi, môi trường, trạng thái máy chủ. Khi trang vừa gặp lỗi, Scott **đề nghị** xem xét và gửi — chỉ gửi khi bạn bấm đồng ý. Cần tài khoản thật; chống gửi dồn dập (30 giây/lần, tối đa 5 tin mỗi lần mở web).

### Chưa kiểm chứng được (nói thật)
- Chưa chạy với Vercel/Firebase/SePay/Casso/ngân hàng thật — các phần đó kiểm thử bằng bản giả lập.
- Không ai đảm bảo được thứ hạng Google; Google cần vài ngày đến vài tuần để thu thập lại sau khi gửi sitemap.
- Scott trả lời theo kho câu hỏi có sẵn (khớp từ khóa), **không phải AI**: câu phức tạp sẽ được đề nghị gửi cho dev.
- Hiệu ứng người que đã xem trên Chromium (máy tính + điện thoại giả lập); chưa thử Safari/Firefox thật.

## Đợt Shop 4 — Skibidi Web, Skias (cái đầu biết nói), Skias AI cho dev, dọn mục cũ, sửa giao diện

### Bạn cần làm (theo thứ tự)
1. **`database.rules.json` KHÔNG đổi** so với Đợt Shop 3 (không cần dán lại nếu bạn đã dán rồi).
2. Giải nén zip, đẩy lên GitHub, để Vercel deploy.
3. Đăng nhập tài khoản dev → **Dev → Quản lý dữ liệu → thẻ "Dữ liệu cũ"** → bấm **"Xóa N mục cũ vĩnh viễn"** để dọn hẳn dữ liệu Script / APK / iOS / Link cũ khỏi cơ sở dữ liệu (không thể hoàn tác). Nếu chưa bấm: các mục cũ vẫn nằm trong cơ sở dữ liệu nhưng **không còn hiện ở đâu trên web**.
4. Google Search Console: gửi lại `https://skibidiscript.vercel.app/sitemap.xml` (đã đổi tên thương hiệu và bỏ các trang cũ).
5. Muốn thử Skias AI: đăng nhập dev → bấm cái đầu Skias → nút **✨ Skias AI**. Lần đầu Puter có thể hiện cửa sổ nhỏ yêu cầu đăng nhập/đồng ý Puter.

### Mới
- **Đổi tên thành "Skibidi Web"** (tiêu đề, mô tả, dữ liệu có cấu trúc, thư gửi đi, sơ đồ trang, tìm kiếm trình duyệt…). Từ khóa phụ "Skibidi Shop", "skibidi", "skibidiscript" vẫn có mặt để ai tìm các tên đó có cơ hội thấy web — **không ai đảm bảo được thứ hạng Google**.
- **Xóa hẳn Script, APK, iOS, Link** khỏi web: không còn danh mục gốc, trang, menu, ô tìm kiếm, sơ đồ trang, cảnh báo APK, mẹo của Skias. Địa chỉ cũ (`/scripts`, `/apk`, `/ios`, `/links`, `/apk-safety`…) tự chuyển hướng về trang chủ/danh mục. Mọi danh mục giờ do dev tạo ở Dev → Danh mục (`/c/<tên>`).
- **Skias thay Scott**: chỉ còn **cái đầu to hơn**, mắt chớp đầy đủ (có chớp đôi, nhìn quanh, vui/suy nghĩ/nói). Khung nói và khung chat là **kính mờ đục** (làm mờ mạnh + độ đục ≥ 85%) nên chữ phía sau không còn đè lên chữ của Skias. **Đã bỏ toàn bộ gợi ý** (nút câu hỏi gợi ý và mẹo tự hiện); chỉ còn các nút hành động như "Gửi dev". Kho câu trả lời tự động tăng lên ~76 chủ đề (mua hàng, nạp tiền, bảo hành, rút tiền, đổi email, Google, độ tương phản…), không còn từ kỹ thuật.
- **Skias AI** (dùng puter.js): nút riêng trong khung chat, **bị khóa với tài khoản thường** (hiện 🔒 và thông báo), chỉ tài khoản dev dùng được. puter.js chỉ được tải khi dev bật chế độ này.
- **Từ ngữ kỹ thuật chỉ dành cho dev**: thông báo lỗi chứa từ như Firebase, permission, nox_, token, API… được đổi thành "Có lỗi xảy ra. Vui lòng thử lại." với người dùng thường; dev vẫn thấy nguyên văn. Trang công khai vẫn được test quét từ kỹ thuật.
- **Sửa giao diện** (theo ảnh bạn gửi): nút chọn Ngôn ngữ/Giao diện trong Cài đặt bị vỡ do một luật CSS của trang dev (`.seg`) ghi đè — đã tách riêng; thanh trên/thanh dưới khi bật Kính mờ đục hơn (≈92%) nên chữ cuộn phía sau không lộ; chấm huy hiệu trên avatar không còn bị cắt; nút Skias nằm cao hơn thanh dưới; nút bấm/ô nhập của Skias cao ≥ 34–42px, chữ ô nhập 16px (iPhone không tự phóng to).

### Chưa kiểm chứng được (nói thật)
- **Skias AI chưa thử với Puter thật** (ở đây không gọi được ra ngoài): đã test với bản giả lập `puter.ai.chat`. Puter có thể yêu cầu đăng nhập Puter/tính phí theo người dùng của họ; tên mô hình mặc định do Puter chọn.
- **Khóa Skias AI là khóa ở giao diện** (nút bị khóa với tài khoản thường, mã không tải puter.js cho họ). Vì puter.js chạy trong trình duyệt nên không thể coi là bảo mật tuyệt đối — một người am hiểu vẫn có thể tự nạp puter.js trên máy mình (khi đó họ dùng tài khoản Puter của chính họ, không đụng tới dữ liệu/ví của web).
- Chưa chạy với Vercel/Firebase/ngân hàng thật; chưa thử Safari/Firefox thật; ảnh giao diện chỉ xem trên Chromium (máy tính + điện thoại giả lập).
- Đang giữ nguyên captcha (`turnstile.js`, `verify-captcha.js`) như bạn dặn.

## Đợt Shop 5 — Skias quả cầu vàng, khung chat mới, logo vẽ bằng code, Kính lỏng bo góc, Skias AI cho mọi người

### Bạn cần làm (theo thứ tự)
1. **`database.rules.json` KHÔNG đổi** (không cần dán lại).
2. Giải nén zip, đẩy lên GitHub, để Vercel deploy. **Các tệp ảnh logo đã bị xóa hoàn toàn** (`assets/img/*`, `favicon.ico`); logo giờ do `api/logo.js` vẽ ra khi có người truy cập (`/logo.svg`, `/favicon.ico`, `/icons/icon-192.png`…). Vercel cần deploy lại thì mới có các đường dẫn này.
3. Sau khi deploy, mở thử `https://skibidiscript.vercel.app/favicon.ico` và `/icons/og.png` để chắc chắn logo hiện ra; rồi gửi lại `sitemap.xml` trong Google Search Console (Google cần vài ngày để đổi biểu tượng).
4. Bật **Kính mờ** trong Cài đặt để xem Kính lỏng mới (thanh trên, thanh bên, thanh dưới là khung nổi bo góc).

### Mới
- **Logo vẽ bằng code, không còn tệp ảnh**: SVG + PNG (48/96/192/512, maskable, apple-touch, ảnh chia sẻ 1200×630) + ICO đều do `api/logo.js` tạo (tô bằng bộ vẽ riêng, nén zlib). Logo trên thanh trên vốn đã là SVG nhúng trong `index.html`. Có bài test kiểm tra: repo không còn png/jpg/ico nào, mọi đường dẫn đều trả về ảnh hợp lệ.
- **Skias là quả cầu vàng mặt cười** (theo ảnh bạn gửi): mắt bầu dục đen, nụ cười rộng, bóng đổ dưới đất; chớp mắt (có chớp đôi), nhìn quanh, nói (miệng mở), suy nghĩ (mây ba chấm), vui (mắt cười). Ảnh đại diện trong khung chat cũng là mặt cười vẽ bằng CSS có chớp mắt. Khi cuộn trang Skias nép sang bên cho khỏi che chữ, đứng yên 2 giây thì ló ra lại.
- **Khung chat làm lại**: tin của bạn là một khung (đã sửa lỗi bị bọc đôi và chữ tối trên nền đỏ), chữ luôn đủ tương phản; ảnh đại diện + giờ gửi; hiệu ứng tin nhắn nảy lên, **gõ chữ dần**, ba chấm chờ; thanh trượt **Tự động / Skias AI**; nút **cuộc trò chuyện mới**; nút **xuống tin mới nhất**; **hiển thị Markdown** (đậm, danh sách, mã, liên kết an toàn — hết cảnh thấy `**` thô).
- **Ngắt chat AI**: khi Skias đang nghĩ hoặc đang gõ, nút Gửi biến thành **Dừng** (hoặc bấm Esc, hoặc chuyển sang Tự động) → ngưng ngay; kết quả đến muộn bị bỏ.
- **Sửa lỗi trong ảnh bạn gửi**: nút Auto sáng sai khi đang ở chế độ AI (nay chế độ AI không tự nhảy về Tự động).
- **Skias AI mở cho mọi người dùng** (kể cả khách): bấm ✨ Skias AI trong khung chat. Puter có thể hiện cửa sổ nhỏ để đăng nhập Puter lần đầu. puter.js chỉ được tải khi có người bấm dùng AI. Lời dặn hệ thống yêu cầu AI nói dễ hiểu, không dùng từ kỹ thuật.
- **Kính lỏng làm lại**: bỏ các "ô vuông" bao phủ — thanh trên, thanh bên, thanh dưới là **khung nổi bo góc**; nút và biểu tượng là viên thuốc/hình tròn; thanh trượt Mức đồ họa hết nền vuông; cạnh kính vẽ theo đúng đường bo (trước đây một lớp gradient tràn dưới nền gây vệt trắng chéo trông như ô vuông). Trên điện thoại menu kéo ra cũng bo góc và ẩn nút chat nổi/Skias để không đè lên.
- **Xóa từ ngữ kỹ thuật ngoài web**: người dùng thường không còn thấy Firebase, máy chủ, băm, IP, tên khóa cookie `ssw_…`, "link https://"… (trang Bảo mật, Quyền riêng tư, Cài đặt, Ví, Gửi bài, Xác minh 2 bước, thư lỗi). Dev vẫn thấy chi tiết ở các thông báo dành cho dev. Có bài test quét 24 trang (khách + thành viên, Việt + English).

### Chưa kiểm chứng được (nói thật)
- **Skias AI chưa thử với Puter thật** (ở đây không gọi được ra ngoài): test bằng bản giả lập `puter.ai.chat`. Puter có thể yêu cầu đăng nhập Puter hoặc giới hạn dùng; đó là chính sách của Puter, không phải của web.
- Logo PNG/ICO chưa xem được trên Vercel thật (chỉ chạy thử bằng máy chủ giả lập); chưa thử Safari/Firefox thật; ảnh giao diện chỉ xem trên Chromium.
- Danh sách "từ kỹ thuật" quét bằng một bộ từ khóa cố định (Firebase, API, token, IP, băm, máy chủ, SDK, webhook…). Nếu bạn thấy từ nào khác còn sót, gửi ảnh để mình xử lý tiếp.
- Đang giữ nguyên captcha (`turnstile.js`, `verify-captcha.js`) như bạn dặn.

---

## Đợt Shop 6 — nạp tiền thủ công bằng hóa đơn, trang chủ mới, Share có ảnh/video, danh mục chia hàng ngang

### Bạn cần làm (theo thứ tự)
1. **Dán `database.rules.json` mới** vào Firebase → Realtime Database → Rules → Publish (có thêm `nox_inv`, `nox_invq`, `nox_invsec`, `nox_invfile`, `nox_invopen` và ảnh/video cho nội dung).
2. **Không cần** SePay/Casso/webhook/khóa ngân hàng nữa. Có thể xóa các biến Vercel `SEPAY_API_KEY`, `SEPAY_SECRET`, `CASSO_SECURE_TOKEN` và (tùy chọn) xóa các nhánh cũ trong Realtime Database: `nox_topups`, `nox_topcodes`, `nox_bankhook`, `nox_shopcfg`. Không xóa thì cũng không sao, rules đã khóa chúng.
3. Deploy lại. Lần đầu tài khoản dev (`hminhgalaxy@gmail.com`, đã xác minh email) vào web, ví dev được cấp **130.000.000 ₫** (chỉ một lần).
4. **Captcha không bị đụng tới** (`turnstile.js`, `api/verify-captcha.js`, phần captcha trong `pages/auth/shared.js` giữ nguyên).

### Luồng nạp tiền mới
- **Khách:** Ví → *Nạp tiền* → nhập số tiền (tối thiểu **2.000 ₫**, tối đa 50.000.000 ₫, làm tròn nghìn) → sang trang `/topup` hiển thị *"Hóa đơn đang được tạo, vui lòng quay lại sau ít tiếng"*. Mỗi khách chỉ có **một hóa đơn mở** tại một thời điểm; có thể hủy.
- **Dev:** *Dev › Nạp tiền* → tab *Yêu cầu nạp* → mở yêu cầu, tải **ảnh mã QR** lên (+ ghi chú) → hóa đơn thành *Chờ chuyển tiền*; khách thấy QR + mã hóa đơn ngay trên trang.
- **Khách chuyển tiền xong:** trang hỏi *"Chuyển tiền thành công?"* → gửi **ảnh bill** → *"Hóa đơn của bạn sẽ được xử lý trong ít phút"*.
- **Dev nhập tiền:** tab *Nhập tiền* hiện ID + số tiền (**bị khóa, không sửa được**), cùng **mã code** và **mã bảo mật** do máy chủ sinh ngẫu nhiên (không theo định dạng cố định). Dev nhập lại đúng hai mã → máy chủ đối chiếu → trừ ví dev, cộng ví khách, hóa đơn thành *Thành công*.
- **An toàn tiền:** ví chỉ được ghi từ máy chủ bằng giao dịch nguyên tử + khóa chống cộng hai lần; số tiền phải khớp đúng hóa đơn; mã code/bảo mật so sánh bằng băm (sai 5 lần → khóa 10 phút); dev không tự nạp cho chính mình; ví dev không đủ thì hóa đơn giữ nguyên trạng thái chờ. Lịch sử giao dịch ghi cả hai phía.

### Giao diện / nội dung
- **Trang chủ `/`** chỉ còn 4 ô: **World · Chat · Group** (*Coming Soon*) và **Share** (mở kho nội dung `/library`). **Cửa hàng chuyển sang `/shop`** (có tab riêng ở thanh dưới).
- **Share:** mỗi mục có tối đa 3 ảnh minh họa + 1 video (link YouTube hoặc file mp4/webm) do dev đăng; trang danh mục chia thành **các hàng ngang** (Mới nhất, Phổ biến, Có video, Có ảnh, Có code, Có link).
- **Skias** không còn giới hạn thời gian trả lời; tin nhắn không bị cắt ngắn.
- Trang đang tải hiện **vòng tròn xoay** thay vì trắng tinh. Thông báo (toast) trong chế độ kính được làm đậm/mờ hơn để không bị chữ đè; khi mở menu/popup, phần phía sau được làm mờ.
- Đã **bỏ nút xóa cookie** trong Cài đặt.

### Chưa làm / chưa kiểm chứng (nói thật)
- Skliquid Glass, Skib OS, nhạc/nền riêng và kéo giãn bố cục đã được làm ở **Đợt Shop 7** (bên dưới).
- Luồng nạp tiền được kiểm thử đầy đủ bằng bản giả lập Firebase (unit + giao diện), **chưa chạy với Firebase/Vercel thật**; hãy tự thử một hóa đơn nhỏ (2.000 ₫) bằng hai tài khoản.

## Đợt Shop 7 — sửa lỗi điện thoại + Skliquid Glass (giọt nước 3D) + Skib OS

### Bạn cần làm (theo thứ tự)
1. **Dán `database.rules.json` mới** vào Firebase → Realtime Database → Rules → Publish (thêm `nox_theme/lqBgType`, `nox_theme/lqBgData` và cờ `lq` cho `nox_tracks`).
2. Deploy lại.
3. **Nếu ví dev vẫn hiện 0 ₫**: máy chủ chưa nhận khóa quản trị. Vào **Dev › Kết nối máy chủ**, dán khóa, kiểm tra, rồi dán các giá trị vào Vercel và deploy lại. Từ đợt này web hiện thông báo vàng nêu rõ nguyên nhân (trước đây im lặng và chỉ hiện 0 ₫).
4. Captcha **không bị đụng tới**.

### Đã sửa
- Thanh tab dưới điện thoại: 6 nút chia đều, không tràn; nội dung chừa chỗ đủ để không bị che.
- Skias: kéo thả được, thu nhỏ thành chấm, luôn nằm trong vùng an toàn; khung chat trên điện thoại là một tờ cố định giữa thanh trên và thanh tab (không còn bị cắt).

### Skliquid Glass — nút bật ở đâu?
- **Trang chủ** (nút tròn "Dùng Skliquid Glass" dưới 4 ô), **Menu bên** (mục Skliquid Glass), **Cài đặt** (thẻ đầu tiên). Bật/tắt bằng cùng một nút; lựa chọn lưu trong cookie `ssw_ui`.
- Chất liệu: giọt nước 3D — viền sáng ở mép trên, ánh sáng gom ở đáy, bóng màu bên trong, vệt phản chiếu cong; giọt chất lỏng trôi ở nền và hòa vào nhau, có một giọt đi theo con trỏ.
- Chuyển động: nút nhún như thạch, công tắc/thanh trượt có "hạt nước" phình ra khi bấm giữ, thấu kính trượt dưới tab và nhóm chọn, ô nghiêng 3D theo con trỏ, popup nở từ một giọt, nổi lơ lửng nhẹ.
- Khúc xạ thật (SVG) chỉ chạy trên trình duyệt nhân Chromium (Chrome/Edge/Opera/Android); Safari/Firefox tự dùng làm mờ + tăng sắc độ.
- Khi bật: ẩn mục "Tối ưu" 3 mức đồ họa; nền hình/video chung được thay bằng nền Skliquid.
- **Danh mục nổi**: cửa sổ kính kéo được, nút gập / thu nhỏ thành chấm / ẩn; trạng thái được nhớ. Trên điện thoại mở bằng tab Danh mục.
- **Tùy chỉnh bố cục**: mở từ menu/cài đặt; mỗi phần có thanh trắng (cạnh phải, cạnh dưới, góc) bấm giữ kéo để kéo dài/thu ngắn; "Đặt lại trang" đưa về như cũ; lưu theo từng trang trong cookie.
- **Skias kiểu Skliquid**: thanh tiêu đề, khung trò chuyện và ô nhập là ba viên kính riêng, thêm nút phóng to.
- **Skib OS** (`/skibos`, chỉ khi bật Skliquid): Phiên bản 1.00.1, "Cập nhật này có gì?", ảnh vẽ bằng code, "Mô tả:", "Cập nhật ngay" (tiến trình giả lập; lưu phiên bản đã cài trong cookie `ssw_os_ver`).
- **Dev › Skliquid** (`/dev/liquid`): đặt nền (ảnh/video) và nhạc riêng cho Skliquid. Nhạc riêng thay nhạc chung khi bật Skliquid; chưa có thì nhạc chung vẫn chạy.

### Chưa kiểm chứng (nói thật)
- Hiệu ứng được kiểm bằng Chromium tự động (ảnh chụp + test hành vi); **chưa thử trên Safari/Firefox/máy thật** — đó là nơi khúc xạ tự rơi về làm mờ.
- Skib OS chỉ mô phỏng tiến trình cập nhật (không tải gì thật).
- Nhiều giọt nền + khúc xạ có thể nặng ở máy yếu; tắt Skliquid ở Cài đặt nếu thấy giật.
