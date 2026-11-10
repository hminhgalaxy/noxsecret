/* Kho dữ liệu realtime dùng chung: mỗi node chỉ có MỘT listener cho cả ứng dụng. */
import { db, TS } from "./firebase.js";
import { DATA_ROOT, CATS_NODE, MAINT_NODE, NOTICE_NODE, THEME_NODE, TRACKS_NODE, TRACKDATA_NODE, MAX_TRACKS, USERS_NODE, UPDATES_NODE, ADMIN_NODE, THEME_PUBLIC_KEYS } from "./config.js";
import { session } from "./auth.js";
import { pick, vi, validUrl } from "./util.js";
import { isLocalImg } from "./avatar.js";
import { dlog } from "./log.js";

export const BASE_CATS = [
  { id: "script", label: "Script", node: "scripts", path: "scripts", color: "#a3a3a3", sub: "Kho script gọn gàng, được cập nhật liên tục.", base: true, need: "code" },
  { id: "apk", label: "APK", node: "apks", path: "apk", color: "#a3a3a3", sub: "Kho APK và APK Vault.", base: true, need: "url" },
  { id: "link", label: "LINK", node: "links", path: "links", color: "#a3a3a3", sub: "Những liên kết hữu ích.", base: true, need: "url" },
  { id: "ios", label: "iOS", node: "ios", path: "ios", color: "#a3a3a3", sub: "Kho iOS và iOS Vault.", base: true, need: "url" }
];
/* Phân loại rủi ro do DEV gán cho danh mục (không gán = bình thường). Có phân loại thì người xem phải đọc cảnh báo trước khi vào. */
export const RISKS = { "": "Bình thường", third: "Phần mềm bên thứ ba", hack: "Hack", mod: "Mod / chỉnh sửa", game: "Can thiệp trò chơi" };
export const NEEDS = { code: "Cần code", url: "Cần link", any: "Link hoặc code" };
export const riskOf = c => (c && RISKS[c.risk || ""] && c.risk) || "";
export const store = {
  cats: BASE_CATS.slice(), data: {}, status: {}, live: {}, maint: null, notice: null, updates: [], tracks: [], theme: {}, connected: false,
  users: null, admins: {}, catsLoaded: false, started: false, removedBase: []
};
const subs = new Set();
export const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
const emit = (type, d) => subs.forEach(f => { try { f(type, d); } catch (e) { console.error(e); } });

export const catById = id => store.cats.find(c => c.id === id) || null;
export const catByPath = p => store.cats.find(c => c.path === p) || null;
export const catByNode = n => store.cats.find(c => c.node === n || c.id === n) || null;
export const nodePath = id => DATA_ROOT + "/" + catById(id).node;
export const items = id => store.data[id];
export const item = (id, key) => (store.data[id] || []).find(x => x.key === key) || null;
export const catHref = c => "/" + c.path;
export const itemHref = (id, key) => "/" + catById(id).path + "/" + encodeURIComponent(key);

export function normItem(key, o) {
  if (o == null || typeof o !== "object") o = { name: String(o ?? "") };
  return {
    key, name: pick(o, ["name", "title"]) || "(không tên)", desc: pick(o, ["desc", "description", "note"]),
    url: pick(o, ["url", "link", "href"]), code: pick(o, ["code", "script"]), img: (v => isLocalImg(v) ? v : "")(pick(o, ["img", "image", "avatar", "thumb"])),
    copies: o.copies != null ? Number(o.copies) || 0 : null, vault: !!(o.vault || o.vaulted),
    ts: Number(o.updatedAt || o.editedAt || o.createdAt || 0) || null, created: Number(o.createdAt) || null
  };
}

/* ───── Theo dõi "đã nhận dữ liệu lần đầu" để trang chỉ hiện khi tải xong ───── */
const loadedKeys = new Set(), loadWaiters = new Set();
const mark = k => { if (loadedKeys.has(k)) return; loadedKeys.add(k); loadWaiters.forEach(f => f()); };
/* keys: "cats" | "data:<id>" | "data:*" (mọi danh mục) | "maint" | "notice" | "updates" | "theme" | "users". Quá hạn → vẫn hiện trang (tránh treo khi mất mạng). */
export function waitFor(keys, timeout = 8000) {
  keys = keys || [];
  return new Promise(res => {
    let done = false, t = null;
    const expand = () => {
      const out = [];
      keys.forEach(k => {
        if (k === "data:*") { out.push("cats"); store.cats.forEach(c => out.push("data:" + c.id)); }
        else if (k.startsWith("data:") && loadedKeys.has("cats") && !store.cats.some(c => "data:" + c.id === k)) { /* danh mục không tồn tại → không chờ */ }
        else out.push(k);
      });
      return out;
    };
    const check = () => { if (!done && expand().every(k => loadedKeys.has(k))) { done = true; clearTimeout(t); loadWaiters.delete(check); res(); } };
    t = setTimeout(() => { if (!done) { done = true; loadWaiters.delete(check); dlog("er", "Quá hạn chờ dữ liệu: " + keys.join(",")); res(); } }, timeout);
    loadWaiters.add(check); check();
  });
}

/* Bộ nhớ tạm (mở trang lần sau là có dữ liệu ngay, dữ liệu mới sẽ tự thay thế khi về tới) */
const CK = "ssw_cache_v2", hydrated = new Set();
let saveT = null;
function scheduleSave() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const run = () => {
      try {
        const o = { v: 2, t: Date.now(), cats: store.cats, data: {}, updates: store.updates.slice(0, 20) };
        store.cats.forEach(c => { if (store.data[c.id]) o.data[c.id] = store.data[c.id]; });
        const j = JSON.stringify(o); if (j.length < 1800000) localStorage.setItem(CK, j); else localStorage.removeItem(CK);
      } catch (_) {}
    };
    /* Ghi vào lúc trình duyệt rảnh để không làm giật khi đang thao tác */
    typeof requestIdleCallback === "function" ? requestIdleCallback(run, { timeout: 4000 }) : run();
  }, 1500);
}
function hydrate() {
  let c = null; try { c = JSON.parse(localStorage.getItem(CK) || "null"); } catch (_) {}
  if (!c || c.v !== 2 || typeof c.data !== "object") return;
  const cached = (Array.isArray(c.cats) ? c.cats : []).filter(x => x && /^[a-z0-9-]+$/.test(x.id) && typeof x.label === "string").map(x => cleanCat(x));
  if (cached.length) { store.cats = cached; mark("cats"); }
  if (Array.isArray(c.updates)) { store.updates = c.updates.filter(x => x && typeof x.title === "string"); mark("updates"); }
  store.cats.forEach(cat => { const a = c.data[cat.id]; if (Array.isArray(a)) { store.data[cat.id] = a; store.status[cat.id] = ""; hydrated.add(cat.id); mark("data:" + cat.id); } });
}

const cleanCat = x => ({ id: x.id, label: String(x.label).slice(0, 60), node: String(x.node || x.id), path: String(x.path || ""), color: String(x.color || "#a3a3a3"), icon: x.icon ? String(x.icon).slice(0, 24) : undefined,
  sub: String(x.sub || ""), key: x.key, custom: !!x.custom, base: !!x.base, risk: RISKS[x.risk || ""] !== undefined ? (x.risk || "") : "", need: NEEDS[x.need] ? x.need : "any" });
const handlers = {};
let resolveReady; export const ready = new Promise(r => { resolveReady = r; });
let pending = BASE_CATS.length, readyDone = false;
const baseSynced = () => { if (--pending <= 0 && !readyDone) { readyDone = true; resolveReady(); } };
let catsResolve; export const catsReady = new Promise(r => { catsResolve = r; });
catsReady.then(() => { if (!readyDone) { readyDone = true; resolveReady(); } });

function attachCat(id) {
  const isBase = BASE_CATS.some(c => c.id === id);
  if (!db) { store.status[id] = "error"; store.data[id] = null; mark("data:" + id); emit("data", id); if (isBase) baseSynced(); return; }
  if (!hydrated.has(id)) store.data[id] = null; store.status[id] = "";
  const path = nodePath(id), ref = db.ref(path); if (handlers[id]) ref.off("value", handlers[id]);
  let first = true;
  handlers[id] = ref.on("value", snap => {
    if (!catById(id)) return; /* danh mục vừa bị xóa: bỏ qua dữ liệu đến muộn */
    const v = snap.val() || {};
    store.data[id] = Object.keys(v).map(k => normItem(k, v[k])).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    store.status[id] = ""; store.live[id] = true; hydrated.delete(id); dlog("in", "Sync " + path + ": " + store.data[id].length + " mục");
    mark("data:" + id); emit("data", id); scheduleSave(); if (first) { first = false; if (isBase) baseSynced(); }
  }, err => {
    dlog("er", "Listener " + path + ": " + (err.code || err.message));
    if (!hydrated.has(id)) { store.data[id] = null; store.status[id] = "error"; }
    store.live[id] = true; mark("data:" + id); emit("data", id);
    if (first) { first = false; if (isBase) baseSynced(); }
  });
}
export function retryCat(id) { attachCat(id); }

function rebuildCats(map) {
  map = map || {};
  /* Danh mục gốc (Script/APK/iOS/Link) giờ cũng do DEV quản lý: bản ghi cùng khóa với id gốc là phần chỉnh sửa / đánh dấu đã xóa */
  const bases = BASE_CATS.filter(b => !(map[b.id] && map[b.id].removed === true)).map(b => {
    const o = map[b.id] || {};
    return cleanCat({ ...b, label: o.name || b.label, sub: o.sub != null ? o.sub : b.sub, color: o.color || b.color, icon: o.icon || undefined, risk: o.risk, need: NEEDS[o.need] ? o.need : b.need, key: b.id });
  });
  const customs = Object.keys(map).map(k => {
    const o = map[k] || {};
    return cleanCat({ id: String(o.node || k).toLowerCase(), label: String(o.name || k), node: String(o.node || k), path: "c/" + String(o.node || k).toLowerCase(),
      color: o.color || "#a3a3a3", icon: o.icon || "box", sub: o.sub || "", key: k, custom: true, risk: o.risk, need: NEEDS[o.need] ? o.need : "any" });
  }).filter(c => /^[a-z0-9-]+$/.test(c.id) && !BASE_CATS.some(b => b.id === c.id) && !(map[c.key] && map[c.key].removed === true));
  const next = bases.concat(customs), ids = new Set(next.map(c => c.id));
  store.cats.filter(c => !ids.has(c.id)).forEach(old => {
    if (db && handlers[old.id]) { try { db.ref(DATA_ROOT + "/" + old.node).off("value", handlers[old.id]); } catch (_) {} }
    delete handlers[old.id]; delete store.data[old.id]; delete store.status[old.id]; delete store.live[old.id]; hydrated.delete(old.id);
  });
  store.cats = next;
  next.forEach(c => { if (!handlers[c.id]) attachCat(c.id); });
  store.removedBase = BASE_CATS.filter(b => !ids.has(b.id));
  store.catsLoaded = true; catsResolve(); mark("cats"); emit("cats"); scheduleSave();
}

export function start() {
  if (store.started) return; store.started = true;
  hydrate();
  if (!db) { BASE_CATS.forEach(c => attachCat(c.id)); store.catsLoaded = true; catsResolve(); ["cats", "maint", "notice", "updates", "theme"].forEach(mark); return; }
  db.ref(".info/connected").on("value", s => { store.connected = !!s.val(); dlog(s.val() ? "ok" : "er", "Database " + (s.val() ? "kết nối." : "mất kết nối.")); emit("conn"); });
  db.ref(MAINT_NODE).on("value", s => { store.maint = s.val() || null; mark("maint"); emit("maint"); }, () => mark("maint"));
  db.ref(NOTICE_NODE).on("value", s => { store.notice = s.val() || null; mark("notice"); emit("notice"); }, () => mark("notice"));
  db.ref(UPDATES_NODE).on("value", s => {
    const v = s.val() || {};
    store.updates = Object.keys(v).map(k => ({ key: k, title: String((v[k] && v[k].title) || ""), body: String((v[k] && v[k].body) || ""), ts: Number(v[k] && v[k].ts) || 0, tag: UPD_TAGS[v[k] && v[k].tag] ? v[k].tag : "" }))
      .filter(x => x.title).sort((a, b) => b.ts - a.ts);
    mark("updates"); emit("updates"); scheduleSave();
  }, () => mark("updates"));
  /* Theme: nghe TỪNG khóa công khai. Khóa "api" (API key) KHÔNG bao giờ được nghe ở đây. */
  const themeSeen = k => { mark("theme:" + k); if (THEME_PUBLIC_KEYS.every(x => loadedKeys.has("theme:" + x))) mark("theme"); };
  THEME_PUBLIC_KEYS.forEach(k => db.ref(THEME_NODE + "/" + k).on("value", s => { store.theme = Object.assign({}, store.theme, { [k]: s.val() }); themeSeen(k); emit("theme"); }, () => themeSeen(k)));
  db.ref(TRACKS_NODE).on("value", s => {
    const v = s.val() || {};
    store.tracks = Object.keys(v).map(k => ({ id: k, name: String((v[k] && v[k].name) || "Nhạc nền"), ts: Number(v[k] && v[k].ts) || 0 })).sort((a, b) => a.ts - b.ts);
    emit("tracks");
  }, () => { store.tracks = []; emit("tracks"); });
  db.ref(CATS_NODE).on("value", s => { rebuildCats(s.val() || {}); dlog("in", "Danh mục tùy chỉnh: " + Object.keys(s.val() || {}).length); }, () => rebuildCats({}));
  BASE_CATS.forEach(c => { if (!handlers[c.id] && store.cats.some(x => x.id === c.id)) attachCat(c.id); });
  dlog("ok", "Firebase sẵn sàng.");
}

/* Listener chỉ dành cho DEV — gắn khi đăng nhập DEV, gỡ khi đăng xuất */
let devOn = false;
export function syncDevListeners() {
  if (!db) return;
  if (session.isDev && !devOn) {
    devOn = true;
    db.ref(USERS_NODE).on("value", s => { const v = s.val() || {}; store.users = Object.keys(v).map(k => ({ uid: k, ...v[k] })).sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0)); mark("users"); emit("users"); },
      e => { store.users = null; dlog("er", "Users: " + (e.code || e.message)); mark("users"); emit("users"); });
    db.ref(ADMIN_NODE).on("value", s => { store.admins = s.val() || {}; emit("users"); }, e => dlog("er", "Admin: " + (e.code || e.message)));
  } else if (!session.isDev && devOn) {
    devOn = false; db.ref(USERS_NODE).off(); db.ref(ADMIN_NODE).off(); store.admins = {}; store.users = null; loadedKeys.delete("users"); emit("users");
  }
}

/* ───────── GHI DỮ LIỆU (quyền thật do Firebase Rules quyết định) ───────── */
const denied = e => { const x = new Error(e.code === "PERMISSION_DENIED" || e.code === "permission-denied" ? "Bạn không có quyền thực hiện thao tác này." : "Chưa lưu được. Vui lòng kiểm tra mạng và thử lại."); x.code = e.code; return x; };
const guardDev = () => { if (!db) throw new Error("Chưa kết nối được dữ liệu. Vui lòng tải lại trang."); if (!session.isDev) throw new Error("Bạn không có quyền thực hiện thao tác này."); };
const guardStaff = () => { if (!db) throw new Error("Chưa kết nối được dữ liệu. Vui lòng tải lại trang."); if (!session.isDev && !session.isEditor) throw new Error("Bạn không có quyền thực hiện thao tác này."); };
const wrap = p => p.catch(e => { dlog("er", "Ghi: " + (e.code || e.message)); throw denied(e); });

export const FIELD_RULES = { name: 200, desc: 2000, url: 2048, img: 36000, code: 200000 };
export function validateItem(cat, f) {
  const e = {};
  if (!f.name.trim()) e.name = "Thiếu tên mục."; else if (f.name.length > FIELD_RULES.name) e.name = "Tên tối đa 200 ký tự.";
  if (f.desc.length > FIELD_RULES.desc) e.desc = "Mô tả tối đa 2000 ký tự.";
  if (f.img && !isLocalImg(f.img)) e.img = "Ảnh phải được chọn từ máy của bạn (JPG, PNG hoặc WebP).";
  if (f.url && (!validUrl(f.url) || f.url.length > FIELD_RULES.url)) e.url = "Link không hợp lệ (cần bắt đầu bằng http:// hoặc https://).";
  if (f.code && f.code.length > FIELD_RULES.code) e.code = "Code quá dài (tối đa 200.000 ký tự).";
  const need = cat.need || "any";
  if (need === "code") { if (!f.code.trim()) e.code = "Mục này cần có code."; }
  else if (need === "url") { if (!validUrl(f.url)) e.url = "Link không hợp lệ (cần bắt đầu bằng http:// hoặc https://)."; }
  else if (!validUrl(f.url) && !f.code.trim()) e.url = "Cần có ít nhất một link hợp lệ hoặc code.";
  return e;
}
/* fields: chỉ các khóa CÓ MẶT trong form được ghi (rỗng → null để xóa); khóa khác giữ nguyên (không đổi schema cũ) */
export function saveItem(catId, key, fields) {
  guardStaff();
  const p = {}; Object.keys(fields).forEach(k => { const v = fields[k]; p[k] = (v === "" || v === false) ? null : v; });
  if (key) { p.updatedAt = TS(); return wrap(db.ref(nodePath(catId) + "/" + key).update(p)).then(() => key); }
  Object.keys(p).forEach(k => { if (p[k] === null) delete p[k]; });
  p.createdAt = TS(); if (p.code) p.copies = 0;
  const r = db.ref(nodePath(catId)).push(); return wrap(r.set(p)).then(() => r.key);
}
export function deleteItem(catId, key) { guardStaff(); return wrap(db.ref(nodePath(catId) + "/" + key).remove()); }
export function incCopies(catId, it) {
  if (!db || it.copies == null) return Promise.resolve();
  return db.ref(nodePath(catId) + "/" + it.key + "/copies").set(it.copies + 1).catch(() => {});
}
export function slugify(name) {
  let s = vi(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
  if (!s) s = "muc-" + Date.now().toString(36);
  if (["home", "search"].includes(s)) s += "-1";
  let out = s, n = 2; while (store.cats.some(c => c.node === out || c.id === out)) out = s + "-" + (n++); return out;
}
const catFields = ({ name, sub, icon, color, risk, need }) => ({ name, sub: sub || "", icon, color: color || "#a3a3a3", risk: risk || null, need: NEEDS[need] ? need : "any" });
export function addCategory(f) {
  guardDev();
  if (store.cats.some(c => vi(c.label) === vi(f.name))) return Promise.reject(new Error("Tên danh mục đã tồn tại."));
  return wrap(db.ref(CATS_NODE).push({ ...catFields(f), node: slugify(f.name), createdAt: TS() }));
}
/* Sửa danh mục (cả danh mục gốc): chỉ ghi các trường chỉnh được */
export function updateCategory(catId, f) {
  guardDev(); const c = catById(catId); if (!c) return Promise.reject(new Error("Danh mục không tồn tại."));
  if (store.cats.some(x => x.id !== c.id && vi(x.label) === vi(f.name))) return Promise.reject(new Error("Tên danh mục đã tồn tại."));
  const p = catFields({ ...f, icon: f.icon || c.icon || "box" }); if (!p.icon) delete p.icon;
  return wrap(db.ref(CATS_NODE + "/" + (c.key || c.id)).update(p));
}
/* Xóa danh mục: danh mục tùy chỉnh thì bỏ bản ghi; danh mục gốc thì đánh dấu đã xóa (khôi phục được). Nội dung bên trong không bị xóa. */
export function deleteCategory(catId) {
  guardDev(); const c = catById(catId); if (!c) return Promise.reject(new Error("Không thể xóa danh mục này."));
  if (c.base) return wrap(db.ref(CATS_NODE + "/" + c.id).update({ removed: true }));
  if (!c.key) return Promise.reject(new Error("Không thể xóa danh mục này."));
  return wrap(db.ref(CATS_NODE + "/" + c.key).remove());
}
export const restoreCategory = id => { guardDev(); if (!BASE_CATS.some(b => b.id === id)) return Promise.reject(new Error("Không khôi phục được.")); return wrap(db.ref(CATS_NODE + "/" + id + "/removed").remove()); };
export const setMaintenance = (on, mins) => { guardDev(); const now = Date.now(); return wrap(db.ref(MAINT_NODE).update(on ? { enabled: true, by: "DEV", ts: now, until: now + mins * 60000 } : { enabled: false, by: "DEV", ts: TS() })); };
export const UPD_TAGS = { new: "Tính năng mới", improve: "Cải tiến", fix: "Sửa lỗi", security: "Bảo mật" };
export function updateUpdate(key, { title, body, tag }) {
  guardDev(); title = String(title || "").trim(); body = String(body || "").trim();
  if (!key) return Promise.reject(new Error("Không tìm thấy bài."));
  if (!title) return Promise.reject(new Error("Vui lòng nhập tiêu đề."));
  if (title.length > 120) return Promise.reject(new Error("Tiêu đề tối đa 120 ký tự."));
  if (body.length > 2000) return Promise.reject(new Error("Nội dung tối đa 2000 ký tự."));
  return wrap(db.ref(UPDATES_NODE + "/" + key).update({ title, body, tag: UPD_TAGS[tag] ? tag : null }));
}
export function addUpdate({ title, body, tag }) {
  guardDev(); title = String(title || "").trim(); body = String(body || "").trim();
  if (!title) return Promise.reject(new Error("Vui lòng nhập tiêu đề."));
  if (title.length > 120) return Promise.reject(new Error("Tiêu đề tối đa 120 ký tự."));
  if (body.length > 2000) return Promise.reject(new Error("Nội dung tối đa 2000 ký tự."));
  return wrap(db.ref(UPDATES_NODE).push(Object.assign({ title, body, ts: TS() }, UPD_TAGS[tag] ? { tag } : {})));
}
/* Quyền người dùng (chỉ DEV): vai trò, ban, mute. until = mốc thời gian (ms); PERM_UNTIL = vĩnh viễn */
export const PERM_UNTIL = 4102444800000;
export function setUserAdmin(uid, patch) {
  guardDev(); if (!uid) return Promise.reject(new Error("Thiếu người dùng."));
  const p = {}; Object.keys(patch).forEach(k => { p[k] = (patch[k] === "" || patch[k] === undefined) ? null : patch[k]; });
  p.by = session.user.email || "DEV"; p.ts = TS();
  return wrap(db.ref(ADMIN_NODE + "/" + uid).update(p));
}
export function deleteUpdate(key) { guardDev(); return wrap(db.ref(UPDATES_NODE + "/" + key).remove()); }
export const setNotice = p => { guardDev(); return wrap(db.ref(NOTICE_NODE).update({ ...p, updatedAt: TS() })); };
/* Nhạc nền: danh sách nhẹ ở nox_tracks, dữ liệu âm thanh ở nox_trackdata (chỉ tải khi tới lượt phát). */
export function loadTrackData(id) {
  if (!db) return Promise.reject(new Error("offline"));
  const path = id === "legacy" ? THEME_NODE + "/audioData" : TRACKDATA_NODE + "/" + id;
  return db.ref(path).once("value").then(s => String(s.val() || ""));
}
export function addTrack(name, data) {
  guardDev(); name = String(name || "").replace(/\.[a-z0-9]{2,5}$/i, "").trim().slice(0, 80) || "Nhạc nền";
  if (!/^data:audio\//.test(String(data))) return Promise.reject(new Error("Tệp này không phải âm thanh."));
  if ((store.tracks || []).length >= MAX_TRACKS) return Promise.reject(new Error("Danh sách nhạc đã đầy (tối đa " + MAX_TRACKS + " bài)."));
  const id = db.ref(TRACKS_NODE).push().key, up = {}; up[TRACKS_NODE + "/" + id] = { name, ts: TS(), size: String(data).length }; up[TRACKDATA_NODE + "/" + id] = data;
  return wrap(db.ref().update(up)).then(() => id);
}
export function removeTrack(id) {
  guardDev(); if (id === "legacy") return wrap(db.ref(THEME_NODE).update({ audioData: "", audioName: "", updatedAt: TS() }));
  const up = {}; up[TRACKS_NODE + "/" + id] = null; up[TRACKDATA_NODE + "/" + id] = null; return wrap(db.ref().update(up));
}
export const setTheme = p => { guardDev(); return wrap(db.ref(THEME_NODE).update({ ...p, updatedAt: TS() })); };
export const autoCloseMaintenance = () => { if (session.isDev && db) db.ref(MAINT_NODE).update({ enabled: false, by: "DEV", ts: TS() }).catch(() => {}); };
