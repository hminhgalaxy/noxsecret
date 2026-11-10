/* Yêu thích + đã xem gần đây: lưu ngay trên trình duyệt này (không cần tài khoản, không gửi lên máy chủ). */
const FK = "ssw_favs", RK = "ssw_recent", MAX_FAV = 200, MAX_RECENT = 12;
const read = k => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v.filter(x => x && typeof x.c === "string" && typeof x.k === "string") : []; } catch (_) { return []; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} document.dispatchEvent(new CustomEvent("favs-change")); };
export const favs = () => read(FK);
export const isFav = (c, k) => read(FK).some(x => x.c === c && x.k === k);
export function toggleFav(c, k) {
  const l = read(FK), i = l.findIndex(x => x.c === c && x.k === k);
  if (i >= 0) { l.splice(i, 1); write(FK, l); return false; }
  l.unshift({ c, k, ts: Date.now() }); write(FK, l.slice(0, MAX_FAV)); return true;
}
export const recent = () => read(RK);
export function pushRecent(c, k) {
  const l = read(RK).filter(x => !(x.c === c && x.k === k)); l.unshift({ c, k, ts: Date.now() });
  const cur = read(RK); if (cur[0] && cur[0].c === c && cur[0].k === k) return; /* đã ở đầu danh sách: không ghi lại */
  write(RK, l.slice(0, MAX_RECENT));
}
export const clearRecent = () => write(RK, []);
export const onFavs = cb => { document.addEventListener("favs-change", cb); return () => document.removeEventListener("favs-change", cb); };
