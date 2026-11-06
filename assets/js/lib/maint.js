/* Chế độ bảo trì: khách thấy màn hình bảo trì có đếm ngược; quản trị viên và trang đăng nhập không bị chặn. */
import { $, pad } from "./util.js";
import { store, autoCloseMaintenance } from "./store.js";
import { session } from "./auth.js";

let timer = null, firstSeen = 0;
const until = m => { if (m.until) return Number(m.until); const b = Number(m.ts) || 0; if (b) return b + 60000; if (!firstSeen) firstSeen = Date.now(); return firstSeen + 60000; };
const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ":" : "") + pad(m) + ":" + pad(s % 60); };
export const resetMaintClock = () => { firstSeen = 0; };
export function applyMaint() {
  const m = store.maint; let on = !!(m && m.enabled), end = 0;
  if (on) { end = until(m); if (Date.now() >= end) { autoCloseMaintenance(); on = false; } }
  const onAuthPage = /^\/(login|register|forgot-password)(\/|$)/.test(location.pathname);
  const show = on && !session.isDev && !onAuthPage;
  $("#maint").classList.toggle("on", show);
  if (timer) { clearInterval(timer); timer = null; }
  if (show) {
    const total = Math.max(1000, end - (Number(m.ts) || firstSeen || (end - 60000)));
    const tick = () => { const left = end - Date.now(); $("#mntClock").textContent = fmt(left); $("#mntBar").style.width = (Math.max(0, Math.min(1, left / total)) * 100).toFixed(1) + "%"; if (left <= 0) { clearInterval(timer); timer = null; applyMaint(); } };
    tick(); timer = setInterval(tick, 250); document.body.classList.add("locked");
  } else if (!$("#mdNotice").classList.contains("on") && !$("#side").classList.contains("open")) document.body.classList.remove("locked");
}
