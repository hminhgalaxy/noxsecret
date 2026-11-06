/* Thanh trên: đổ viền mỏng khi cuộn trang. */
import { $ } from "./util.js";

export function initHeader() {
  let tick = false;
  const upd = () => { tick = false; const h = $("#hdr"); if (h) h.classList.toggle("scrolled", scrollY > 6); };
  addEventListener("scroll", () => { if (tick) return; tick = true; requestAnimationFrame(upd); }, { passive: true });
  upd();
}
