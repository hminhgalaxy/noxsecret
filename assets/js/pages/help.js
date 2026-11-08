/* Trợ giúp: câu hỏi thường gặp. Nội dung có sẵn hai ngôn ngữ nên hiển thị theo ngôn ngữ đang chọn (translate="no"). */
import { esc, vi } from "../lib/util.js";
import { ICO } from "../lib/icons.js";
import { getLang, onLangChange } from "../lib/i18n.js";
import { clampList } from "../lib/collapse.js";

const G = {
  start: { vi: "Bắt đầu", en: "Getting started", icon: "home" },
  acc: { vi: "Tài khoản & bảo mật", en: "Account & security", icon: "shield" },
  content: { vi: "Nội dung & an toàn", en: "Content & safety", icon: "box" },
  look: { vi: "Giao diện & đồ họa", en: "Appearance & graphics", icon: "paint" },
  err: { vi: "Lỗi thường gặp", en: "Common problems", icon: "wrench" }
};
const Q = (g, qv, qe, av, ae) => ({ g, q: { vi: qv, en: qe }, a: { vi: av, en: ae } });
export const FAQ = [
  Q("start", "Website này là gì?", "What is this website?",
    "SKIBIDI SCRIPT WEB là website tiện ích chia sẻ gói APK, script và liên kết hữu ích, ưu tiên bảo mật cao. Mọi nội dung đều do quản trị viên duyệt trước khi hiển thị công khai.",
    "SKIBIDI SCRIPT WEB is a security-focused utility site for sharing APK packages, scripts and useful links. Everything is reviewed by an administrator before it is shown publicly."),
  Q("start", "Tôi có cần tài khoản để xem nội dung không?", "Do I need an account to browse?",
    "Không. Bạn xem và tìm kiếm tự do. Tài khoản chỉ cần khi muốn lưu hồ sơ, nhận thông báo riêng hoặc dùng các tính năng dành cho thành viên.",
    "No. You can browse and search freely. An account is only needed for a profile, personal notifications and member features."),
  Q("start", "Tìm một mục như thế nào?", "How do I find something?",
    "Dùng mục Tìm kiếm ở menu. Bạn gõ có dấu hay không dấu đều được; website tìm trong tên, mô tả và nội dung.",
    "Use Search in the menu. Typing with or without Vietnamese accents works; the site searches names, descriptions and content."),
  Q("start", "Danh mục nằm ở đâu?", "Where are the categories?",
    "Bấm nút Danh mục ở menu để mở danh sách. Trên điện thoại, mở menu 3 gạch hoặc chạm biểu tượng Danh mục ở thanh dưới.",
    "Open the Categories group in the menu. On a phone, use the menu button or the Categories icon in the bottom bar."),
  Q("start", "Tôi nên đọc gì trước khi tải một gói APK?", "What should I check before downloading an APK?",
    "Đọc mô tả, chỉ tải từ nguồn bạn tin tưởng, kiểm tra quyền ứng dụng yêu cầu và quét bằng ứng dụng bảo vệ của máy. Không cài thứ bạn không hiểu rõ.",
    "Read the description, download only from sources you trust, review the permissions the app requests and scan it with your device's protection. Never install something you do not understand."),

  Q("acc", "Tôi quên mật khẩu thì làm sao?", "I forgot my password. What now?",
    "Ở trang đăng nhập chọn Quên mật khẩu, nhập email. Website gửi một mã 6 số; nhập đúng mã và mật khẩu mới là xong. Mã có hiệu lực 10 phút.",
    "On the sign-in page choose Forgot password and enter your email. We send a 6-digit code; enter it with a new password. The code is valid for 10 minutes."),
  Q("acc", "Tôi không nhận được mã trong email?", "I did not receive the email code.",
    "Chờ khoảng 1 phút, kiểm tra thư rác/Spam, rồi bấm Gửi lại. Mã gửi lại sau 30 giây. Nếu vẫn không có, kiểm tra bạn gõ đúng địa chỉ email.",
    "Wait about a minute, check your spam folder, then press Resend (available after 30 seconds). If it still does not arrive, check that the address is spelled correctly."),
  Q("acc", "Vì sao đổi mật khẩu cần mã?", "Why does changing my password need a code?",
    "Để dù ai đó mượn được máy đang đăng nhập của bạn cũng không đổi được mật khẩu. Mã chỉ gửi tới email của bạn và dùng được một lần.",
    "So that anyone borrowing a signed-in device still cannot change your password. The code goes only to your email and works once."),
  Q("acc", "Xác minh 2 bước hoạt động thế nào?", "How does 2-step verification work?",
    "Khi bật, mỗi lần đăng nhập website gửi một mã tới email. Bạn có thể bật hoặc tắt trong Hồ sơ → Bảo mật (cần xác nhận bằng mã).",
    "When enabled, each sign-in sends a code to your email. You can turn it on or off in Profile → Security (confirmed with a code)."),
  Q("acc", "Vì sao tôi bị yêu cầu mã khi đăng nhập từ nơi mới?", "Why was I asked for a code from a new place?",
    "Website nhận ra thiết bị/mạng lạ và hỏi mã gửi qua email để chắc chính bạn đăng nhập. Website không lưu địa chỉ IP thô của bạn, chỉ lưu dấu băm một phần.",
    "The site noticed an unfamiliar network and asks for an emailed code to confirm it is you. We do not store your raw IP address, only a partial hash."),
  Q("acc", "Email khôi phục để làm gì?", "What is the recovery email for?",
    "Là địa chỉ dự phòng. Nếu bạn mất quyền vào email chính, mã đặt lại mật khẩu có thể gửi tới email khôi phục đã xác minh.",
    "A backup address. If you lose access to your main email, a reset code can be sent to your verified recovery email."),
  Q("acc", "Tôi muốn đổi địa chỉ email.", "I want to change my email address.",
    "Vào Hồ sơ → Bảo mật → Đổi email. Bạn nhập mật khẩu hiện tại, website gửi liên kết xác nhận tới địa chỉ mới; chỉ khi bạn mở liên kết đó thì email mới được đổi.",
    "Go to Profile → Security → Change email. Enter your current password and we send a confirmation link to the new address; the change only happens once you open it."),
  Q("acc", "Tài khoản của tôi bị khoá hoặc cấm.", "My account was blocked or banned.",
    "Khi bị cấm bạn sẽ thấy thông báo ở màn hình đăng nhập. Hãy liên hệ quản trị viên qua email hỗ trợ trong thư chúng tôi gửi để được xem lại.",
    "You will see a notice on the sign-in screen. Contact the administrator using the support address in our emails to have it reviewed."),
  Q("acc", "Tôi có thể đăng nhập bằng Google không?", "Can I sign in with Google?",
    "Có. Với tài khoản Google, mật khẩu do Google quản lý nên bạn đổi mật khẩu ở Google, không phải ở đây.",
    "Yes. For Google accounts the password is managed by Google, so change it there, not on this site."),

  Q("content", "Nội dung có được kiểm duyệt không?", "Is content moderated?",
    "Có. Không có nội dung nào được hiển thị công khai nếu chưa được quản trị viên phê duyệt.",
    "Yes. Nothing is shown publicly until an administrator has approved it."),
  Q("content", "Website có khuyến khích hack hay mod game không?", "Does the site encourage hacking or game modding?",
    "Không. Website không cổ xúy hack hay can thiệp trò chơi. Phần mềm bên thứ ba, hack hoặc mod nếu có sẽ được gắn cảnh báo rõ ràng và bạn tự chịu trách nhiệm khi sử dụng.",
    "No. The site does not promote hacking or game interference. Third-party, hack or mod software, where it appears, carries a clear warning and you use it at your own risk."),
  Q("content", "Gói APK này có an toàn không?", "Is this APK safe?",
    "Chúng tôi cố gắng loại bỏ nội dung đáng ngờ nhưng không thể bảo đảm tuyệt đối cho phần mềm của bên thứ ba. Hãy luôn tự kiểm tra trước khi cài.",
    "We try to remove suspicious content but cannot guarantee third-party software. Always check it yourself before installing."),
  Q("content", "Làm sao báo cáo nội dung xấu?", "How do I report bad content?",
    "Hãy liên hệ quản trị viên qua email hỗ trợ ghi trong thư của website, kèm đường dẫn của mục đó. Chúng tôi xem xét và gỡ nếu vi phạm.",
    "Contact the administrator through the support address listed in the site's emails, including the link to the item. We review it and remove it if it breaks the rules."),
  Q("content", "Vì sao một số mục hiện cảnh báo?", "Why do some items show a warning?",
    "Mục thuộc phần mềm bên thứ ba có rủi ro sẽ được quản trị viên đánh dấu và hiện cảnh báo để bạn cân nhắc trước khi mở.",
    "Items that involve risky third-party software are flagged by the administrator and show a warning so you can think before opening them."),
  Q("content", "Website có thu thập dữ liệu của tôi không?", "Does the site collect my data?",
    "Chỉ những gì cần cho tài khoản: email, tên hiển thị và cài đặt. Mã xác nhận được lưu dưới dạng băm và hết hạn nhanh; chúng tôi không bán dữ liệu.",
    "Only what the account needs: email, display name and settings. Codes are stored hashed and expire quickly; we never sell data."),

  Q("look", "Mức đồ họa là gì?", "What are the graphics levels?",
    "Có 3 mức: Tối Ưu (nhẹ nhất, mặc định), Trung Bình (hiệu ứng vừa phải) và Cao (nền, hiệu ứng và âm thanh đầy đủ). Chỉnh ở đầu trang Cài đặt.",
    "There are 3 levels: Optimized (lightest, default), Medium (moderate effects) and High (background, effects and sound). Change it at the top of Settings."),
  Q("look", "Máy tôi yếu, nên chọn mức nào?", "My device is slow. Which level?",
    "Giữ Tối Ưu. Mức này tắt hiệu ứng và nền động, giúp trang mượt và tiết kiệm pin.",
    "Stay on Optimized. It turns off animations and the animated background, keeping pages smooth and saving battery."),
  Q("look", "Vì sao nền ảnh/video không hiện?", "Why is the background image/video missing?",
    "Nền chỉ hiện ở mức Cao. Ở Tối Ưu và Trung Bình website dùng nền ô vuông nhẹ thay thế.",
    "The background only shows on High. Optimized and Medium use a light grid pattern instead."),
  Q("look", "Tôi đổi sang tiếng Anh/Việt ở đâu?", "Where do I switch language?",
    "Ở Cài đặt → Ngôn ngữ. Lựa chọn được nhớ trên trình duyệt này.",
    "In Settings → Language. The choice is remembered in this browser."),
  Q("look", "Tôi có thể bật chế độ sáng/tối không?", "Can I switch light/dark theme?",
    "Có, trong Cài đặt: Sáng, Tối hoặc theo hệ thống.",
    "Yes, in Settings: Light, Dark or follow the system."),

  Q("err", "Trang cứ quay tròn hoặc trắng.", "The page keeps spinning or is blank.",
    "Tải lại trang, kiểm tra mạng, hoặc thử đổi sang mức Tối Ưu. Nếu vẫn lỗi, xoá bộ nhớ đệm của trình duyệt rồi vào lại.",
    "Reload the page, check your connection or switch to Optimized. If it persists, clear the browser cache and try again."),
  Q("err", "Báo 'Mã không đúng hoặc đã hết hạn'.", "It says the code is wrong or expired.",
    "Mã chỉ dùng được 10 phút và tối đa 5 lần thử. Hãy yêu cầu mã mới và dùng mã mới nhất trong thư.",
    "Codes last 10 minutes and allow 5 attempts. Request a new one and use the most recent email."),
  Q("err", "Báo 'Bạn thao tác quá nhanh'.", "It says I am going too fast.",
    "Để chống lạm dụng, website giới hạn số yêu cầu. Chờ vài phút rồi thử lại.",
    "To prevent abuse the site limits request frequency. Wait a few minutes and try again."),
  Q("err", "Không cập nhật được giới thiệu bản thân.", "I cannot update my bio.",
    "Thử đăng xuất rồi đăng nhập lại. Nếu vẫn lỗi, báo quản trị viên: có thể quy tắc dữ liệu của website chưa được cập nhật.",
    "Sign out and in again. If it still fails, tell the administrator: the site's data rules may not be up to date.")
];

const hay = f => vi(f.q.vi + " " + f.q.en + " " + f.a.vi + " " + f.a.en);

export function mount(ctx) {
  let q = "", openIdx = -1;
  const lang = () => (getLang() === "vi" ? "vi" : "en");
  const head = () => ctx.setPage({ title: "Câu hỏi thường gặp", sub: "Trả lời nhanh về tài khoản, bảo mật, nội dung và cài đặt.", desc: "Câu hỏi thường gặp về tài khoản, bảo mật, nội dung và cài đặt của SKIBIDI SCRIPT WEB.", crumbs: [] });
  ctx.el.innerHTML = `<div class="faqp"><form class="hero-search" id="fq" role="search">${ICO.search}<input id="fs" type="search" placeholder="Tìm câu hỏi…" aria-label="Tìm câu hỏi" autocomplete="off" enterkeyhint="search"></form>
    <div id="faqBody"></div></div>`;
  const body = ctx.el.querySelector("#faqBody"), inp = ctx.el.querySelector("#fs");
  const draw = () => {
    head(); const L = lang(), k = vi(q);
    const groups = Object.keys(G).map(id => ({ id, list: FAQ.filter(f => f.g === id && (!k || hay(f).includes(k))) })).filter(g => g.list.length);
    body.innerHTML = groups.length ? groups.map(g => `<section class="faq-g" translate="no"><h2 class="faq-h">${ICO[G[g.id].icon] || ""}${esc(G[g.id][L])}</h2><div class="faq-list" data-g="${g.id}">${g.list.map(f => { const i = FAQ.indexOf(f); return `<div class="faq-i${i === openIdx ? " open" : ""}"><button class="faq-q" type="button" aria-expanded="${i === openIdx}" aria-controls="fa${i}" data-i="${i}"><span>${esc(f.q[L])}</span>${ICO.chevD}</button><div class="faq-a" id="fa${i}"><div><p>${esc(f.a[L])}</p></div></div></div>`; }).join("")}</div></section>`).join("")
      : `<div class="statebox">${ICO.search}<p>Không tìm thấy câu hỏi phù hợp. Hãy thử từ khóa khác.</p></div>`;
    if (!k) body.querySelectorAll(".faq-list").forEach(b => clampList(b, 4));
  };
  body.addEventListener("click", e => {
    const b = e.target.closest(".faq-q"); if (!b) return;
    const i = +b.dataset.i, was = b.getAttribute("aria-expanded") === "true";
    body.querySelectorAll(".faq-q").forEach(x => { x.setAttribute("aria-expanded", "false"); x.parentElement.classList.remove("open"); });
    openIdx = was ? -1 : i; if (!was) { b.setAttribute("aria-expanded", "true"); b.parentElement.classList.add("open"); }
  });
  inp.addEventListener("input", () => { q = inp.value; openIdx = -1; draw(); });
  ctx.el.querySelector("#fq").addEventListener("submit", e => { e.preventDefault(); inp.blur(); });
  draw(); const off = onLangChange(draw); return () => off();
}
