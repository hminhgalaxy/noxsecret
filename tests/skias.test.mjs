/* Kiểm thử "bộ não" của Skias (thuần logic, không cần trình duyệt): hiểu Việt/Anh, tính nhẩm an toàn, dịch từ, chọn mẹo, kho câu hỏi hợp lệ. */
import fs from "node:fs";
import { answer, detectLang, norm, KB_SIZE } from "../assets/js/lib/skias-brain.js";
import { KB, JOKES, DICT } from "../assets/js/lib/skias-kb.js";
import { md, mdPartial } from "../assets/js/lib/skias-md.js";
let pass = 0, fail = 0; const t = (n, a, e = true) => { const ok = JSON.stringify(a) === JSON.stringify(e); ok ? pass++ : (fail++, console.log("✗", n, "→", JSON.stringify(a), "(cần", JSON.stringify(e) + ")")); };
const A = (q, o = {}) => answer(q, { ui: "en", now: new Date(2026, 10, 21, 9, 5), rnd: () => 0, ...o });
const id = q => { const r = A(q); return r ? (r.id || r.kind) : null; };

t("norm: bỏ dấu, đ→d, bỏ ký tự lạ", norm("  Đổi MẬT khẩu?! "), "doi mat khau");
t("ngôn ngữ: có dấu → vi; English → en; không dấu nhưng từ Việt → vi; hòa → theo giao diện", [detectLang("nạp tiền"), detectLang("how do I top up"), detectLang("lam sao nap tien"), detectLang("ok", "vi"), detectLang("ok", "en")], ["vi", "en", "vi", "vi", "en"]);
for (const [q, want] of [["làm sao nạp tiền", "topup"], ["how do i top up", "topup"], ["lam sao nap tien", "topup"], ["nạp rồi mà chưa thấy tiền", "topup-late"], ["i paid but balance not updated", "topup-late"], ["đơn hàng của tôi ở đâu", "orders"], ["where are my items", "orders"], ["quên mật khẩu", "forgot"], ["i forgot my pasword", "forgot"], ["xác minh 2 bước là gì", "twofa"], ["đổi sang tiếng Việt", "language"], ["web có an toàn không", "safe"], ["is this site safe", "safe"], ["web bị giật quá", "lag"], ["cách mua hàng", "buy"], ["hoàn tiền", "refund"], ["walet balance", "wallet"], ["bạn là ai", "who"], ["what can you do", "abilities"], ["captcha không hiện", "captcha"], ["tìm trên google", "google"], ["bảo hành key lỗi", "warranty"], ["đổi email", "change-email"], ["rút tiền", "wallet-withdraw"], ["skibidi shop là gì", "brand"], ["skias ai là gì", "skias-ai"], ["tắt skias", "hide-skias"], ["chữ khó đọc quá", "contrast"], ["dev có xin mật khẩu không", "password-safety"], ["hết hàng", "out-of-stock"], ["mã giảm giá", "price"], ["chúc ngủ ngon", "bye"]]) t(`hiểu: "${q}"`, id(q), want);
t("chào / cảm ơn / tạm biệt (hai ngôn ngữ)", [id("xin chào"), id("hello"), id("hi skias"), id("cảm ơn bạn"), id("thanks"), id("bye")], ["greet", "greet", "greet", "thanks", "thanks", "bye"]);
t("trả lời đúng ngôn ngữ người hỏi", [A("hello").lang, A("xin chào").lang, A("how do i top up").text.startsWith("Top up"), A("nạp tiền").text.startsWith("Nạp tiền")], ["en", "vi", true, true]);
t("tính nhẩm", [A("2+3*4").text, A("(2+3)*4").text, A("tính 10/4").text, A("15% của 200").text, A("what is 15% of 200").text, A("2^10").text, A("3x4").text, A("1,5+2,5").text], ["That's 14.", "That's 20.", "Kết quả là 2,5.", "Kết quả là 30.", "That's 30.", "That's 1,024.", "That's 12.", "That's 4."]);
t("chia cho 0 / biểu thức hỏng không làm sập", [A("10/0").kind, A("2++").kind === "math", A("((2").kind === "math", A("9".repeat(200) + "+1").kind], ["math", false, false, "unknown"]);
t("tính nhẩm KHÔNG chạy mã (không dùng eval)", [A("process.exit(1)").kind, A("alert(1)+1").kind, A("constructor").kind], ["unknown", "unknown", "unknown"]);
t("giờ & ngày theo đồng hồ truyền vào", [A("what time is it").text, A("mấy giờ rồi").text, A("hôm nay ngày mấy").text.includes("Thứ bảy, ngày 21/11/2026"), A("what day is it today").text.includes("Saturday, 21/11/2026")], ["It's 09:05 (your device's clock).", "Bây giờ là 09:05 (giờ trên thiết bị của bạn).", true, true]);
t("chuyện cười", [A("kể chuyện cười").kind, A("tell me a joke").text === JOKES[0].en, A("kể chuyện cười").text === JOKES[0].vi], ["joke", true, true]);
t("dịch Anh ↔ Việt", [A("ví trong tiếng anh là gì").text, A("how do you say password in vietnamese").text, A("dịch cảm ơn sang tiếng anh").text, A("what is wallet in vietnamese").text], ["“ví” trong tiếng Anh là “wallet”.", "“password” in Vietnamese is “mật khẩu”.", "“cảm ơn” trong tiếng Anh là “thank you”.", "“wallet” in Vietnamese is “ví”."]);
t("dịch từ không có: nói thật là chưa biết, không bịa", [/chưa có từ/.test(A("dịch xylophone sang tiếng việt").text) || /isn't one of them/.test(A("how do you say xylophone in vietnamese").text), A("how do you say xylophone in vietnamese").kind], [true, "translate"]);
t("'đổi sang tiếng Việt' KHÔNG bị nhầm là lệnh dịch", A("đổi sang tiếng Việt").kind, "kb");
t("nhờ gửi dev → kind report (cả hai ngôn ngữ)", [A("gửi dev").kind, A("gửi tin nhắn cho dev").kind, A("báo lỗi").kind, A("send a message to the dev").kind, A("report a bug").kind, A("nút nạp tiền không hoạt động").kind, A("contact the developer").kind], Array(7).fill("report"));
t("không hiểu → unknown + gợi ý gửi dev", [A("asdfghjk").kind, A("asdfghjk").report], ["unknown", true]);
t("rỗng → null", [answer("   ", {}), answer("", {})], [null, null]);
t("câu cần dev xử lý có cờ report (nạp chưa vào, hoàn tiền, hết hàng)", [A("nạp rồi mà chưa thấy tiền").report, A("hoàn tiền").report, A("hết hàng").report, A("how do i top up").report], [true, true, true, false]);
t("từ ngữ xúc phạm → xin lỗi nhẹ nhàng, không cãi lại", A("bạn ngu quá").id, "insult");
t("'chúc ngủ ngon' không bị coi là chửi (ngủ → ngu)", A("chúc ngủ ngon").kind, "bye");

/* kho câu hỏi hợp lệ */
t("kho: có ≥ 45 chủ đề; mỗi mục đủ vi + en, id duy nhất", [KB_SIZE >= 70, KB.every(e => e.id && e.vi.length > 20 && e.en.length > 20 && e.k.length >= 2), new Set(KB.map(e => e.id)).size === KB.length], [true, true, true]);
t("kho: từ khóa sau khi chuẩn hóa không rỗng; không có từ khóa 1 ký tự gây khớp bừa", KB.every(e => e.k.every(k => norm(k).length >= 2)), true);
const routes = fs.readFileSync(new URL("../assets/js/routes.js", import.meta.url), "utf8"), defined = [...routes.matchAll(/"(\/[A-Za-z0-9\-/:]*)"/g)].map(m => new RegExp("^" + m[1].replace(/:[A-Za-z]+/g, "[^/]+") + "$"));
const known = ["/login", "/register", "/forgot-password", "/inbox", "/inbox/chat"];
t("kho: mọi nút liên kết dẫn tới trang có thật", KB.flatMap(e => (e.go || []).map(g => g[0])).filter(h => !known.includes(h) && !defined.some(rx => rx.test(h.split("?")[0]))), []);
t("kho: nhãn nút có cả vi và en", KB.every(e => (e.go || []).every(g => g.length === 3 && g[1] && g[2])), true);
t("dữ liệu phụ: chuyện cười song ngữ, từ điển ≥ 60 cặp không trùng", [JOKES.every(j => j.vi && j.en), DICT.length >= 60, new Set(DICT.map(d => norm(d[0]))).size === DICT.length], [true, true, true]);
t("mọi chủ đề đều được tìm ra bằng chính từ khóa dài nhất của nó (không bị chủ đề khác 'cướp')", KB.filter(e => { const k = [...e.k].sort((a, b) => b.length - a.length)[0], r = A(k); return !(r && (r.id === e.id || ["report", "translate", "joke", "greet", "thanks", "bye", "math", "time", "date"].includes(r.kind))); }).map(e => e.id), []);
/* chống sai sự thật: các con số được nói ra phải khớp mã thật */
const top = fs.readFileSync(new URL("../assets/js/lib/shop.js", import.meta.url), "utf8"), srv = fs.readFileSync(new URL("../api/_lib/shop.js", import.meta.url), "utf8");
t("sự thật: hạn mức nạp trong lời Skias khớp mã nạp tiền (2.000 – 50.000.000)", [/MIN_TOPUP = 2000, MAX_TOPUP = 50000000/.test(top), /MIN_TOPUP = 2000, MAX_TOPUP = 50000000/.test(srv), /2[.,]000/.test(A("làm sao nạp tiền").text), /50[.,]000[.,]000/.test(A("han muc nap").text)], [true, true, true, true]);
t("kho: không còn nhắc Script/APK/iOS cũ và không có từ kỹ thuật", KB.filter(e => /\b(apk|ios|script|scripts|vault|firebase|realtime|database|api|node|json)\b/i.test(e.vi + " " + e.en)).map(e => e.id), []);

/* ── Markdown của khung chat (an toàn + đúng) ── */
t("md: **đậm**, *nghiêng*, `mã`", md("**Xin** *chào* `x`"), "<p><strong>Xin</strong> <em>chào</em> <code>x</code></p>");
t("md: phép nhân 3*4 và 5*6 không bị nghiêng nhầm", md("3*4 và 5*6"), "<p>3*4 và 5*6</p>");
t("md: danh sách gạch đầu dòng và đánh số", [md("- a\n- b"), md("1. x\n2) y")], ["<ul><li>a</li><li>b</li></ul>", "<ol><li>x</li><li>y</li></ol>"]);
t("md: khối mã giữ nguyên ký tự, không đổi **", md("```\n**a** <b>\n```"), "<pre><code>**a** &lt;b&gt;</code></pre>");
t("md: tiêu đề, trích dẫn, đường kẻ", [md("# Tên"), md("> hi"), md("---")], ['<p class="sk-h">Tên</p>', "<blockquote>hi</blockquote>", "<hr>"]);
t("md: chống chèn HTML / sự kiện", [/<(img|script)|<[^>]* on\w+=/i.test(md('<img src=x onerror="a()"><script>alert(1)</script>')), md("<b>x</b>")], [false, "<p>&lt;b&gt;x&lt;/b&gt;</p>"]);
t("md: liên kết chỉ cho http(s) và đường dẫn nội bộ", [md("[a](javascript:alert(1))").includes("<a "), md("[a](data:text/html,x)").includes("<a "), md("[a](https://x.com/p?q=1&r=2)").includes('href="https://x.com/p?q=1&amp;r=2"'), md("[a](/shop)").includes('href="/shop"'), /rel="noopener noreferrer"/.test(md("[a](https://x.com)"))], [false, false, true, true, true]);
t("md: dấu \" không thoát được khỏi thuộc tính href", /href="[^"]*"\s+onmouseover/.test(md('[a](https://x.com/"onmouseover="y)')), false);
t("md: rỗng / null / quá dài không làm sập", [md(""), md(null), md("a".repeat(20000)).length < 8100], ["", "", true]);
t("mdPartial: đang gõ dở **đậm, `mã, ``` đều tự đóng tạm", [mdPartial("Đây là **đậm dở"), mdPartial("x `co"), mdPartial("```\nabc"), mdPartial("abc **")], ["<p>Đây là <strong>đậm dở</strong></p>", "<p>x <code>co</code></p>", "<pre><code>abc</code></pre>", "<p>abc </p>"]);
t("kho: câu về Skias AI nói rõ ai cũng dùng được (không còn 'chỉ dev')", [/ai cũng dùng được/.test(KB.find(e => e.id === "skias-ai").vi), /open to everyone/.test(KB.find(e => e.id === "skias-ai").en), /chỉ dành cho tài khoản dev/.test(KB.find(e => e.id === "skias-ai").vi)], [true, true, false]);

console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
