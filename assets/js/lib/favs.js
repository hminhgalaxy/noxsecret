/* Lưu bài viết + đã xem gần đây.
   - "Lưu": luôn lưu trên trình duyệt này; nếu đã đăng nhập tài khoản thật thì đồng bộ lên tài khoản (nox_saved/<uid>/<danh mục>/<mục>) để dùng ở máy khác.
   - "Xem gần đây": chỉ trên trình duyệt này. */
import { db } from "./firebase.js";
import { SAVED_NODE } from "./config.js";
import { session } from "./auth.js";

const FK = "ssw_favs", RK = "ssw_recent", MAX_FAV = 200, MAX_RECENT = 12;
const read = k => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v.filter(x => x && typeof x.c === "string" && typeof x.k === "string") : []; } catch (_) { return []; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} document.dispatchEvent(new CustomEvent("favs-change")); };
const real = () => !!(db && session.user && !session.isGuest);
const cloud = (c, k) => db.ref(SAVED_NODE + "/" + session.user.uid + "/" + c + "/" + k);

export const favs = () => read(FK);
export const isFav = (c, k) => read(FK).some(x => x.c === c && x.k === k);
export function toggleFav(c, k) {
  const l = read(FK), i = l.findIndex(x => x.c === c && x.k === k);
  if (i >= 0) { l.splice(i, 1); write(FK, l); if (real()) cloud(c, k).remove().catch(() => {}); return false; }
  const ts = Date.now(); l.unshift({ c, k, ts }); write(FK, l.slice(0, MAX_FAV)); if (real()) cloud(c, k).set(ts).catch(() => {}); return true;
}
/* Đăng nhập → gộp danh sách trên tài khoản với danh sách trên máy này (hợp của hai bên), rồi đẩy phần chỉ có ở máy này lên tài khoản */
let syncedUid = "";
export function syncSaved() {
  if (!real()) { syncedUid = ""; return; }
  const uid = session.user.uid; if (syncedUid === uid) return; syncedUid = uid;
  db.ref(SAVED_NODE + "/" + uid).once("value").then(s => {
    const v = s.val() || {}, remote = [], have = new Set(read(FK).map(x => x.c + "/" + x.k));
    Object.keys(v).forEach(c => Object.keys(v[c] || {}).forEach(k => remote.push({ c, k, ts: Number(v[c][k]) || 0 })));
    const add = remote.filter(x => !have.has(x.c + "/" + x.k)), up = {};
    const rset = new Set(remote.map(x => x.c + "/" + x.k));
    read(FK).forEach(x => { if (!rset.has(x.c + "/" + x.k)) up[x.c + "/" + x.k] = x.ts || Date.now(); });
    if (add.length) write(FK, read(FK).concat(add).sort((a, b) => b.ts - a.ts).slice(0, MAX_FAV));
    if (Object.keys(up).length) db.ref(SAVED_NODE + "/" + uid).update(up).catch(() => {});
  }).catch(() => { syncedUid = ""; });
}
export const recent = () => read(RK);
export function pushRecent(c, k) {
  const l = read(RK).filter(x => !(x.c === c && x.k === k)); l.unshift({ c, k, ts: Date.now() });
  const cur = read(RK); if (cur[0] && cur[0].c === c && cur[0].k === k) return; /* đã ở đầu danh sách: không ghi lại */
  write(RK, l.slice(0, MAX_RECENT));
}
export const clearRecent = () => write(RK, []);
export const onFavs = cb => { document.addEventListener("favs-change", cb); return () => document.removeEventListener("favs-change", cb); };
