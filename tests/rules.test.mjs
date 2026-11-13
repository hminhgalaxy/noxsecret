import fs from "node:fs";
import "./rules-engine.js";
const { create, setAt, split } = globalThis.RulesEngine;
const rules = JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url)));
const eng = create(rules);
const DEV = { uid: "d1", token: { email: "HMinhGalaxy@gmail.com", email_verified: true, firebase: { sign_in_provider: "password" } } };
const DEV_UNVERIFIED = { uid: "d2", token: { email: "hminhgalaxy@gmail.com", email_verified: false, firebase: { sign_in_provider: "password" } } };
const USER = { uid: "u1", token: { email: "user@example.com", email_verified: true, firebase: { sign_in_provider: "password" } } };
const OTHER = { uid: "u2", token: { email: "other@example.com", email_verified: true, firebase: { sign_in_provider: "password" } } };
const GUEST = { uid: "g1", token: { firebase: { sign_in_provider: "anonymous" } } };
const ED = { uid: "e1", token: { email: "editor@example.com", email_verified: true, firebase: { sign_in_provider: "password" } } };
let root = {
  nox_data: { scripts: { s1: { name: "A", code: "x", copies: 3, createdAt: 1 }, legacy: { title: "Cũ", script: "y" } }, links: { l1: { name: "L", url: "https://a.b" } } },
  nox_categories: { c1: { name: "Mod", node: "mod" } }, nox_maintenance: { enabled: false }, nox_notice: { title: "t", body: "b", enabled: true },
  nox_theme: { bgType: "none", bgData: "", audioData: "", audioName: "", api: { endpoint: "https://baconbypass.xyz", key: "SECRET" } },
  nox_users: { u1: { email: "user@example.com", createdAt: 5 } }
};
let pass = 0, fail = 0;
const t = (name, got, want) => { if (got === want) { pass++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name, "→ nhận", got, "mong đợi", want); } };
const R = (p, a) => eng.canRead(split(p), a, root);
const W = (p, v, a) => eng.write([{ segs: split(p), value: v }], a, root).ok;
const U = (p, o, a) => eng.write(Object.keys(o).map(k => ({ segs: split(p + "/" + k), value: o[k] })), a, root).ok;

console.log("ĐỌC");
t("khách đọc nox_data", R("nox_data/scripts", null), true);
t("khách đọc danh mục/bảo trì/thông báo", R("nox_categories", null) && R("nox_maintenance", null) && R("nox_notice", null), true);
t("khách đọc các khóa theme công khai", ["bgType", "bgData", "audioName"].every(k => R("nox_theme/" + k, null)), true);
t("khách KHÔNG đọc nox_theme (cha) — tránh lộ API key", R("nox_theme", null), false);
t("khách KHÔNG đọc nox_theme/api", R("nox_theme/api", null), false);
t("user thường KHÔNG đọc nox_theme/api", R("nox_theme/api", USER), false);
t("DEV chưa xác minh email KHÔNG đọc api", R("nox_theme/api", DEV_UNVERIFIED), false);
t("DEV đọc nox_theme/api", R("nox_theme/api", DEV), true);
t("user thường KHÔNG đọc nox_users", R("nox_users", USER), false);
t("user đọc hồ sơ của chính mình", R("nox_users/u1", USER), true);
t("user KHÔNG đọc hồ sơ người khác", R("nox_users/u1", OTHER), false);
t("DEV đọc toàn bộ nox_users", R("nox_users", DEV), true);
t("node lạ bị chặn đọc", R("something_else", DEV), false);

console.log("GHI DỮ LIỆU (thêm / sửa / xóa)");
const item = { name: "Mới", code: "print(1)", createdAt: 1 };
t("khách KHÔNG thêm", W("nox_data/scripts/n1", item, null), false);
t("user thường KHÔNG thêm", W("nox_data/scripts/n1", item, USER), false);
t("DEV chưa xác minh email KHÔNG thêm", W("nox_data/scripts/n1", item, DEV_UNVERIFIED), false);
t("DEV thêm (email không phân biệt hoa/thường)", W("nox_data/scripts/n1", item, DEV), true);
t("DEV sửa một phần (update)", U("nox_data/scripts/s1", { name: "Sửa", updatedAt: 2 }, DEV), true);
t("DEV sửa item legacy (title/script) không bị validate chặn", U("nox_data/scripts/legacy", { name: "Mới", updatedAt: 2 }, DEV), true);
t("user thường KHÔNG sửa", U("nox_data/scripts/s1", { name: "hack" }, USER), false);
t("user thường KHÔNG xóa", W("nox_data/scripts/s1", null, USER), false);
t("khách KHÔNG xóa", W("nox_data/scripts/s1", null, null), false);
t("DEV xóa", W("nox_data/scripts/s1", null, DEV), true);
t("validate: tên rỗng bị từ chối", W("nox_data/scripts/n2", { name: "" }, DEV), false);
t("validate: tên > 200 ký tự bị từ chối", W("nox_data/scripts/n2", { name: "x".repeat(201) }, DEV), false);
t("validate: url không phải http(s) bị từ chối", W("nox_data/links/n3", { name: "a", url: "javascript:alert(1)" }, DEV), false);
t("validate: url https hợp lệ", W("nox_data/links/n3", { name: "a", url: "https://ok.com/x" }, DEV), true);
t("validate: code > 200.000 ký tự bị từ chối", W("nox_data/scripts/n4", { name: "a", code: "x".repeat(200001) }, DEV), false);
t("DEV ghi nhiều node cùng lúc vào danh mục tùy chỉnh", W("nox_data/mod/m1", { name: "M", url: "https://m.io" }, DEV), true);

console.log("BỘ ĐẾM copies (ai cũng được tăng đúng 1)");
t("khách tăng copies +1", W("nox_data/scripts/s1/copies", 4, null), true);
t("khách KHÔNG nhảy copies +100", W("nox_data/scripts/s1/copies", 103, null), false);
t("khách KHÔNG giảm copies", W("nox_data/scripts/s1/copies", 2, null), false);
t("khách KHÔNG tạo copies cho item chưa có", W("nox_data/scripts/legacy/copies", 1, null), false);
t("khách KHÔNG xóa copies", W("nox_data/scripts/s1/copies", null, null), false);

console.log("DANH MỤC / BẢO TRÌ / THÔNG BÁO / THEME");
t("khách KHÔNG tạo danh mục", W("nox_categories/c2", { name: "X", node: "x" }, null), false);
t("DEV tạo danh mục", W("nox_categories/c2", { name: "X", node: "x" }, DEV), true);
t("DEV tạo danh mục node sai định dạng bị từ chối", W("nox_categories/c2", { name: "X", node: "Bad Node!" }, DEV), false);
t("user KHÔNG bật bảo trì", U("nox_maintenance", { enabled: true, until: 1 }, USER), false);
t("DEV bật bảo trì", U("nox_maintenance", { enabled: true, until: 1 }, DEV), true);
t("user KHÔNG sửa thông báo", U("nox_notice", { title: "hack" }, USER), false);
t("DEV sửa thông báo", U("nox_notice", { title: "ok", body: "b", enabled: true }, DEV), true);
t("DEV update nox_theme (nhiều khóa con)", U("nox_theme", { bgType: "image", bgData: "data:image/jpeg;base64,AAA", updatedAt: 1 }, DEV), true);
t("user KHÔNG đổi nền", U("nox_theme", { bgType: "image", bgData: "x" }, USER), false);
t("bgType sai giá trị bị từ chối", U("nox_theme", { bgType: "evil" }, DEV), false);
t("user KHÔNG ghi API key", W("nox_theme/api", { endpoint: "https://x.io", key: "k" }, USER), false);
t("DEV ghi API key", W("nox_theme/api", { endpoint: "https://x.io", key: "k" }, DEV), true);

console.log("HỒ SƠ NGƯỜI DÙNG (nox_users)");
t("user ghi hồ sơ của chính mình", U("nox_users/u2", { email: "other@example.com", name: "O", lastLogin: 1, createdAt: 1 }, OTHER), true);
t("user KHÔNG ghi hồ sơ người khác", U("nox_users/u1", { email: "other@example.com", lastLogin: 1 }, OTHER), false);
t("email trong hồ sơ phải khớp token", U("nox_users/u2", { email: "fake@x.com", lastLogin: 1 }, OTHER), false);
t("khóa lạ trong hồ sơ bị chặn ($other)", U("nox_users/u2", { email: "other@example.com", isAdmin: true }, OTHER), false);
t("createdAt chỉ ghi một lần", U("nox_users/u1", { createdAt: 99 }, USER), false);
t("khách KHÔNG ghi hồ sơ", U("nox_users/zz", { email: "a@b.c" }, null), false);
t("node lạ bị chặn ghi (kể cả DEV)", W("random_node/x", 1, DEV), false);

console.log("CẬP NHẬT (nox_updates)");
const upd = { title: "Bản mới", body: "Có gì mới", ts: 1700000000000 };
t("khách đọc cập nhật", R("nox_updates", null), true);
t("khách KHÔNG đăng cập nhật", W("nox_updates/u1", upd, null), false);
t("user thường KHÔNG đăng cập nhật", W("nox_updates/u1", upd, USER), false);
t("DEV chưa xác minh email KHÔNG đăng", W("nox_updates/u1", upd, DEV_UNVERIFIED), false);
t("DEV đăng cập nhật hợp lệ", W("nox_updates/u1", upd, DEV), true);
t("thiếu tiêu đề bị chặn", W("nox_updates/u1", { body: "x", ts: 1 }, DEV), false);
t("tiêu đề quá dài bị chặn", W("nox_updates/u1", { title: "a".repeat(121), ts: 1 }, DEV), false);
t("khóa lạ bị chặn", W("nox_updates/u1", { ...upd, evil: 1 }, DEV), false);
t("DEV xóa cập nhật", W("nox_updates/u1", null, DEV), true);

console.log("\nHỒ SƠ (mô tả + avatar), KHÁCH, QUYỀN, BAN, MUTE");
const NOW = Date.now(), IMG = "data:image/jpeg;base64," + "A".repeat(2000);
root.nox_admin = { e1: { role: "editor" }, u2: { banUntil: NOW + 3600000, banReason: "spam" }, m1: { muteUntil: NOW + 3600000 }, x1: { banUntil: NOW - 1000 } };
root.nox_users.m1 = { email: "m@example.com", bio: "old" };
const MUTED = { uid: "m1", token: { email: "m@example.com", email_verified: true, firebase: { sign_in_provider: "password" } } };
const EXPIRED = { uid: "x1", token: { email: "x@example.com", email_verified: true, firebase: { sign_in_provider: "password" } } };
t("người dùng ghi mô tả của mình", W("nox_users/u1/bio", "Xin chào", USER), true);
t("mô tả 300 ký tự được", W("nox_users/u1/bio", "a".repeat(300), USER), true);
t("mô tả 301 ký tự bị chặn", W("nox_users/u1/bio", "a".repeat(301), USER), false);
t("không ghi mô tả của người khác", W("nox_users/u1/bio", "hack", OTHER), false);
t("khách (ẩn danh) KHÔNG ghi hồ sơ", W("nox_users/g1/bio", "hi", GUEST) || U("nox_users/g1", { email: "", lastLogin: 1 }, GUEST), false);
t("đặt avatar hợp lệ (ảnh nhỏ)", W("nox_users/u1/avatar", IMG, USER), true);
t("avatar không phải ảnh bị chặn", W("nox_users/u1/avatar", "javascript:alert(1)", USER), false);
t("avatar > 24000 ký tự bị chặn", W("nox_users/u1/avatar", "data:image/jpeg;base64," + "A".repeat(24000), USER), false);
t("xóa avatar (chuỗi rỗng)", W("nox_users/u1/avatar", "", USER), true);
t("không thể tự đặt role", W("nox_admin/u1/role", "editor", USER), false);
t("không thể tự gỡ ban", W("nox_admin/u2/banUntil", null, OTHER), false);
t("người dùng đọc hồ sơ quyền của MÌNH", R("nox_admin/u2", OTHER), true);
t("người dùng KHÔNG đọc hồ sơ quyền người khác", R("nox_admin/u2", USER), false);
t("khách KHÔNG đọc nox_admin", R("nox_admin", null), false);
t("DEV đọc toàn bộ nox_admin", R("nox_admin", DEV), true);
t("DEV cấp quyền editor", W("nox_admin/u1", { role: "editor", ts: NOW }, DEV), true);
t("role lạ bị chặn", W("nox_admin/u1", { role: "root" }, DEV), false);
t("DEV ban có thời hạn + lý do", W("nox_admin/u1", { banUntil: NOW + 1000, banReason: "x" }, DEV), true);
t("DEV chưa xác minh email KHÔNG đổi quyền", W("nox_admin/u1", { role: "editor" }, DEV_UNVERIFIED), false);
t("editor thêm nội dung", W("nox_data/scripts/n1", { name: "Mới", code: "x", createdAt: 1 }, ED), true);
t("editor KHÔNG đăng cập nhật (chỉ DEV)", W("nox_updates/e1", { title: "Tin", ts: 1 }, ED), false);
t("editor KHÔNG sửa danh mục", W("nox_categories/zz", { name: "X", node: "x" }, ED), false);
t("editor KHÔNG bật bảo trì", W("nox_maintenance/enabled", true, ED), false);
t("editor KHÔNG đổi giao diện", W("nox_theme/bgType", "none", ED), false);
t("editor KHÔNG cấp quyền người khác", W("nox_admin/u1/role", "editor", ED), false);
t("người thường KHÔNG thêm nội dung", W("nox_data/scripts/n2", { name: "Mới", code: "x", createdAt: 1 }, USER), false);
t("editor bị ban KHÔNG thêm nội dung", eng.write([{ segs: split("nox_data/scripts/n3"), value: { name: "A", code: "x", createdAt: 1 } }], { ...ED, uid: "u2", token: { ...ED.token, email: "other@example.com" } }, { ...root, nox_admin: { ...root.nox_admin, u2: { role: "editor", banUntil: NOW + 5000 } } }).ok, false);
t("người bị ban KHÔNG ghi hồ sơ", W("nox_users/u2/bio", "hi", OTHER), false);
t("ban đã hết hạn thì ghi được", W("nox_users/x1/bio", "hi", EXPIRED), true);
t("người bị mute KHÔNG đổi mô tả", W("nox_users/m1/bio", "new", MUTED), false);
t("người bị mute KHÔNG đổi avatar", W("nox_users/m1/avatar", IMG, MUTED), false);
t("người bị mute vẫn cập nhật lastLogin", W("nox_users/m1/lastLogin", NOW, MUTED), true);
t("người bị mute ghi lại đúng mô tả cũ vẫn được (không đổi)", W("nox_users/m1/bio", "old", MUTED), true);

console.log("XÁC MINH 2 BƯỚC (claim tf phải khớp auth_time của phiên đăng nhập)");
const AT = 1800000000, with2fa = (u, tf) => ({ ...u, token: { ...u.token, auth_time: AT, ...(tf === undefined ? {} : { tf1: tf }) } });
const root2 = { ...root, nox_security: { d1: { gate: true, twofa: true }, u1: { gate: true, twofa: true } }, nox_admin: { e1: { role: "editor" } } };
const W2 = (p, v, a, r = root2) => eng.write([{ segs: split(p), value: v }], a, r).ok;
t("không bật 2FA: ghi bình thường (không cần claim tf)", W2("nox_users/u2/bio", "hi", with2fa(OTHER)), true);
t("bật 2FA, CHƯA nhập mã: user KHÔNG ghi hồ sơ", W2("nox_users/u1/bio", "hi", with2fa(USER)), false);
t("bật 2FA, tf cũ (phiên đăng nhập khác): KHÔNG ghi", W2("nox_users/u1/bio", "hi", with2fa(USER, AT - 500)), false);
t("bật 2FA, đã nhập mã (tf = auth_time): ghi được", W2("nox_users/u1/bio", "hi", with2fa(USER, AT)), true);
t("DEV bật 2FA, chưa nhập mã: KHÔNG ghi danh mục", W2("nox_categories/zz", { name: "X", node: "x" }, with2fa(DEV)), false);
t("DEV bật 2FA, chưa nhập mã: KHÔNG bật bảo trì", W2("nox_maintenance/enabled", true, with2fa(DEV)), false);
t("DEV bật 2FA, chưa nhập mã: KHÔNG cấp quyền", W2("nox_admin/u1/role", "editor", with2fa(DEV)), false);
t("DEV bật 2FA, đã nhập mã: ghi được", W2("nox_categories/zz", { name: "X", node: "x" }, with2fa(DEV, AT)), true);
t("DEV không bật 2FA: vẫn ghi bình thường", W2("nox_categories/zz", { name: "X", node: "x" }, with2fa(DEV), { ...root, nox_security: {} }), true);
t("nhiều thiết bị: tf2 / tf3 khớp auth_time cũng được", W2("nox_users/u1/bio", "hi", { ...with2fa(USER), token: { ...with2fa(USER).token, tf1: 5, tf2: AT } }) && W2("nox_users/u1/bio", "hi", { ...with2fa(USER), token: { ...with2fa(USER).token, tf3: AT } }), true);
t("tf là số khác auth_time (kẻ đoán claim) KHÔNG qua", W2("nox_users/u1/bio", "hi", with2fa(USER, 1)), false);
t("nox_security: user đọc được của chính mình", eng.canRead(split("nox_security/u1"), USER, root2), true);
t("nox_security: user KHÔNG đọc của người khác", eng.canRead(split("nox_security/u1"), OTHER, root2), false);
t("nox_security: DEV KHÔNG đọc của người khác", eng.canRead(split("nox_security/u1"), DEV, root2), false);
t("nox_security: client KHÔNG tự ghi (kể cả tắt 2FA / sửa email khôi phục)", W2("nox_security/u1/twofa", false, with2fa(USER, AT)) || W2("nox_security/u1/recovery", { email: "a@b.c" }, with2fa(USER, AT)), false);
t("nox_security: gate/known chỉ máy chủ ghi (client không tự bỏ cổng)", W2("nox_security/u1/gate", false, with2fa(USER, AT)) || W2("nox_security/u1/known", {}, with2fa(USER, AT)), false);
t("nox_security: DEV cũng KHÔNG ghi được từ client", W2("nox_security/u1/twofa", false, with2fa(DEV, AT)), false);
t("nox_codes / nox_rate: không ai đọc/ghi từ client", eng.canRead(split("nox_codes/u1"), DEV, root2) || W2("nox_codes/u1", { hash: "x" }, with2fa(DEV, AT)) || eng.canRead(split("nox_rate"), DEV, root2), false);

const IMGD = "data:image/jpeg;base64," + "A".repeat(2000);
t("ảnh mục: DEV lưu ảnh chọn từ máy (data:image/jpeg) được", U("nox_data/scripts/s1", { img: IMGD, updatedAt: 2 }, DEV), true);
t("ảnh mục: ảnh quá nặng (>36.000 ký tự) bị chặn", U("nox_data/scripts/s1", { img: "data:image/png;base64," + "A".repeat(37000), updatedAt: 2 }, DEV), false);
t("ảnh mục: data: không phải ảnh (html/svg/js) bị chặn", U("nox_data/scripts/s1", { img: "data:text/html;base64,PHNjcmlwdD4=", updatedAt: 2 }, DEV) || U("nox_data/scripts/s1", { img: "data:image/svg+xml;base64,PHN2Zz4=", updatedAt: 2 }, DEV) || U("nox_data/scripts/s1", { img: "javascript:alert(1)", updatedAt: 2 }, DEV), false);
t("ảnh mục: dữ liệu cũ dạng link vẫn còn hợp lệ (không làm hỏng bản ghi cũ)", U("nox_data/scripts/s1", { img: "https://a.b/x.jpg", updatedAt: 2 }, DEV), true);

console.log("ĐỢT C: danh mục do DEV quản lý, bài chờ duyệt, hỗ trợ/báo cáo/nhắn tin");
{
  const N = Date.now();
  const U1 = with2fa(USER, AT), U2 = with2fa(OTHER), D = with2fa(DEV, AT), UNV = { ...U1, token: { ...U1.token, email_verified: false } };
  const r3 = { ...root, nox_security: { u1: { twofa: true, gate: true }, u2: {} }, nox_perms: { u1: { post: true } },
    nox_threads: { u1: { t1: { type: "support", status: "open", createdAt: 1, updatedAt: 1 }, tc: { type: "support", status: "closed", createdAt: 1, updatedAt: 1 } } },
    nox_msgs: { u1: { t1: { m1: { from: "user", text: "hi", ts: N - 1000 } } } }, nox_admin: { } };
  const P = (p, v, a, rr = r3) => eng.write([{ segs: split(p), value: v }], a, rr).ok, Rd = (p, a, rr = r3) => eng.canRead(split(p), a, rr);
  const item = { kind: "item", catId: "mod", name: "Bản APK", url: "https://example.com/a.apk", status: "pending", createdAt: N };
  const mod = { ...root, nox_categories: { c1: { name: "Mod", node: "mod" } } };
  t("DEV sửa danh mục gốc (script): đổi tên, phân loại hack, kiểu nội dung", P("nox_categories/script", { name: "Tools", risk: "hack", need: "any", sub: "x" }, D, mod), true);
  t("DEV đánh dấu xóa danh mục gốc (removed)", P("nox_categories/apk/removed", true, D, mod), true);
  t("phân loại rủi ro sai giá trị bị từ chối", P("nox_categories/script/risk", "virus", D, mod), false);
  t("user thường KHÔNG sửa/xóa danh mục", P("nox_categories/script/removed", true, U1, mod), false);
  t("nox_perms: user KHÔNG tự cấp quyền đăng", P("nox_perms/u2/post", true, U2), false);
  t("nox_perms: DEV cấp quyền", P("nox_perms/u2/post", true, D), true);
  t("nox_perms: chủ đọc quyền của mình, người khác không đọc", [Rd("nox_perms/u1", U1), Rd("nox_perms/u1", U2)].join(), "true,false");
  t("bài chờ duyệt: đủ 3 điều kiện (email xác minh + được cấp phép + bật 2FA) → gửi được", P("nox_pending/u1/p1", item, U1), true);
  t("bài chờ duyệt: chưa được DEV cấp phép → bị chặn", P("nox_pending/u2/p1", item, U2, { ...r3, nox_security: { u1: r3.nox_security.u1, u2: { twofa: true } } }), false);
  t("bài chờ duyệt: chưa bật 2FA → bị chặn", P("nox_pending/u2/p1", item, U2, { ...r3, nox_perms: { u2: { post: true } } }), false);
  t("bài chờ duyệt: email chưa xác minh → bị chặn", P("nox_pending/u1/p1", item, UNV), false);
  t("bài chờ duyệt: khách (ẩn danh) bị chặn", P("nox_pending/g1/p1", item, GUEST), false);
  t("bài chờ duyệt: không ghi hộ người khác", P("nox_pending/u2/p1", item, U1), false);
  t("bài chờ duyệt: user KHÔNG tự đặt status approved/rejected", [P("nox_pending/u1/p1", { ...item, status: "approved" }, U1), P("nox_pending/u1/p1", { ...item, status: "rejected" }, U1)].join(), "false,false");
  t("bài chờ duyệt: chỉ nhận link https (chặn http/javascript/data)", ["http://a.b/x", "javascript:alert(1)", "data:text/html,x", "ftp://a.b"].map(u => P("nox_pending/u1/p1", { ...item, url: u }, U1)).join(), "false,false,false,false");
  t("bài chờ duyệt: ảnh phải là data:image (từ máy), svg bị chặn", [P("nox_pending/u1/p1", { ...item, img: "data:image/jpeg;base64,AAAA" }, U1), P("nox_pending/u1/p1", { ...item, img: "data:image/svg+xml;base64,AAAA" }, U1), P("nox_pending/u1/p1", { ...item, img: "https://evil.example/x.png" }, U1)].join(), "true,false,false");
  t("bài chờ duyệt: trường lạ bị chặn", P("nox_pending/u1/p1", { ...item, isAdmin: true }, U1), false);
  { /* Firebase Rules KHÔNG có numChildren() (lỗi "Không có phương thức/thuộc tính" khi lưu). Chỉ cho phép các phương thức có thật. */
    const OK = new Set(["child", "exists", "hasChild", "hasChildren", "isBoolean", "isNumber", "isString", "val", "matches", "toLowerCase", "toUpperCase", "contains", "beginsWith", "endsWith", "replace", "parent", "getPriority", "length"]);
    const txt = JSON.stringify(JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8")));
    const bad = [...new Set([...txt.matchAll(/\.([A-Za-z]+)\(/g)].map(m => m[1]).filter(n => !OK.has(n)))];
    t("quy tắc chỉ dùng phương thức Firebase thật (không numChildren)", bad.join(","), "");
  }
  t("bài chờ duyệt: chủ đọc của mình, người khác không đọc, DEV đọc tất cả", [Rd("nox_pending/u1", U1), Rd("nox_pending/u1", U2), Rd("nox_pending", D), Rd("nox_pending", U1)].join(), "true,false,true,false");
  const r4 = { ...r3, nox_pending: { u1: { p1: item } } };
  t("duyệt: DEV đồng thời tạo mục công khai và xóa bài chờ (nguyên tử)", eng.write([{ segs: split("nox_data/mod/k1"), value: { name: "Bản APK", url: "https://example.com/a.apk", createdAt: N } }, { segs: split("nox_pending/u1/p1"), value: null }], D, r4).ok, true);
  t("duyệt: user thường KHÔNG tự đưa bài lên công khai", P("nox_data/mod/k2", { name: "x", url: "https://a.b" }, U1, r4), false);
  t("từ chối: DEV ghi status rejected + lý do", P("nox_pending/u1/p1", { ...item, status: "rejected", note: "Thiếu mô tả" }, D, r4), true);
  t("chủ bài tự rút bài (xóa)", P("nox_pending/u1/p1", null, U1, r4), true);
  t("hỗ trợ: user đăng nhập tạo yêu cầu của mình", P("nox_threads/u1/t2", { type: "support", subject: "Xin cấp phép đăng bài", status: "open", createdAt: N, updatedAt: N, wantPost: true, last: "user", unreadDev: true }, U1), true);
  t("báo cáo: có ref hợp lệ", P("nox_threads/u1/t3", { type: "report", status: "open", createdAt: N, updatedAt: N, ref: { kind: "item", catId: "script", key: "s1", title: "A", reason: "malware" } }, U1), true);
  t("báo cáo: lý do lạ bị chặn", P("nox_threads/u1/t3", { type: "report", status: "open", createdAt: N, updatedAt: N, ref: { kind: "item", reason: "hack" } }, U1), false);
  t("hỗ trợ: khách KHÔNG tạo", P("nox_threads/g1/t1", { type: "support", status: "open", createdAt: N, updatedAt: N }, GUEST), false);
  t("hỗ trợ: không tạo/đọc hộ người khác", [P("nox_threads/u1/t9", { type: "chat", status: "open", createdAt: N, updatedAt: N }, U2), Rd("nox_threads/u1", U2), Rd("nox_threads/u1", U1), Rd("nox_threads", D), Rd("nox_threads", U1)].join(), "false,false,true,true,false");
  t("hỗ trợ: không đổi loại yêu cầu sau khi tạo", P("nox_threads/u1/t1/type", "chat", U1), false);
  t("hỗ trợ: trường lạ bị chặn", P("nox_threads/u1/t5", { type: "chat", status: "open", createdAt: N, updatedAt: N, admin: 1 }, U1), false);
  t("tin nhắn: user gửi tin 'user' của mình", P("nox_msgs/u1/t1/m2", { from: "user", text: "Cho mình hỏi", ts: N }, U1), true);
  t("tin nhắn: user KHÔNG giả danh DEV (from: dev)", P("nox_msgs/u1/t1/m2", { from: "dev", text: "ok", ts: N }, U1), false);
  t("tin nhắn: user KHÔNG sửa/xóa tin đã gửi", [P("nox_msgs/u1/t1/m1/text", "sửa", U1), P("nox_msgs/u1/t1/m1", null, U1)].join(), "false,false");
  t("tin nhắn: DEV trả lời (from: dev) và xóa được", [P("nox_msgs/u1/t1/m3", { from: "dev", text: "Đã duyệt", ts: N }, D), P("nox_msgs/u1/t1/m1", null, D)].join(), "true,true");
  t("tin nhắn: yêu cầu đã đóng thì user không gửi thêm", P("nox_msgs/u1/tc/m1", { from: "user", text: "alo", ts: N }, U1), false);
  t("tin nhắn: người dùng bị mute không gửi được", P("nox_msgs/u1/t1/m2", { from: "user", text: "x", ts: N }, U1, { ...r3, nox_admin: { u1: { muteUntil: N + 3600000 } } }), false);
  t("tin nhắn: người dùng bị ban không gửi được", P("nox_msgs/u1/t1/m2", { from: "user", text: "x", ts: N }, U1, { ...r3, nox_admin: { u1: { banUntil: N + 3600000 } } }), false);
  t("tin nhắn: dài quá 2000 ký tự / rỗng bị chặn", [P("nox_msgs/u1/t1/m2", { from: "user", text: "a".repeat(2001), ts: N }, U1), P("nox_msgs/u1/t1/m2", { from: "user", text: "", ts: N }, U1)].join(), "false,false");
  t("tin nhắn: thời gian giả (xa tương lai) bị chặn", P("nox_msgs/u1/t1/m2", { from: "user", text: "x", ts: N + 99999999 }, U1), false);
  t("tin nhắn: chỉ chủ và DEV đọc", [Rd("nox_msgs/u1/t1", U1), Rd("nox_msgs/u1/t1", U2), Rd("nox_msgs/u1/t1", D), Rd("nox_msgs", U1)].join(), "true,false,true,false");
  t("2FA: chủ bật gate nhưng chưa nhập mã thì không gửi tin / không tạo yêu cầu", [P("nox_msgs/u1/t1/m2", { from: "user", text: "x", ts: N }, with2fa(USER)), P("nox_threads/u1/t2", { type: "chat", status: "open", createdAt: N, updatedAt: N }, with2fa(USER))].join(), "false,false");
}


/* ===== Nhạc nền nối tiếp ===== */
{
  const A = "data:audio/mpeg;base64,AAAA", ok1 = { name: "Bài 1", ts: 1, size: 10 };
  const rr = JSON.parse(JSON.stringify(root));
  const T = (p, v, a, r = rr) => eng.write([{ segs: split(p), value: v }], a, r).ok;
  t("khách đọc danh sách nhạc", eng.canRead(split("nox_tracks"), GUEST, rr), true);
  t("khách đọc dữ liệu một bài", eng.canRead(split("nox_trackdata/a"), GUEST, rr), true);
  t("DEV thêm bài (danh sách)", T("nox_tracks/a", ok1, DEV), true);
  t("DEV thêm bài (dữ liệu)", T("nox_trackdata/a", A, DEV), true);
  t("DEV thêm cả hai bằng một lệnh", eng.write([{ segs: split("nox_tracks/b"), value: ok1 }, { segs: split("nox_trackdata/b"), value: A }], DEV, rr).ok, true);
  t("người dùng không thêm được bài", T("nox_tracks/c", ok1, USER), false);
  t("người dùng không ghi được dữ liệu", T("nox_trackdata/c", A, USER), false);
  t("khách không thêm được bài", T("nox_tracks/c", ok1, GUEST), false);
  t("DEV chưa xác minh email không thêm được", T("nox_tracks/c", ok1, DEV_UNVERIFIED), false);
  t("dữ liệu không phải âm thanh bị từ chối", T("nox_trackdata/c", "data:text/html;base64,AAAA", DEV), false);
  t("dữ liệu không phải data URL bị từ chối", T("nox_trackdata/c", "https://x.io/a.mp3", DEV), false);
  t("tên bài rỗng bị từ chối", T("nox_tracks/c", { name: "", ts: 1 }, DEV), false);
  t("tên bài quá dài bị từ chối", T("nox_tracks/c", { name: "x".repeat(81), ts: 1 }, DEV), false);
  t("khóa lạ trong bài bị từ chối", T("nox_tracks/c", { name: "ok", ts: 1, evil: "x" }, DEV), false);
  t("dữ liệu quá 9 MB bị từ chối", T("nox_trackdata/c", "data:audio/mpeg;base64," + "A".repeat(9437184), DEV), false);
  t("DEV xóa bài", eng.write([{ segs: split("nox_tracks/a"), value: null }, { segs: split("nox_trackdata/a"), value: null }], DEV, rr).ok, true);
}

/* ===== Phân loại bài cập nhật ===== */
{
  const rr = JSON.parse(JSON.stringify(root)); const T = (p, v, a) => eng.write([{ segs: split(p), value: v }], a, rr).ok;
  for (const tag of ["new", "improve", "fix", "security"]) t("DEV đăng bài loại " + tag, T("nox_updates/u_" + tag, { title: "x", ts: 1, tag }, DEV), true);
  t("loại lạ bị từ chối", T("nox_updates/u_bad", { title: "x", ts: 1, tag: "evil" }, DEV), false);
  t("bài không có loại vẫn hợp lệ", T("nox_updates/u_none", { title: "x", ts: 1 }, DEV), true);
  t("người dùng không đăng được bài", T("nox_updates/u_usr", { title: "x", ts: 1, tag: "new" }, USER), false);
  t("DEV sửa tiêu đề và loại một lệnh", eng.write([{ segs: split("nox_updates/u_new/title"), value: "y" }, { segs: split("nox_updates/u_new/tag"), value: "fix" }], DEV, rr).ok, true);
}

/* ===== Đợt E: thích · lưu bài · ghi chú bảo trì · probe · xem trước tin nhắn ===== */
{
  console.log("\nĐỢT E: THÍCH, LƯU BÀI, GHI CHÚ BẢO TRÌ, CHẨN ĐOÁN DEV");
  const rr = JSON.parse(JSON.stringify(root)); const T = (p, v, a, r = rr) => eng.write([{ segs: split(p), value: v }], a, r).ok, Rd = (p, a) => eng.canRead(split(p), a, rr);
  const g2 = a => ({ ...a, token: { ...a.token, auth_time: 100, tf1: 100 } }); // đã nhập mã phiên
  const gate = JSON.parse(JSON.stringify(root)); gate.nox_security = { u1: { gate: true }, d1: { gate: true } };
  t("khách đọc lượt thích (công khai)", Rd("nox_likes/script/s1", null), true);
  t("user thích bài bằng uid của mình", T("nox_likes/script/s1/u1", true, USER), true);
  t("không thích hộ người khác", T("nox_likes/script/s1/u2", true, USER), false);
  t("khách ẩn danh không thích được", T("nox_likes/script/s1/g1", true, GUEST), false);
  t("giá trị khác true bị chặn", T("nox_likes/script/s1/u1", 5, USER), false);
  t("bỏ thích (xóa)", T("nox_likes/script/s1/u1", null, USER), true);
  t("bật cổng 2 bước mà chưa nhập mã phiên → không thích được", T("nox_likes/script/s1/u1", true, { ...USER, token: { ...USER.token, auth_time: 100 } }, gate), false);
  t("đã nhập mã phiên → thích được", T("nox_likes/script/s1/u1", true, g2(USER), gate), true);
  t("chủ đọc danh sách lưu của mình", Rd("nox_saved/u1", USER), true);
  t("người khác KHÔNG đọc danh sách lưu", Rd("nox_saved/u1", OTHER), false);
  t("khách KHÔNG đọc nox_saved", Rd("nox_saved", null), false);
  t("lưu bài (số thời gian)", T("nox_saved/u1/script/s1", 1700000000000, USER), true);
  t("lưu giá trị không phải số bị chặn", T("nox_saved/u1/script/s1", "x", USER), false);
  t("không ghi vào danh sách lưu của người khác", T("nox_saved/u1/script/s1", 1, OTHER), false);
  t("khách ẩn danh không lưu được", T("nox_saved/g1/script/s1", 1, GUEST), false);
  const note = { title: "Bảo trì máy chủ", body: "Từ 22h", level: "planned", start: 1, end: 2, ts: 1 };
  t("ai cũng đọc được ghi chú bảo trì", Rd("nox_maintnotes", null), true);
  t("DEV đăng ghi chú bảo trì", T("nox_maintnotes/n1", note, DEV), true);
  t("user thường KHÔNG đăng", T("nox_maintnotes/n1", note, USER), false);
  t("DEV chưa xác minh email KHÔNG đăng", T("nox_maintnotes/n1", note, DEV_UNVERIFIED), false);
  t("mức độ lạ bị chặn", T("nox_maintnotes/n1", { ...note, level: "evil" }, DEV), false);
  t("tiêu đề rỗng bị chặn", T("nox_maintnotes/n1", { ...note, title: "" }, DEV), false);
  t("nội dung quá 2000 ký tự bị chặn", T("nox_maintnotes/n1", { ...note, body: "x".repeat(2001) }, DEV), false);
  t("khóa lạ bị chặn", T("nox_maintnotes/n1", { ...note, evil: 1 }, DEV), false);
  t("DEV xóa ghi chú", T("nox_maintnotes/n1", null, DEV), true);
  t("DEV có cổng 2 bước chưa nhập mã → bị chặn (đúng nguyên nhân 'không có quyền')", T("nox_maintnotes/n1", note, { ...DEV, token: { ...DEV.token, auth_time: 100 } }, gate), false);
  t("DEV nhập mã phiên → đăng được", T("nox_maintnotes/n1", note, g2(DEV), gate), true);
  t("probe: DEV ghi/đọc được", [T("nox_probe/last", 1, DEV), Rd("nox_probe/last", DEV)].join(), "true,true");
  t("probe: user thường không ghi/đọc", [T("nox_probe/last", 1, USER), Rd("nox_probe/last", USER)].join(), "false,false");
  t("probe: DEV thiếu thẻ phiên bị chặn (chẩn đoán phát hiện đúng)", T("nox_probe/last", 1, { ...DEV, token: { ...DEV.token, auth_time: 100 } }, gate), false);
  t("tin nhắn: preview ≤ 140 ký tự", [T("nox_threads/u1/t1/preview", "a".repeat(140), USER, JSON.parse(JSON.stringify(root))), T("nox_threads/u1/t1/preview", "a".repeat(141), USER, JSON.parse(JSON.stringify(root)))].join(), "true,false");
}

console.log("ĐỢT SHOP: cửa hàng, ví, đơn hàng, tệp chat");
{
  const N = Date.now(), D = { ...DEV, token: { ...DEV.token, auth_time: 100, tf1: 100 } }, U1 = USER, U2 = OTHER;
  const sh = JSON.parse(JSON.stringify(root));
  sh.nox_shop = { items: { p1: { name: "Key", price: 1000, stock: 3, mode: "lines", active: true } }, cats: { c1: { name: "Game" } } };
  sh.nox_shopsecret = { p1: { lines: { a: "K1" } } };
  sh.nox_wallet = { u1: { code: "SKN12345678", balance: 5000 } }; sh.nox_txs = { u1: { t1: { type: "topup", amount: 5000, ts: 1 } } };
  sh.nox_orders = { u1: { o1: { status: "paid", total: 1000 } } }; sh.nox_topups = { u1: { x: { amount: 50000, status: "pending" } } }; sh.nox_bankhook = { sepay_1: { status: "credited" } }; sh.nox_topcodes = { SKN12345678: "u1" };
  sh.nox_security = { u1: { twofa: true, gate: true }, d1: { gate: true } };
  sh.nox_threads = { u1: { chat: { type: "chat", status: "open", createdAt: 1, updatedAt: 1 } } };
  sh.nox_filemeta = { u1: { chat: { f1: { name: "a.png", mime: "image/png", kind: "image", size: 1000, by: "u1" }, f2: { name: "d.png", mime: "image/png", kind: "image", size: 500, by: "d1" } } } };
  sh.nox_files = { u1: { chat: { f1: { name: "a.png", data: "data:image/png;base64,AAAA", by: "u1" } } } };
  const U1G = { ...U1, token: { ...U1.token, auth_time: 100, tf1: 100 } };
  const P = (p, v, a, rr = sh) => eng.write([{ segs: split(p), value: v }], a, rr).ok, Rd = (p, a, rr = sh) => eng.canRead(split(p), a, rr);
  const prod = { name: "Script VIP", price: 50000, stock: 10, cat: "c1", mode: "text", active: true, createdAt: N };
  t("shop: ai cũng đọc được hàng và mục lục (kể cả khách)", [Rd("nox_shop/items", null), Rd("nox_shop/cats", null)].join(), "true,true");
  t("shop: DEV thêm/sửa/xoá hàng", [P("nox_shop/items/p2", prod, D), P("nox_shop/items/p1/price", 2000, D), P("nox_shop/items/p1", null, D)].join(), "true,true,true");
  t("shop: user thường / khách KHÔNG thêm, sửa giá, sửa kho, xoá hàng", [P("nox_shop/items/p2", prod, U1G), P("nox_shop/items/p1/price", 1, U1G), P("nox_shop/items/p1/stock", 999, U1G), P("nox_shop/items/p1", null, U1G), P("nox_shop/items/p2", prod, null)].join(), "false,false,false,false,false");
  t("shop: DEV chưa nhập mã phiên (2FA) bị chặn đúng như các phần khác", P("nox_shop/items/p2", prod, { ...DEV, token: { ...DEV.token, auth_time: 100 } }), false);
  t("shop: giá âm / giá lẻ / quá lớn bị chặn", [P("nox_shop/items/p2", { ...prod, price: -1 }, D), P("nox_shop/items/p2", { ...prod, price: 10.5 }, D), P("nox_shop/items/p2", { ...prod, price: 2e9 }, D)].join(), "false,false,false");
  t("shop: kho âm / lẻ bị chặn; kho 0 được", [P("nox_shop/items/p2", { ...prod, stock: -1 }, D), P("nox_shop/items/p2", { ...prod, stock: 1.5 }, D), P("nox_shop/items/p2", { ...prod, stock: 0 }, D)].join(), "false,false,true");
  t("shop: thiếu tên/giá, mode lạ, khoá lạ bị chặn", [P("nox_shop/items/p2", { price: 1 }, D), P("nox_shop/items/p2", { ...prod, mode: "hack" }, D), P("nox_shop/items/p2", { ...prod, evil: 1 }, D)].join(), "false,false,false");
  t("shop: ảnh hàng chỉ nhận data:image jpeg/png/webp ≤ 36.000 ký tự", [P("nox_shop/items/p2", { ...prod, img: "data:image/jpeg;base64," + "A".repeat(2000) }, D), P("nox_shop/items/p2", { ...prod, img: "data:image/svg+xml;base64,AAAA" }, D), P("nox_shop/items/p2", { ...prod, img: "data:image/png;base64," + "A".repeat(37000) }, D), P("nox_shop/items/p2", { ...prod, imgs: { a: "data:image/png;base64,AAAA", b: "data:image/webp;base64,BBBB" } }, D)].join(), "true,false,false,true");
  t("shop: DEV thêm mục lục; user thì không", [P("nox_shop/cats/c2", { name: "Tài khoản", sort: 2 }, D), P("nox_shop/cats/c2", { name: "x" }, U1G)].join(), "true,false");
  t("nội dung giao hàng (shopsecret): chỉ DEV đọc/ghi", [Rd("nox_shopsecret/p1", D), Rd("nox_shopsecret/p1", U1G), Rd("nox_shopsecret", null), P("nox_shopsecret/p1/text", "https://x", D), P("nox_shopsecret/p1/text", "hack", U1G)].join(), "true,false,false,true,false");
  t("ví: chủ đọc ví của mình, người khác không, DEV có", [Rd("nox_wallet/u1", U1G), Rd("nox_wallet/u1", U2), Rd("nox_wallet/u1", D), Rd("nox_wallet", U1G), Rd("nox_wallet", null)].join(), "true,false,true,false,false");
  t("ví: KHÔNG ai ghi được từ trình duyệt — kể cả chủ ví và DEV (chỉ máy chủ)", [P("nox_wallet/u1/balance", 99999999, U1G), P("nox_wallet/u1", { code: "SKN1", balance: 1e9 }, U1G), P("nox_wallet/u1/balance", 99999999, D), P("nox_wallet/u2", { code: "SKN2", balance: 1e9 }, U2)].join(), "false,false,false,false");
  t("lịch sử giao dịch: chủ/DEV đọc, người khác không; không ai ghi", [Rd("nox_txs/u1", U1G), Rd("nox_txs/u1", U2), Rd("nox_txs/u1", D), P("nox_txs/u1/t9", { type: "topup", amount: 1e9, ts: 1 }, U1G), P("nox_txs/u1/t1", null, U1G), P("nox_txs/u1/t1", null, D)].join(), "true,false,true,false,false,false");
  t("đơn hàng: chủ đọc đơn của mình, DEV đọc tất cả, người khác không; không ai ghi/sửa/xoá", [Rd("nox_orders/u1/o1", U1G), Rd("nox_orders/u1", U2), Rd("nox_orders", D), P("nox_orders/u1/o1/status", "refunded", U1G), P("nox_orders/u1/o9", { status: "paid", total: 0 }, U1G), P("nox_orders/u1/o1", null, D)].join(), "true,false,true,false,false,false");
  t("yêu cầu nạp: chủ đọc; không ai ghi", [Rd("nox_topups/u1", U1G), Rd("nox_topups/u1", U2), P("nox_topups/u1/x/status", "done", U1G)].join(), "true,false,false");
  t("giao dịch ngân hàng: chỉ DEV đọc; không ai ghi", [Rd("nox_bankhook", D), Rd("nox_bankhook", U1G), P("nox_bankhook/sepay_9", { status: "credited" }, D), P("nox_bankhook/sepay_9", { status: "credited" }, U1G)].join(), "true,false,false,false");
  t("chỉ mục mã nạp: không ai đọc/ghi từ trình duyệt", [Rd("nox_topcodes", D), Rd("nox_topcodes/SKN12345678", U1G), P("nox_topcodes/SKN99999999", "u1", U1G)].join(), "false,false,false");
  /* tệp đính kèm trong tin nhắn */
  const att = { id: "f1", name: "a.png", mime: "image/png", kind: "image", size: 1000 };
  const msg = (extra, from = "user") => ({ from, ts: N, ...extra });
  t("tin nhắn chỉ có tệp (không chữ) hợp lệ khi tệp do chính người gửi tải lên", P("nox_msgs/u1/chat/m1", msg({ att }), U1G), true);
  t("tin nhắn vừa chữ vừa tệp hợp lệ", P("nox_msgs/u1/chat/m1", msg({ text: "xem giúp", att }), U1G), true);
  t("tin nhắn không chữ không tệp bị chặn", P("nox_msgs/u1/chat/m1", msg({}), U1G), false);
  t("tệp không tồn tại (id bịa) bị chặn", P("nox_msgs/u1/chat/m1", msg({ att: { ...att, id: "zzz" } }), U1G), false);
  t("dùng tệp do người khác tải lên (f2 do dev) bị chặn", P("nox_msgs/u1/chat/m1", msg({ att: { id: "f2", name: "d.png", mime: "image/png", kind: "image", size: 500 } }), U1G), false);
  t("khai gian loại/kích thước/tên so với tệp thật bị chặn", [P("nox_msgs/u1/chat/m1", msg({ att: { ...att, mime: "text/html" } }), U1G), P("nox_msgs/u1/chat/m1", msg({ att: { ...att, kind: "video" } }), U1G), P("nox_msgs/u1/chat/m1", msg({ att: { ...att, size: 1 } }), U1G), P("nox_msgs/u1/chat/m1", msg({ att: { ...att, name: "virus.exe" } }), U1G), P("nox_msgs/u1/chat/m1", msg({ att: { ...att, extra: 1 } }), U1G)].join(), "false,false,false,false,false");
  t("DEV gửi tệp do chính DEV tải (f2) trong cuộc trò chuyện của user", P("nox_msgs/u1/chat/m2", msg({ att: { id: "f2", name: "d.png", mime: "image/png", kind: "image", size: 500 } }, "dev"), D), true);
  t("tin có tệp vẫn bị chặn khi người dùng bị tắt tiếng", P("nox_msgs/u1/chat/m1", msg({ att }), U1G, { ...sh, nox_admin: { u1: { muteUntil: N + 3600000 } } }), false);
  t("tệp đính kèm: chủ + DEV đọc, người khác không; không ai ghi mới", [Rd("nox_files/u1/chat/f1", U1G), Rd("nox_files/u1/chat/f1", D), Rd("nox_files/u1/chat/f1", U2), Rd("nox_files/u1", null), P("nox_files/u1/chat/f9", { data: "data:image/png;base64,AAAA" }, U1G), P("nox_files/u1/chat/f9", { data: "x" }, D)].join(), "true,true,false,false,false,false");
  t("DEV xoá được tệp/bộ đếm khi xoá cuộc trò chuyện; user thì không", [P("nox_files/u1/chat", null, D), P("nox_filemeta/u1/chat", null, D), P("nox_filecount/u1/chat", null, D), P("nox_files/u1/chat", null, U1G)].join(), "true,true,true,false");
}

console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
