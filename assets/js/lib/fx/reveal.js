/* Thẻ hiện dần khi cuộn tới (mức Trung bình và Cao). Ở mức Tối ưu hoặc Giảm chuyển động: hiện ngay, không theo dõi gì. */
import { getGfx } from "../prefs.js";
import { RM } from "../util.js";
const SEL = ".page .card,.page .tile,.page .upd,.page .set-card,.page .step,.page .feat";
let io = null, mo = null;
function observe(root) {
  if (RM() || getGfx() === "low" || typeof IntersectionObserver !== "function") return;
  if (!io) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("rv-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: .05 });
  (root.querySelectorAll ? root.querySelectorAll(SEL) : []).forEach(n => {
    if (n.classList.contains("rv-in") || n.dataset.rv) return; const r = n.getBoundingClientRect();
    if (r.top < innerHeight * .92) { n.classList.add("rv-in"); return; } /* đã nằm trong màn hình: không ẩn */
    n.dataset.rv = "1"; n.classList.add("rv"); io.observe(n);
  });
}
export function initReveal() {
  const v = document.getElementById("view") || document.body; observe(v);
  mo = new MutationObserver(() => requestAnimationFrame(() => observe(v))); mo.observe(v, { childList: true, subtree: true });
  document.addEventListener("prefs-change", () => { if (RM() || getGfx() === "low") document.querySelectorAll(".rv:not(.rv-in)").forEach(n => n.classList.add("rv-in")); });
}
