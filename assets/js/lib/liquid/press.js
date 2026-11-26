/* Chạm kính lỏng: vệt sáng đi theo con trỏ trên nút/khung; bấm thì nhún dẻo (co lại rồi bật về như thạch). */
const SEL = ".btn,#btnMenu,.bell,.hdr-btn,.walletbtn,.tab,.chip,.nav-link,.nav-btn,.lq-card,.set-card,.tile,.pcard,.lp-tile,.cw-fab,.cartbtn,.sk-chip,.sk-ic,.lqc-it,.lqc-b";
let on = false, raf = 0, ev = null;
const move = e => { ev = e; if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const t = ev && ev.target && ev.target.closest && ev.target.closest(SEL); if (!t) return;
  const r = t.getBoundingClientRect(); t.style.setProperty("--px", Math.round((ev.clientX - r.left) / Math.max(1, r.width) * 100) + "%"); t.style.setProperty("--py", Math.round((ev.clientY - r.top) / Math.max(1, r.height) * 100) + "%"); }); };
const down = e => { const t = e.target.closest && e.target.closest(SEL); if (t) t.classList.add("lq-down"); };
const up = e => {
  document.querySelectorAll(".lq-down").forEach(t => { t.classList.remove("lq-down"); if (t.classList.contains("btn")) { t.classList.remove("lq-jelly"); void t.offsetWidth; t.classList.add("lq-jelly"); t.addEventListener("animationend", () => t.classList.remove("lq-jelly"), { once: true }); } });
};
export function initPress() { if (on) return; on = true; document.addEventListener("pointermove", move, { passive: true }); document.addEventListener("pointerdown", down, { passive: true }); ["pointerup", "pointercancel", "dragend"].forEach(n => document.addEventListener(n, up, { passive: true })); }
export function stopPress() { if (!on) return; on = false; document.removeEventListener("pointermove", move); document.removeEventListener("pointerdown", down); ["pointerup", "pointercancel", "dragend"].forEach(n => document.removeEventListener(n, up)); }
