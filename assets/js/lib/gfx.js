/* Hiệu ứng nâng cao của mức đồ họa Cao: ánh sáng đi theo con trỏ trên thẻ/khung. Ở mức khác không làm gì (không tốn tài nguyên). */
import { getGfx } from "./prefs.js";

let raf = 0, last = null;
const SEL = ".card,.tile,.set-card,.panel,.upd,.row,.auth-card";
function move(e) {
  if (getGfx() !== "high" || e.pointerType === "touch") return;
  last = e; if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0; const t = last && last.target && last.target.closest ? last.target.closest(SEL) : null; if (!t) return;
    const r = t.getBoundingClientRect(); t.style.setProperty("--mx", (last.clientX - r.left) + "px"); t.style.setProperty("--my", (last.clientY - r.top) + "px");
  });
}
export function initGfx() { document.addEventListener("pointermove", move, { passive: true }); }
