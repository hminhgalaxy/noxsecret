/* Ánh sáng đi theo con trỏ trên thẻ/khung (chỉ mức Cao, không dùng cho cảm ứng). */
import { getGfx } from "../prefs.js";
const SEL = ".card,.tile,.set-card,.panel,.upd,.row,.auth-card";
let raf = 0, last = null;
function move(e) {
  if (getGfx() !== "high" || e.pointerType === "touch") return;
  last = e; if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0; const t = last && last.target && last.target.closest ? last.target.closest(SEL) : null; if (!t) return;
    const r = t.getBoundingClientRect(); t.style.setProperty("--mx", (last.clientX - r.left) + "px"); t.style.setProperty("--my", (last.clientY - r.top) + "px");
  });
}
export const initPointerLight = () => document.addEventListener("pointermove", move, { passive: true });
