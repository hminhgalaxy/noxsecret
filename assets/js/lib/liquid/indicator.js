/* Thấu kính trượt: một viên kính chạy (có quán tính, nhún nhẹ khi tới nơi) dưới mục đang chọn của nhóm chọn (.seg) và thanh tab dưới. */
import { makeSpring } from "./spring.js";
const HOSTS = ".seg,#tabbar";
const items = new Map(); /* host → { ind, sx, sw, sy, sh, ro } */
let mo = null, on = false, tid = 0;
const activeOf = h => h.querySelector(".on:not(.lq-ind), [aria-checked='true'], [aria-selected='true']");
function attach(h) {
  if (items.has(h)) return;
  const ind = document.createElement("i"); ind.className = "lq-ind"; ind.setAttribute("aria-hidden", "true"); h.insertBefore(ind, h.firstChild); h.classList.add("lq-has-ind");
  const rec = { ind, x: 0, w: 0, y: 0, hh: 0, vx: 0 };
  const paint = () => { const sq = Math.min(.14, Math.abs(rec.vx) / 4200); ind.style.width = Math.max(0, rec.w) + "px"; ind.style.height = Math.max(0, rec.hh) + "px";
    ind.style.transform = `translate(${rec.x.toFixed(1)}px,${rec.y.toFixed(1)}px) scale(${(1 + sq).toFixed(3)},${(1 - sq * .8).toFixed(3)})`; };
  rec.sx = makeSpring(0, { k: 340, c: 22, onUpdate: (x, v) => { rec.x = x; rec.vx = v; paint(); } });
  rec.sw = makeSpring(0, { k: 300, c: 24, onUpdate: w => { rec.w = w; paint(); } });
  rec.sy = makeSpring(0, { k: 340, c: 26, onUpdate: y => { rec.y = y; paint(); } });
  rec.sh = makeSpring(0, { k: 340, c: 26, onUpdate: hh => { rec.hh = hh; paint(); } });
  rec.first = true; items.set(h, rec);
}
function place(h, jump) {
  const rec = items.get(h); if (!rec) return; const a = activeOf(h);
  if (!a || a.offsetParent === null) { rec.ind.style.opacity = "0"; rec.first = true; return; }
  const j = jump || rec.first; rec.first = false; rec.ind.style.opacity = "1";
  const pad = h.id === "tabbar" ? 0 : 0;
  rec.sx.to(a.offsetLeft - pad, j); rec.sw.to(a.offsetWidth + pad * 2, j); rec.sy.to(a.offsetTop, j); rec.sh.to(a.offsetHeight, j);
}
function scan(jump) {
  document.querySelectorAll(HOSTS).forEach(h => { if (!items.has(h)) { attach(h); place(h, true); } else place(h, !!jump); });
  items.forEach((rec, h) => { if (!h.isConnected) { ["sx", "sw", "sy", "sh"].forEach(k => rec[k].stop()); items.delete(h); } });
}
const later = jump => { clearTimeout(tid); tid = setTimeout(() => scan(jump), 30); };
export function initIndicator() {
  if (on) return; on = true; scan(true);
  mo = new MutationObserver(ms => { if (ms.some(m => m.target && m.target.classList && m.target.classList.contains("lq-ind"))) return; later(false); });
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "aria-checked", "aria-selected"] });
  addEventListener("resize", onResize); addEventListener("ssw:route", onRoute);
  document.fonts && document.fonts.ready && document.fonts.ready.then(() => scan(true));
}
const onResize = () => later(true), onRoute = () => setTimeout(() => scan(true), 120);
export function stopIndicator() {
  if (!on) return; on = false; mo && mo.disconnect(); removeEventListener("resize", onResize); removeEventListener("ssw:route", onRoute);
  items.forEach((rec, h) => { ["sx", "sw", "sy", "sh"].forEach(k => rec[k].stop()); rec.ind.remove(); h.classList.remove("lq-has-ind"); }); items.clear();
}
