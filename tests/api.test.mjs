/* Kiểm thử lõi /api/account bằng Firebase Admin + Brevo giả (không gọi mạng). */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createApi } = require("../api/_lib/core.js");
const T = require("../api/_lib/templates.js");
let pass = 0, fail = 0;
const t = (n, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); if (g === w) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n, "→ nhận", g, "mong đợi", w); } };

const NOW0 = 1800000000000; let clock = NOW0;
const DEVE = "hminhgalaxy@gmail.com";
function world() {
  const users = {
    uDEV: { uid: "uDEV", email: DEVE, displayName: "Dev Minh", providerData: [{ providerId: "password" }] },
    uA: { uid: "uA", email: "a@example.com", displayName: "Alice Nguyen", providerData: [{ providerId: "password" }] },
    uG: { uid: "uG", email: "g@example.com", displayName: "Gina", providerData: [{ providerId: "google.com" }] },
    uB: { uid: "uB", email: "b@example.com", displayName: "", providerData: [{ providerId: "password" }] }
  };
  const tokens = {
    dev: { uid: "uDEV", email: DEVE, email_verified: true, auth_time: NOW0 / 1000 - 60, firebase: { sign_in_provider: "password" } },
    a: { uid: "uA", email: "a@example.com", email_verified: true, auth_time: NOW0 / 1000 - 60, firebase: { sign_in_provider: "password" } },
    aOld: { uid: "uA", email: "a@example.com", email_verified: true, auth_time: NOW0 / 1000 - 7200, firebase: { sign_in_provider: "password" } },
    aUnv: { uid: "uA", email: "a@example.com", email_verified: false, auth_time: NOW0 / 1000 - 60, firebase: { sign_in_provider: "password" } },
    guest: { uid: "gg1", firebase: { sign_in_provider: "anonymous" } },
    b: { uid: "uB", email: "b@example.com", email_verified: true, auth_time: NOW0 / 1000 - 60, firebase: { sign_in_provider: "password" } }
  };
  let data = { nox_users: { uA: { name: "Alice" } } }; const sent = [], calls = [];
  const get = (o, p) => p.split("/").reduce((x, k) => (x == null ? null : x[k] === undefined ? null : x[k]), o);
  const setp = (o, p, v) => { const k = p.split("/"); let c = o; for (let i = 0; i < k.length - 1; i++) c = c[k[i]] = c[k[i]] && typeof c[k[i]] === "object" ? c[k[i]] : {}; if (v === null) delete c[k.at(-1)]; else c[k.at(-1)] = JSON.parse(JSON.stringify(v)); };
  const db = { get: async p => { const v = get(data, p); return v == null ? null : JSON.parse(JSON.stringify(v)); }, set: async (p, v) => setp(data, p, v), update: async (p, o) => { for (const k in o) setp(data, p + "/" + k, o[k]); }, remove: async p => setp(data, p, null) };
  const auth = {
    verifyIdToken: async tk => { if (!tokens[tk]) throw new Error("bad"); const d = { ...tokens[tk] }; const cl = (users[d.uid] || {}).customClaims || {}; return { ...d, ...cl }; },
    getUser: async uid => { if (!users[uid]) throw Object.assign(new Error("nf"), { code: "auth/user-not-found" }); return { ...users[uid] }; },
    getUserByEmail: async e => { const u = Object.values(users).find(x => x.email === e); if (!u) throw Object.assign(new Error("nf"), { code: "auth/user-not-found" }); return { ...u }; },
    setCustomUserClaims: async (uid, c) => { users[uid].customClaims = JSON.parse(JSON.stringify(c)); calls.push(["claims", uid, c]); },
    updateUser: async (uid, p) => { Object.assign(users[uid], p); calls.push(["update", uid, p]); },
    revokeRefreshTokens: async uid => calls.push(["revoke", uid]),
    generateEmailVerificationLink: async e => "https://x.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=VER" + e.length + "&apiKey=k",
    generatePasswordResetLink: async e => "https://x.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=RST" + e.length,
    generateVerifyAndChangeEmailLink: async (e, n) => "https://x.firebaseapp.com/__/auth/action?mode=verifyAndChangeEmail&oobCode=CHG" + n.length
  };
  const sendMail = async m => { if (m.to === "fail@example.com") throw new Error("boom"); sent.push(m); };
  const api = createApi({ auth, db, sendMail, verifyPassword: async (e, p) => p === "pw-ok",  env: { DEV_EMAIL: DEVE }, now: () => clock, randomInt: () => 123456 });
  const call = (action, body = {}, token = "", ip = "1.2.3.4") => api({ action, body, token, ip });
  return { api, call, sent, calls, users, tokens, get data() { return data; }, set data(v) { data = v; } };
}
const lastCode = w => (w.sent.at(-1).text.match(/Code: (\d{6})/) || [])[1];

console.log("CHUNG");
{ const w = world(); const off = createApi({ auth: null, db: null, sendMail: null });
  t("chưa cấu hình: status báo mail=false", (await off({ action: "status" })).body.mail, false);
  t("chưa cấu hình: action khác trả 501 not_configured", (await off({ action: "reset", body: { email: "a@b.co" } })).status, 501);
  t("action lạ → 400", (await w.call("hack")).status, 400);
  t("prototype key (constructor) → 400", (await w.call("constructor")).status, 400);
  t("status khi đủ cấu hình", (await w.call("status")).body.mail, true);
  t("không có token → 401", (await w.call("welcome")).status, 401);
  t("token sai → 401", (await w.call("welcome", {}, "zzz")).status, 401);
  t("khách (ẩn danh) → 403", (await w.call("welcome", {}, "guest")).status, 403); }

console.log("XÁC MINH EMAIL / ĐẶT LẠI MẬT KHẨU");
{ const w = world();
  const r = await w.call("verify-email", {}, "aUnv"); t("gửi thư xác minh", [r.status, w.sent.length, w.sent[0].to], [200, 1, "a@example.com"]);
  t("liên kết trỏ về website (không phải firebaseapp)", /https:\/\/skibidiscript\.vercel\.app\/auth\/action\?mode=verifyEmail&amp;oobCode=VER/.test(w.sent[0].html), true);
  t("tên người gửi/branding có trong thư", /SkibidiScript &bull; skibidiscript\.vercel\.app/.test(w.sent[0].html) && /icon-192\.png/.test(w.sent[0].html), true);
  t("đã xác minh rồi → không gửi nữa", (await w.call("verify-email", {}, "a")).body.already, true);
  for (let i = 0; i < 4; i++) await w.call("verify-email", {}, "aUnv"); t("giới hạn 5 thư/giờ", (await w.call("verify-email", {}, "aUnv")).status, 429);
  const w2 = world();
  await w2.call("reset", { email: "A@Example.com " }); t("reset: gửi tới email tồn tại (không phân biệt hoa thường)", [w2.sent.length, w2.sent[0].subject], [1, "Reset your SkibidiScript password"]);
  const r2 = await w2.call("reset", { email: "nobody@example.com" }); t("reset: email không tồn tại → vẫn ok, KHÔNG gửi", [r2.status, r2.body.ok, w2.sent.length], [200, true, 1]);
  await w2.call("reset", { email: "g@example.com" }); t("reset: tài khoản Google → thư hướng dẫn dùng Google", w2.sent.at(-1).subject, "Sign in to SkibidiScript with Google");
  t("reset: email sai định dạng → 400", (await w2.call("reset", { email: "abc" })).status, 400);
  const w3 = world(); for (let i = 0; i < 5; i++) await w3.call("reset", { email: "a@example.com" }); t("reset: giới hạn theo email (5/giờ)", (await w3.call("reset", { email: "a@example.com" })).status, 429);
  clock += 61 * 60 * 1000; t("reset: hết cửa sổ giờ thì gửi lại được", (await w3.call("reset", { email: "a@example.com" })).status, 200); clock = NOW0;
  const w4 = world(); w4.users.uA.disabled = true; await w4.call("reset", { email: "a@example.com" }); t("reset: tài khoản bị khoá → không gửi", w4.sent.length, 0);
  const w5 = world(); w5.data = { nox_security: { uA: { recovery: { email: "backup@example.com", verified: true } } } };
  await w5.call("recover", { email: "a@example.com" }); t("recover: gửi liên kết tới EMAIL KHÔI PHỤC", [w5.sent.length, w5.sent[0].to, /backup/.test(w5.sent[0].to)], [1, "backup@example.com", true]);
  const w6 = world(); const r6 = await w6.call("recover", { email: "a@example.com" }); t("recover: chưa có email khôi phục → ok nhưng không gửi (không lộ thông tin)", [r6.status, w6.sent.length], [200, 0]);
  const w7 = world(); w7.data = { nox_security: { uA: { recovery: { email: "backup@example.com", verified: false } } } }; await w7.call("recover", { email: "a@example.com" }); t("recover: email khôi phục chưa xác minh → không gửi", w7.sent.length, 0); }

console.log("ĐỔI EMAIL");
{ const w = world();
  t("sai mật khẩu hiện tại → 403, không gửi thư", [(await w.call("change-email", { newEmail: "new@example.com", password: "nope" }, "a")).body.code, w.sent.length], ["wrong_password", 0]);
  t("thiếu mật khẩu → 403", (await w.call("change-email", { newEmail: "new@example.com" }, "a")).body.code, "wrong_password");
  t("email mới đã có tài khoản khác → 409", (await w.call("change-email", { newEmail: "b@example.com", password: "pw-ok" }, "a")).status, 409);
  t("email mới trùng email cũ → 400", (await w.call("change-email", { newEmail: "A@example.com", password: "pw-ok" }, "a")).body.code, "same_email");
  t("đổi email không cần đăng nhập gần đây (đã xác nhận bằng mật khẩu)", (await w.call("change-email", { newEmail: "old@example.com", password: "pw-ok" }, "aOld")).status, 200); w.sent.length = 0;
  const r = await w.call("change-email", { newEmail: "new@example.com", password: "pw-ok" }, "a");
  t("gửi xác nhận tới email MỚI + báo tới email CŨ", [r.status, w.sent.filter(m => m.to === "new@example.com").length, w.sent.filter(m => m.to === "a@example.com").length], [200, 1, 1]);
  t("email trả về bị che", r.body.sentTo, "n*w@example.com"); }

console.log("XÁC MINH 2 BƯỚC");
{ const w = world();
  t("login khi chưa bật → 400", (await w.call("twofa-send", { purpose: "login" }, "a")).body.code, "not_on");
  const s = await w.call("twofa-send", { purpose: "enable" }, "a"); t("gửi mã bật 2FA", [s.status, w.sent.at(-1).to, lastCode(w), /^123456 is your/.test(w.sent.at(-1).subject)], [200, "a@example.com", "123456", true]);
  t("mã không lưu dạng rõ trong DB", JSON.stringify(w.data).includes("123456"), false);
  t("gửi lại quá nhanh (<30s) → 429", (await w.call("twofa-send", { purpose: "enable" }, "a")).body.code, "too_fast");
  t("sai mã", (await w.call("twofa-verify", { purpose: "enable", code: "000000" }, "a")).body.code, "wrong_code");
  t("mã không phải 6 số", (await w.call("twofa-verify", { purpose: "enable", code: "12ab" }, "a")).body.code, "wrong_code");
  const v = await w.call("twofa-verify", { purpose: "enable", code: "123 456" }, "a");
  t("đúng mã → bật 2FA + cấp claim cho phiên hiện tại", [v.status, w.data.nox_security.uA.twofa, w.users.uA.customClaims.tf1], [200, true, NOW0 / 1000 - 60]);
  t("gửi thư thông báo đã bật", w.sent.at(-1).subject, "Two-step verification is on");
  t("mã dùng một lần: dùng lại → hết hạn", (await w.call("twofa-verify", { purpose: "enable", code: "123456" }, "a")).body.code, "code_expired");
  /* phiên đăng nhập mới (auth_time khác) phải nhập mã */
  w.tokens.a2 = { ...w.tokens.a, auth_time: NOW0 / 1000 + 5 }; clock += 31000;
  const ch = await w.call("twofa-send", { purpose: "login" }, "a2"); t("đăng nhập phiên mới → gửi mã login", [ch.status, /sign-in code/.test(w.sent.at(-1).subject)], [200, true]);
  const claimBefore = w.users.uA.customClaims.tf1;
  const vv = await w.call("twofa-verify", { purpose: "login", code: "123456" }, "a2"); t("xác minh login → claim mới, giữ claim cũ (nhiều thiết bị)", [vv.body.refresh, w.users.uA.customClaims.tf1, w.users.uA.customClaims.tf2], [true, NOW0 / 1000 + 5, claimBefore]);
  clock += 31000; await w.call("twofa-send", { purpose: "login" }, "a2");
  for (let i = 0; i < 5; i++) await w.call("twofa-verify", { purpose: "login", code: "999999" }, "a2");
  t("sai 5 lần → khoá mã", (await w.call("twofa-verify", { purpose: "login", code: "123456" }, "a2")).body.code, "too_many_tries");
  t("tắt 2FA: phiên CHƯA xác minh bị chặn", (await w.call("twofa-send", { purpose: "disable" }, "aOld")).body.code, "twofa_required");
  clock += 31000; w.tokens.aOld2 = { ...w.tokens.a, auth_time: w.users.uA.customClaims.tf1 };
  t("tắt 2FA: phiên đã xác minh gửi được mã", (await w.call("twofa-send", { purpose: "disable" }, "aOld2")).status, 200);
  t("tắt 2FA thành công", [(await w.call("twofa-verify", { purpose: "disable", code: "123456" }, "aOld2")).body.twofa, w.data.nox_security.uA.twofa], [false, false]);
  const wh = world(); await wh.call("twofa-send", { purpose: "enable" }, "a"); clock += 11 * 60 * 1000;
  t("mã hết hạn sau 10 phút", (await wh.call("twofa-verify", { purpose: "enable", code: "123456" }, "a")).body.code, "code_expired"); clock = NOW0;
  const wu = world(); t("email chưa xác minh không dùng được 2FA", (await wu.call("twofa-send", { purpose: "enable" }, "aUnv")).status, 403); }

console.log("EMAIL KHÔI PHỤC");
{ const w = world();
  t("trùng email đăng nhập → 400", (await w.call("recovery-start", { email: "a@example.com" }, "a")).body.code, "same_email");
  const r = await w.call("recovery-start", { email: "Backup@Example.com" }, "a"); t("gửi mã tới email khôi phục", [r.status, w.sent.at(-1).to, /recovery code/.test(w.sent.at(-1).subject)], [200, "backup@example.com", true]);
  t("sai mã", (await w.call("recovery-confirm", { code: "111111" }, "a")).body.code, "wrong_code");
  const c = await w.call("recovery-confirm", { code: "123456" }, "a"); t("xác nhận → lưu verified + báo email chính", [c.status, w.data.nox_security.uA.recovery.verified, w.data.nox_security.uA.recovery.email, w.sent.at(-1).to, w.sent.at(-1).subject], [200, true, "backup@example.com", "a@example.com", "A recovery email was added"]);
  /* có 2FA + recovery → mã đăng nhập gửi được tới email khôi phục */
  w.data.nox_security.uA.twofa = true; w.tokens.n = { ...w.tokens.a, auth_time: NOW0 / 1000 + 9 }; clock += 31000;
  t("đổi sang email khôi phục ngay sau khi vừa gửi mã đăng nhập vẫn được (không bị chặn 30 giây)", (await w.call("twofa-send", { purpose: "login" }, "n")).status, 200);
  const rl = await w.call("twofa-send", { purpose: "recovery-login" }, "n"); t("mã đăng nhập gửi tới email khôi phục", [rl.status, w.sent.at(-1).to], [200, "backup@example.com"]);
  t("xác minh bằng mã từ email khôi phục", (await w.call("twofa-verify", { purpose: "recovery-login", code: "123456" }, "n")).body.refresh, true);
  w.users.uA.customClaims = { tf1: NOW0 / 1000 - 60 }; clock += 31000;
  t("xoá email khôi phục cần phiên đã xác minh 2FA", (await w.call("recovery-remove", {}, "n")).body.code, "twofa_required");
  t("xoá email khôi phục (phiên đã xác minh)", [(await w.call("recovery-remove", {}, "a")).status, w.data.nox_security.uA.recovery === undefined], [200, true]);
  const w2 = world(); t("không có email khôi phục: recovery-login → 400", (await (async () => { w2.data = { nox_security: { uA: { twofa: true } } }; return w2.call("twofa-send", { purpose: "recovery-login" }, "a"); })()).body.code, "no_recovery"); }

console.log("CHỈ DEV: cấm / mute / cấp quyền / thư mẫu");
{ const w = world();
  t("user thường KHÔNG gọi được moderate", (await w.call("moderate", { uid: "uB", op: "ban", until: clock + 1e6 }, "a")).status, 403);
  t("user thường KHÔNG gửi thư mẫu", (await w.call("dev-send", { to: "x@y.co", body: "hi" }, "a")).status, 403);
  t("user thường KHÔNG xem mẫu", (await w.call("dev-templates", {}, "a")).status, 403);
  t("không moderate được chủ website", (await w.call("moderate", { uid: "uDEV", op: "ban", until: clock + 1e6 }, "dev")).status, 400);
  const r = await w.call("moderate", { uid: "uA", op: "role" }, "dev"); if (!r.body.ok) console.log("   moderate →", JSON.stringify(r)); t("cấp biên tập viên: ghi nox_admin + gửi thư", [r.status, w.data.nox_admin.uA.role, w.sent.at(-1).subject, w.sent.at(-1).to], [200, "editor", "You're now an editor on SkibidiScript", "a@example.com"]);
  await w.call("moderate", { uid: "uA", op: "mute", until: clock + 3600e3, reason: "Spam <b>" }, "dev"); t("mute: lưu hạn + lý do; thư có lý do (đã escape)", [w.data.nox_admin.uA.muteUntil, w.data.nox_admin.uA.muteReason, /Spam &lt;b&gt;/.test(w.sent.at(-1).html), w.data.nox_admin.uA.role], [clock + 3600e3, "Spam <b>", true, "editor"]);
  await w.call("moderate", { uid: "uA", op: "unmute" }, "dev"); t("unmute: xoá trường mute, giữ role", [w.data.nox_admin.uA.muteUntil, w.data.nox_admin.uA.role], [undefined, "editor"]);
  await w.call("moderate", { uid: "uB", op: "ban", until: clock + 3600e3, reason: "x" }, "dev"); t("ban có hạn: thu hồi phiên, KHÔNG khoá tài khoản", [w.calls.some(c => c[0] === "revoke" && c[1] === "uB"), w.users.uB.disabled], [true, undefined]);
  await w.call("moderate", { uid: "uB", op: "ban", until: 4102444800000, reason: "x" }, "dev"); t("ban vĩnh viễn: khoá tài khoản trong Firebase Auth", w.users.uB.disabled, true);
  t("ban vĩnh viễn: thư nói 'permanently'", /permanently/.test(w.sent.at(-1).text), true);
  t("ban: thư tới email người bị ban dù họ chưa có tên", w.sent.at(-1).to, "b@example.com");
  await w.call("moderate", { uid: "uB", op: "unban" }, "dev"); t("unban: mở khoá lại + xoá banUntil", [w.users.uB.disabled, w.data.nox_admin.uB.banUntil], [false, undefined]);
  t("ban không có thời hạn → 400", (await w.call("moderate", { uid: "uB", op: "ban" }, "dev")).status, 400);
  t("uid lạ → 404", (await w.call("moderate", { uid: "zzzzzzzz", op: "role" }, "dev")).status, 404);
  t("uid kiểu tấn công đường dẫn → 400", (await w.call("moderate", { uid: "../nox_data", op: "role" }, "dev")).status, 400);
  const tp = await w.call("dev-templates", {}, "dev"); t("danh sách thư mẫu", [tp.body.replies.length >= 8, tp.body.system.includes("loginCode")], [true, true]);
  const pv = await w.call("dev-preview", { type: "banned" }, "dev"); t("xem trước thư (có HTML + tiêu đề)", [pv.status, /<html/.test(pv.body.html), pv.body.subject], [200, true, "Your SkibidiScript account was suspended"]);
  const sn = await w.call("dev-send", { uid: "uB", template: "custom", subject: "Hello {{name}}", body: "Hi {{name}},\n\nThanks!\n\n- one\n- two" }, "dev"); t("DEV gửi thư mẫu tới người dùng theo uid", [sn.status, w.sent.at(-1).to, /Hi there,|Hi /.test(w.sent.at(-1).text)], [200, "b@example.com", true]);
  const ts = await w.call("dev-send", { to: "someone@example.com", template: "custom", subject: "S", body: "B", test: true }, "dev"); t("gửi thử: luôn gửi về chính DEV", w.sent.at(-1).to, DEVE);
  t("thư trống → 400", (await w.call("dev-send", { to: "x@y.co", template: "custom", body: " " }, "dev")).status, 400);
  t("email nhận sai → 400", (await w.call("dev-send", { to: "nope", template: "custom", body: "x" }, "dev")).status, 400);
  w.data.nox_security = { uDEV: { twofa: true } };
  t("DEV bật 2FA mà phiên chưa xác minh → bị chặn cả API", (await w.call("moderate", { uid: "uA", op: "role" }, "dev")).body.code, "twofa_required");
  const wf = world(); const rf = await wf.call("dev-send", { to: "fail@example.com", template: "custom", body: "x" }, "dev"); t("Brevo lỗi → 500 gọn, không lộ chi tiết", [rf.status, rf.body.message], [500, "Something went wrong. Please try again."]); }

console.log("THƯ MẪU");
{ const sys = Object.keys(T.SYSTEM); let vi = 0, noBrand = 0, noLogo = 0;
  for (const k of sys) { const r = T.preview(k); if (/[À-ỹà-ỹ]/.test(r.html + r.subject)) vi++; if (!/SkibidiScript &bull; skibidiscript\.vercel\.app/.test(r.html)) noBrand++; if (!/icon-192\.png/.test(r.html)) noLogo++; }
  for (const r of T.REPLIES) { const c = T.custom({ subject: r.subject, body: r.body, name: "A" }); if (/[À-ỹ]/.test(c.html)) vi++; if (!/SkibidiScript &bull;/.test(c.html)) noBrand++; }
  t("100% tiếng Anh (không còn ký tự tiếng Việt)", vi, 0); t("mọi thư có dòng 'SkibidiScript • skibidiscript.vercel.app'", noBrand, 0); t("mọi thư hệ thống có logo", noLogo, 0);
  const x = T.custom({ subject: "<script>alert(1)</script>", body: "<img src=x onerror=alert(1)> **bold** {{name}}", name: "<i>x</i>" });
  t("thư tự soạn: escape HTML (chống chèn mã)", [/<script>|<img src=x|<i>x<\/i>/.test(x.html), /<b>bold<\/b>/.test(x.html)], [false, true]);
  t("nút có địa chỉ lạ (javascript:) bị thay bằng trang chủ", /javascript:/.test(T.render("resetPassword", { url: "javascript:alert(1)" }).html), false);
  t("mọi thư có bản text", sys.every(k => T.preview(k).text.length > 20), true); }

console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
