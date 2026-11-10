/* Gợn sóng khi bấm nút (chỉ mức Cao). */
import { getGfx } from "../prefs.js";
import { RM } from "../util.js";
function down(e) {
  if (getGfx() !== "high" || RM() || e.button > 0) return; const b = e.target.closest && e.target.closest(".btn:not([disabled])"); if (!b) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, i = document.createElement("i"); i.className = "rip";
  i.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`; b.appendChild(i); i.addEventListener("animationend", () => i.remove(), { once: true }); setTimeout(() => i.remove(), 900);
}
export const initRipple = () => document.addEventListener("pointerdown", down, { passive: true });
