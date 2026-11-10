/* Danh sách cập nhật (bài DEV đăng + ghi chú bản) và số thông báo chưa xem — dùng cho chuông ở đầu trang. */
import { store } from "./store.js";
import { RELEASES } from "./releases.js";

const K = "ssw_seen";
const get = () => { try { return Number(localStorage.getItem(K)) || 0; } catch (_) { return 0; } };
const put = v => { try { localStorage.setItem(K, String(v)); } catch (_) {} };

export function feed() {
  return store.updates.map(u => ({ key: u.key, title: u.title, body: u.body, ts: u.ts, tag: u.tag, src: "dev" }))
    .concat(RELEASES.map(r => ({ key: r.id, title: r.title, items: r.items, ts: r.ts, src: "release" })))
    .sort((a, b) => b.ts - a.ts);
}
function noticeTs() {
  const n = store.notice;
  return n && n.enabled !== false && ((n.body || "").trim() || (n.title || "").trim()) ? Number(n.updatedAt) || 1 : 0;
}
export const seenTs = get;
export const isNew = e => e.ts > get();
export const unreadCount = () => { const s = get(); return feed().filter(x => x.ts > s).length + (noticeTs() > s ? 1 : 0); };
export const latestTs = () => Math.max(0, ...feed().map(x => x.ts), noticeTs());
/* Đánh dấu "đã xem tất cả" — dùng mốc của bài mới nhất, không phụ thuộc đồng hồ máy */
export const markSeen = () => { const t = latestTs(); if (t > get()) put(t); };
