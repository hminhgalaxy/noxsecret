/* Skias — kéo thả, thu nhỏ thành chấm, nhớ vị trí. Dùng chung cho cả hai giao diện (thường và Skliquid Glass).
   • Kéo quả cầu bằng chuột/ngón tay (kéo quá 6px mới tính là kéo, nên bấm vẫn mở khung chat như cũ); phím mũi tên khi đang chọn quả cầu cũng di chuyển được.
   • Vị trí lưu theo TỶ LỆ màn hình (cookie ssw_sk_pos) nên đổi cỡ cửa sổ/xoay máy vẫn không bị lệch hay rơi ra ngoài.
   • Khung chat và bong bóng tự lật lên/xuống và trái/phải để không bao giờ bị cắt khỏi màn hình.
   • "Thu nhỏ" biến Skias thành chấm nhỏ (ssw_sk_mini); bấm vào chấm để phóng to lại. */
import { kvGet, kvSet } from "./cookie.js";

const K_POS = "ssw_sk_pos", K_MINI = "ssw_sk_mini", MARGIN = 6, DRAG_PX = 6;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const safeTop = () => { const h = document.getElementById("hdr"); return h ? Math.max(0, h.getBoundingClientRect().bottom) + MARGIN : 56; };
const safeBottom = () => { const t = document.getElementById("tabbar"); if (t && getComputedStyle(t).display !== "none") { const r = t.getBoundingClientRect(); return Math.max(0, innerHeight - r.top) + MARGIN; } return MARGIN; };

export function initSkiasMove(root, fig, hooks = {}) {
  let pos = null, drag = null, swallow = false;
  const read = () => { try { const v = JSON.parse(kvGet(K_POS)); if (v && isFinite(v.fx) && isFinite(v.fy)) return { fx: clamp(v.fx, 0, 1), fy: clamp(v.fy, 0, 1) }; } catch (_) {} return null; };
  const isMini = () => root.classList.contains("mini");
  const box = () => { const r = fig.getBoundingClientRect(); return { w: r.width || 86, h: r.height || 90 }; };
  const area = () => { const b = box(), x0 = MARGIN, x1 = Math.max(x0, innerWidth - b.w - MARGIN), y0 = safeTop(), y1 = Math.max(y0, innerHeight - b.h - safeBottom()); return { x0, x1, y0, y1, b }; };
  /* lật khung chat/bong bóng theo vị trí quả cầu */
  const orient = () => {
    const r = root.getBoundingClientRect(), below = r.top + r.height / 2 < innerHeight / 2, right = r.left + r.width / 2 > innerWidth / 2;
    root.classList.toggle("below", below); root.classList.toggle("right", right);
    const pw = Math.min(384, innerWidth - 16); root.style.setProperty("--sk-shift", (clamp(r.left, 8, Math.max(8, innerWidth - 8 - pw)) - r.left) + "px");
    const avail = below ? innerHeight - r.bottom - safeBottom() - 8 : r.top - safeTop() - 8; root.style.setProperty("--sk-ph", Math.round(clamp(avail, 260, 580)) + "px");
  };
  const apply = () => {
    if (!pos) { root.classList.remove("moved"); root.style.left = root.style.top = root.style.bottom = ""; orient(); return; }
    const a = area(); root.classList.add("moved");
    root.style.left = Math.round(a.x0 + pos.fx * (a.x1 - a.x0)) + "px"; root.style.top = Math.round(a.y0 + pos.fy * (a.y1 - a.y0)) + "px"; root.style.bottom = "auto";
    orient(); hooks.onMove && hooks.onMove(pos);
  };
  const place = (left, top, save) => {
    const a = area(); left = clamp(left, a.x0, a.x1); top = clamp(top, a.y0, a.y1);
    pos = { fx: a.x1 > a.x0 ? (left - a.x0) / (a.x1 - a.x0) : 0, fy: a.y1 > a.y0 ? (top - a.y0) / (a.y1 - a.y0) : 1 };
    apply(); if (save) kvSet(K_POS, JSON.stringify({ fx: +pos.fx.toFixed(4), fy: +pos.fy.toFixed(4) }));
  };
  const setMini = (on, save = true) => { root.classList.toggle("mini", !!on); fig.setAttribute("aria-label", on ? "Skias (thu nhỏ — bấm để phóng to)" : (fig.dataset.label || "Skias")); if (save) kvSet(K_MINI, on ? "1" : null); requestAnimationFrame(apply); hooks.onMini && hooks.onMini(!!on); };

  fig.addEventListener("pointerdown", e => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const r = root.getBoundingClientRect(); drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, on: false };
  });
  fig.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.on) { if (Math.hypot(dx, dy) < DRAG_PX) return; drag.on = true; root.classList.add("drag"); try { fig.setPointerCapture(e.pointerId); } catch (_) {} hooks.onDragStart && hooks.onDragStart(); }
    e.preventDefault(); place(drag.ox + dx, drag.oy + dy, false);
  });
  const end = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const was = drag.on; drag = null; root.classList.remove("drag");
    if (was) { swallow = true; setTimeout(() => { swallow = false; }, 60); if (pos) kvSet(K_POS, JSON.stringify({ fx: +pos.fx.toFixed(4), fy: +pos.fy.toFixed(4) })); }
  };
  fig.addEventListener("pointerup", end); fig.addEventListener("pointercancel", end);
  fig.addEventListener("click", e => {
    if (swallow) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    if (isMini()) { e.stopImmediatePropagation(); e.preventDefault(); setMini(false); }
  }, true);
  fig.addEventListener("dblclick", e => { e.preventDefault(); setMini(!isMini()); });
  fig.addEventListener("keydown", e => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!k || !e.shiftKey) return;
    e.preventDefault(); const r = root.getBoundingClientRect(); place(r.left + k[0] * 24, r.top + k[1] * 24, true);
  });
  fig.style.touchAction = "none";
  addEventListener("resize", () => requestAnimationFrame(apply), { passive: true });
  addEventListener("orientationchange", () => setTimeout(apply, 250));
  /* thanh dưới/đầu trang đổi chiều cao (vào/ra trang) → tính lại */
  document.addEventListener("view-change", () => requestAnimationFrame(apply));

  pos = read(); if (kvGet(K_MINI) === "1") root.classList.add("mini");
  requestAnimationFrame(apply); setTimeout(apply, 900);
  return { sync() { pos = read(); root.classList.toggle("mini", kvGet(K_MINI) === "1"); apply(); }, setMini, isMini, reset() { pos = null; kvSet(K_POS, null); apply(); }, refresh: apply };
}
