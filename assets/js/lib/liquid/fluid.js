/* Chuyển động chất lỏng 3D: các ô nghiêng theo con trỏ như giọt nước đặt trên mặt kính (kèm vệt sáng chạy theo),
   và hàm bóp/giãn theo vận tốc dùng cho cửa sổ kéo được. */
import { makeSpring } from "./spring.js";
const TILT = ".lp-tile,.tile,.pcard,.cat-card,.prod,.skin,.os-hero";
let on = false, cur = null, raf = 0, lastEv = null;
const reduced = () => document.documentElement.dataset.motion === "reduced";
function reset(el) { if (!el) return; el.classList.remove("lq-tilting"); el.style.removeProperty("--rx"); el.style.removeProperty("--ry"); }
function frame() {
  raf = 0; const e = lastEv; if (!e) return; const t = e.target.closest && e.target.closest(TILT);
  if (t !== cur) { reset(cur); cur = t; } if (!t || reduced() || document.body.classList.contains("lq-editing")) return;
  const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, k = Math.min(1, 360 / Math.max(r.width, r.height)) * 9;
  t.classList.add("lq-tilting"); t.style.setProperty("--rx", ((.5 - y) * k).toFixed(2) + "deg"); t.style.setProperty("--ry", ((x - .5) * k).toFixed(2) + "deg");
}
const move = e => { if (e.pointerType === "touch") return; lastEv = e; if (!raf) raf = requestAnimationFrame(frame); };
const leave = e => { if (!e.relatedTarget) { reset(cur); cur = null; } };
export function initFluid() { if (on) return; on = true; document.addEventListener("pointermove", move, { passive: true }); document.addEventListener("pointerout", leave, { passive: true }); }
export function stopFluid() { if (!on) return; on = false; document.removeEventListener("pointermove", move); document.removeEventListener("pointerout", leave); reset(cur); cur = null; document.querySelectorAll(".lq-tilting").forEach(reset); }

/* Bóp/giãn như thạch: đưa vận tốc kéo vào, trả về cleanup. el nhận biến --sqx --sqy --sqr. */
export function jelly(el) {
  const sx = makeSpring(0, { k: 260, c: 11, eps: .002, onUpdate: v => { const a = Math.max(-.22, Math.min(.22, v)); el.style.setProperty("--sqx", (1 + Math.abs(a)).toFixed(3)); el.style.setProperty("--sqy", (1 - Math.abs(a) * .7).toFixed(3)); el.style.setProperty("--sqr", (a * 14).toFixed(2) + "deg"); } });
  return { push(vx) { sx.to(Math.max(-.22, Math.min(.22, vx / 3200)), true); sx.to(0); }, release() { sx.to(0); }, stop() { sx.stop(); el.style.removeProperty("--sqx"); el.style.removeProperty("--sqy"); el.style.removeProperty("--sqr"); } };
}
