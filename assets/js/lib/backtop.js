/* Nút "Lên đầu trang": hiện sau khi cuộn xuống. */
import { RM } from "./util.js";
export function initBackTop() {
  const b = document.createElement("button"); b.id = "backTop"; b.type = "button"; b.hidden = true; b.setAttribute("aria-label", "Lên đầu trang");
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>'; document.body.appendChild(b);
  let tick = false; const upd = () => { tick = false; const on = scrollY > 700; if (on === !b.hidden) return; b.hidden = !on; };
  addEventListener("scroll", () => { if (tick) return; tick = true; requestAnimationFrame(upd); }, { passive: true });
  b.addEventListener("click", () => scrollTo({ top: 0, behavior: RM() ? "auto" : "smooth" }));
}
