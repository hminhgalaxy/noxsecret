/* Tầng dữ liệu cho mục Trợ giúp: hỗ trợ / báo cáo / nhắn tin với dev, quyền đăng bài và bài chờ duyệt.
   Quyền thật do database.rules.json quyết định; các hàm ở đây chỉ gửi đúng định dạng và dịch lỗi ra tiếng Việt. */
import { db, TS } from "./firebase.js";
import { session } from "./auth.js";
import { DATA_ROOT, CATS_NODE } from "./config.js";
import { slugify, store, validateItem, RISKS } from "./store.js";
import { validUrl } from "./util.js";
import { isLocalImg } from "./avatar.js";

export const THREADS = "nox_threads", MSGS = "nox_msgs", PENDING = "nox_pending", PERMS = "nox_perms";
export const REPORT_REASONS = { malware: "Có mã độc / virus", scam: "Lừa đảo", copyright: "Vi phạm bản quyền", inappropriate: "Nội dung không phù hợp", broken: "Link hỏng / không hoạt động", other: "Lý do khác" };
export const TYPE_LABEL = { support: "Hỗ trợ", report: "Báo cáo", chat: "Nhắn tin" };
const err = m => Object.assign(new Error(m), { code: "app/help" });
const denied = e => { const x = new Error(e && (e.code === "PERMISSION_DENIED" || e.code === "permission-denied") ? "Bạn không có quyền thực hiện thao tác này (có thể đang bị khóa hoặc bị tắt tiếng)." : "Chưa gửi được. Vui lòng kiểm tra mạng và thử lại."); x.code = e && e.code; return x; };
const need = () => { if (!db) throw err("Chưa kết nối được dữ liệu. Vui lòng tải lại trang."); if (!session.user || session.user.isAnonymous) throw err("Hãy đăng nhập bằng tài khoản thật để dùng tính năng này."); return session.user.uid; };
const wrap = p => p.catch(e => { throw e && e.code === "app/help" ? e : denied(e); });
const rows = v => Object.keys(v || {}).map(k => ({ key: k, ...v[k] }));
const listen = (path, cb) => { if (!db) { cb(null); return () => {}; } const ref = db.ref(path), h = ref.on("value", s => cb(s.val()), () => cb(null)); return () => ref.off("value", h); };

/* ───── Hỗ trợ / báo cáo / chat ───── */
export const listenMyThreads = cb => { const u = session.user && session.user.uid; return u ? listen(THREADS + "/" + u, v => cb(rows(v).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)))) : (cb([]), () => {}); };
export const listenMsgs = (uid, tid, cb) => listen(MSGS + "/" + uid + "/" + tid, v => cb(rows(v).sort((a, b) => (a.ts || 0) - (b.ts || 0))));
export const listenThread = (uid, tid, cb) => listen(THREADS + "/" + uid + "/" + tid, v => cb(v ? { key: tid, uid, ...v } : null));
const cleanText = (t, max = 2000) => String(t || "").replace(/\r/g, "").trim().slice(0, max);
/* Tạo yêu cầu mới + tin đầu tiên trong MỘT lần ghi (chat dùng id cố định "chat" nên chỉ có một cuộc trò chuyện) */
export function createThread({ type, subject, text, ref, wantPost, id }) {
  const uid = need(), body = cleanText(text); if (!body) throw err("Hãy nhập nội dung.");
  const tid = id || db.ref(THREADS + "/" + uid).push().key, mid = db.ref(MSGS + "/" + uid + "/" + tid).push().key, t = {};
  t[THREADS + "/" + uid + "/" + tid] = { type, subject: cleanText(subject, 120), status: "open", last: "user", unreadDev: true, preview: body.slice(0, 140), createdAt: TS(), updatedAt: TS(), ...(wantPost ? { wantPost: true } : {}), ...(ref ? { ref } : {}) };
  t[MSGS + "/" + uid + "/" + tid + "/" + mid] = { from: "user", text: body, ts: TS() };
  return wrap(db.ref().update(t)).then(() => tid);
}
/* Gửi thêm tin: người dùng (asDev=false) hoặc DEV trả lời (asDev=true, uid = chủ cuộc trò chuyện) */
const ATT_LABEL = { image: "[Ảnh] ", video: "[Video] ", file: "[Tệp] " };
export function sendMsg(uid, tid, text, asDev = false, att = null) {
  if (!asDev) need(); else if (!session.isDev) throw err("Bạn không có quyền thực hiện thao tác này.");
  const cap = cleanText(text); if (!cap && !att) throw err("Hãy nhập nội dung.");
  const body = cap || (ATT_LABEL[att.kind] || "[Tệp] ") + String(att.name || "").slice(0, 60);
  const mid = db.ref(MSGS + "/" + uid + "/" + tid).push().key, t = {};
  t[MSGS + "/" + uid + "/" + tid + "/" + mid] = Object.assign({ from: asDev ? "dev" : "user", ts: TS() }, cap ? { text: cap } : {}, att ? { att: { id: att.id, name: att.name, mime: att.mime, kind: att.kind, size: att.size } } : {});
  Object.assign(t, asDev ? { [THREADS + "/" + uid + "/" + tid + "/last"]: "dev", [THREADS + "/" + uid + "/" + tid + "/unreadUser"]: true, [THREADS + "/" + uid + "/" + tid + "/unreadDev"]: false, [THREADS + "/" + uid + "/" + tid + "/updatedAt"]: TS(), [THREADS + "/" + uid + "/" + tid + "/preview"]: body.slice(0, 140) }
    : { [THREADS + "/" + uid + "/" + tid + "/last"]: "user", [THREADS + "/" + uid + "/" + tid + "/unreadDev"]: true, [THREADS + "/" + uid + "/" + tid + "/unreadUser"]: false, [THREADS + "/" + uid + "/" + tid + "/updatedAt"]: TS(), [THREADS + "/" + uid + "/" + tid + "/preview"]: body.slice(0, 140) });
  return wrap(db.ref().update(t));
}
export const markRead = (uid, tid, asDev) => db && db.ref(THREADS + "/" + uid + "/" + tid + (asDev ? "/unreadDev" : "/unreadUser")).set(false).catch(() => {});
export const setThreadStatus = (uid, tid, status) => { if (!session.isDev) throw err("Bạn không có quyền thực hiện thao tác này."); return wrap(db.ref(THREADS + "/" + uid + "/" + tid).update({ status, updatedAt: TS() })); };
export const deleteThread = (uid, tid) => { if (!session.isDev) throw err("Bạn không có quyền thực hiện thao tác này."); return wrap(db.ref().update({ [THREADS + "/" + uid + "/" + tid]: null, [MSGS + "/" + uid + "/" + tid]: null, ["nox_files/" + uid + "/" + tid]: null, ["nox_filemeta/" + uid + "/" + tid]: null, ["nox_filecount/" + uid + "/" + tid]: null })); };
export const listenAllThreads = cb => listen(THREADS, v => { const out = []; Object.keys(v || {}).forEach(uid => rows(v[uid]).forEach(t => out.push({ ...t, uid, tid: t.key }))); cb(out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))); });

/* ───── Quyền đăng bài (DEV cấp) + điều kiện ───── */
export const listenMyPerm = cb => { const u = session.user && session.user.uid; return u ? listen(PERMS + "/" + u, v => cb(!!(v && v.post))) : (cb(false), () => {}); };
export const listenPerms = cb => listen(PERMS, v => cb(v || {}));
export const grantPost = (uid, on) => { if (!session.isDev) throw err("Bạn không có quyền thực hiện thao tác này."); return wrap(db.ref(PERMS + "/" + uid).set(on ? { post: true, by: session.user.email || "DEV", ts: TS() } : null)); };
/* 3 điều kiện để đăng: email đã xác minh + DEV đã cấp phép + đã bật xác minh 2 bước */
export const postConditions = perm => ({ email: !!(session.user && session.user.emailVerified), perm: !!perm, twofa: !!(session.sec && session.sec.twofa) });
export const canPost = perm => { const c = postConditions(perm); return c.email && c.perm && c.twofa; };

/* ───── Bài chờ duyệt ───── */
export const listenMyPending = cb => { const u = session.user && session.user.uid; return u ? listen(PENDING + "/" + u, v => cb(rows(v).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))) : (cb([]), () => {}); };
export const listenAllPending = cb => listen(PENDING, v => { const out = []; Object.keys(v || {}).forEach(uid => rows(v[uid]).forEach(p => out.push({ ...p, uid, pid: p.key }))); cb(out.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))); });
const strip = o => { const p = {}; Object.keys(o).forEach(k => { if (o[k] !== "" && o[k] != null) p[k] = o[k]; }); return p; };
/* kind "item": { catId, name, desc, url, code, img } · kind "category": { name, sub, icon, need } — kiểm tra phía trình duyệt, Rules kiểm tra lại */
export function submitPending(f) {
  const uid = need(); const o = { kind: f.kind, name: String(f.name || "").trim(), status: "pending", createdAt: TS() };
  if (!o.name) throw err("Hãy nhập tên.");
  if (f.kind === "item") {
    const cat = store.cats.find(c => c.id === f.catId); if (!cat) throw err("Hãy chọn danh mục.");
    const e = validateItem({ ...cat, need: cat.need || "any" }, { name: o.name, desc: f.desc || "", url: f.url || "", code: f.code || "", img: f.img || "" });
    if (f.url && !/^https:\/\//i.test(f.url.trim())) e.url = "Chỉ nhận link bắt đầu bằng https://.";
    if ((f.code || "").length > 50000) e.code = "Code tối đa 50.000 ký tự khi gửi chờ duyệt.";
    const first = Object.values(e)[0]; if (first) throw err(first);
    Object.assign(o, strip({ catId: f.catId, desc: String(f.desc || "").trim(), url: String(f.url || "").trim(), code: f.code || "", img: isLocalImg(f.img) ? f.img : "" }));
  } else if (f.kind === "category") {
    if (store.cats.some(c => c.label.toLowerCase() === o.name.toLowerCase())) throw err("Tên danh mục đã tồn tại.");
    Object.assign(o, strip({ sub: String(f.sub || "").trim().slice(0, 120), icon: f.icon || "box", need: f.need || "any" }));
  } else throw err("Loại bài không hợp lệ.");
  const pid = db.ref(PENDING + "/" + uid).push().key;
  return wrap(db.ref(PENDING + "/" + uid + "/" + pid).set(o)).then(() => pid);
}
export const withdrawPending = pid => { const uid = need(); return wrap(db.ref(PENDING + "/" + uid + "/" + pid).remove()); };
/* DEV duyệt: tạo mục/danh mục công khai VÀ xóa bài chờ trong cùng một lần ghi; DEV có thể sửa trước khi duyệt (override) và gán phân loại rủi ro cho danh mục */
export function approvePending(p, o = {}) {
  if (!session.isDev) throw err("Bạn không có quyền thực hiện thao tác này.");
  const t = {}; t[PENDING + "/" + p.uid + "/" + p.pid] = null;
  if (p.kind === "item") {
    const cat = store.cats.find(c => c.id === p.catId); if (!cat) throw err("Danh mục đích không còn tồn tại.");
    const k = db.ref(DATA_ROOT + "/" + cat.node).push().key;
    t[DATA_ROOT + "/" + cat.node + "/" + k] = strip({ name: p.name, desc: p.desc, url: p.url, code: p.code, img: isLocalImg(p.img) ? p.img : "", createdAt: TS(), ...(p.code ? { copies: 0 } : {}) });
  } else {
    const node = slugify(p.name), k = db.ref(CATS_NODE).push().key;
    t[CATS_NODE + "/" + k] = { name: p.name, node, sub: p.sub || "", icon: p.icon || "box", color: "#a3a3a3", need: p.need || "any", ...(RISKS[o.risk || ""] !== undefined && o.risk ? { risk: o.risk } : {}), createdAt: TS() };
  }
  return wrap(db.ref().update(t));
}
export const rejectPending = (p, note) => { if (!session.isDev) throw err("Bạn không có quyền thực hiện thao tác này."); return wrap(db.ref(PENDING + "/" + p.uid + "/" + p.pid).update({ status: "rejected", note: String(note || "").slice(0, 300), updatedAt: TS() })); };
