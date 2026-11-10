/* Hình nền website nghiêng nhẹ theo con trỏ, tạo chiều sâu (chỉ mức Cao khi có hình nền, tắt khi Giảm chuyển động). */
import { getGfx } from "../prefs.js";
import { RM } from "../util.js";
let raf = 0, px = 0, py = 0;
function move(e) {
  if (getGfx() !== "high" || e.pointerType === "touch" || !document.body.classList.contains("has-bg") || RM()) return;
  px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; const l = document.getElementById("themeLayer"); if (l) { l.style.setProperty("--px", (px * -14).toFixed(1) + "px"); l.style.setProperty("--py", (py * -10).toFixed(1) + "px"); } });
}
export const initParallax = () => document.addEventListener("pointermove", move, { passive: true });
