import fs from "node:fs";
import "./rules-engine.js";
const { create, setAt, split } = globalThis.RulesEngine;
const rules = JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url)));
const eng = create(rules);
const DEV = { uid: "d1", token: { email: "HMinhGalaxy@gmail.com", email_verified: true } };
const DEV_UNVERIFIED = { uid: "d2", token: { email: "hminhgalaxy@gmail.com", email_verified: false } };
const USER = { uid: "u1", token: { email: "user@example.com", email_verified: true } };
const OTHER = { uid: "u2", token: { email: "other@example.com", email_verified: true } };
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
t("khách đọc các khóa theme công khai", ["bgType", "bgData", "audioData", "audioName"].every(k => R("nox_theme/" + k, null)), true);
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

console.log(`\n${pass} đạt, ${fail} lỗi`); process.exit(fail ? 1 : 0);
