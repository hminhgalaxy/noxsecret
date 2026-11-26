/* Nền Skliquid: các vệt màu mềm (aurora) trôi chậm phía sau để kính có thứ mà khúc xạ; dev có thể đặt ảnh/video riêng cho Skliquid. */
import { store, subscribe } from "../store.js";
import { esc } from "../util.js";
import { makeSpring } from "./spring.js";
let el = null, un = null, sig = "", ptr = null, sx = null, sy = null, onMove = null, onLeave = null;
function paint() {
  if (!el) return; const t = store.theme || {}, has = !!(t.lqBgData && t.lqBgType && t.lqBgType !== "none"), s = has ? t.lqBgType + "|" + String(t.lqBgData).length + "|" + String(t.lqBgData).slice(-40) : "";
  if (s === sig) return; sig = s; const med = el.querySelector(".lqmedia-w"); if (!med) return;
  med.innerHTML = has ? (t.lqBgType === "video" ? `<video class="lqmedia" src="${esc(t.lqBgData)}" autoplay muted loop playsinline></video><i class="lqshade"></i>` : `<img class="lqmedia" src="${esc(t.lqBgData)}" alt=""><i class="lqshade"></i>`) : "";
  document.body.classList.toggle("lq-has-bg", has);
}
export function initBg() {
  if (el) return; el = document.createElement("div"); el.id = "lqBg"; el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<i class="lqb b1"></i><i class="lqb b2"></i><i class="lqb b3"></i><i class="lqb b4"></i><div class="lqmedia-w"></div><div class="lqdrops"><i class="lqd d1"></i><i class="lqd d2"></i><i class="lqd d3"></i><i class="lqd d4"></i><i class="lqd d5"></i><i class="lqd d6"></i><i class="lqd ptr"></i></div>`;
  document.body.insertBefore(el, document.body.firstChild); sig = "\0"; paint(); dropsInit(); un = subscribe(t => { if (t === "theme") paint(); });
}
/* Giọt chất lỏng đi theo con trỏ (trễ như có quán tính, bị kéo dài theo hướng chạy) và hòa vào các giọt nền khi lại gần */
function dropsInit() {
  ptr = el.querySelector(".ptr"); if (!ptr || !matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  let vx = 0, vy = 0, px = innerWidth / 2, py = innerHeight / 2;
  const paintP = () => { const sp = Math.min(.5, Math.hypot(vx, vy) / 2600), ang = Math.atan2(vy, vx) * 180 / Math.PI;
    ptr.style.transform = `translate(${(sx.value - 42).toFixed(1)}px,${(sy.value - 42).toFixed(1)}px) rotate(${ang.toFixed(0)}deg) scale(${(1 + sp).toFixed(3)},${(1 - sp * .55).toFixed(3)})`; };
  sx = makeSpring(px, { k: 70, c: 12, eps: .2, onUpdate: (x, v) => { vx = v; paintP(); } }); sy = makeSpring(py, { k: 70, c: 12, eps: .2, onUpdate: (y, v) => { vy = v; paintP(); } });
  onMove = e => { if (e.pointerType === "touch") return; ptr.classList.add("on"); sx.to(e.clientX); sy.to(e.clientY); };
  onLeave = e => { if (!e.relatedTarget) ptr.classList.remove("on"); };
  document.addEventListener("pointermove", onMove, { passive: true }); document.addEventListener("pointerout", onLeave, { passive: true });
}
export function stopBg() {
  if (onMove) document.removeEventListener("pointermove", onMove); if (onLeave) document.removeEventListener("pointerout", onLeave); onMove = onLeave = null; if (sx) sx.stop(); if (sy) sy.stop(); sx = sy = ptr = null; if (un) un(); un = null; if (el) el.remove(); el = null; sig = ""; document.body.classList.remove("lq-has-bg"); }
