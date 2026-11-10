/* Hiệu ứng nâng cao theo mức đồ họa. Mỗi hiệu ứng nằm trong một file riêng ở ./fx/ và tự kiểm tra mức đồ họa (Tối ưu không tốn tài nguyên). */
import { initPointerLight } from "./fx/pointer-light.js";
import { initParallax } from "./fx/parallax.js";
import { initReveal } from "./fx/reveal.js";
import { initRipple } from "./fx/ripple.js";
export function initGfx() { initPointerLight(); initParallax(); initReveal(); initRipple(); }
