import { esc, pad } from "./util.js";
export const logs = [];
const subs = new Set();
export function dlog(type, msg) {
  const d = new Date();
  logs.unshift({ t: pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()), type, msg: String(msg) });
  if (logs.length > 80) logs.pop();
  subs.forEach(f => { try { f(); } catch (_) {} });
}
export const onLog = fn => { subs.add(fn); return () => subs.delete(fn); };
export const logHTML = () => logs.map(l => `<div><span class="t">[${l.t}]</span> <span class="${l.type}">${esc(l.msg)}</span></div>`).join("");
window.addEventListener("error", e => dlog("er", "JS: " + (e.message || "lỗi không xác định")));
window.addEventListener("unhandledrejection", e => { const r = e.reason; dlog("er", "Promise: " + ((r && (r.message || r.code)) || r || "không rõ")); });
