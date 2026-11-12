/* Bộ popup riêng của web — mỗi phần có kiểu riêng:
   • "panel": bảng thả xuống từ thanh trên (Thông báo) — trên điện thoại là tấm trượt từ đáy
   • "menu":  menu nhỏ gắn vào nút bấm (nút 3 chấm của bài viết)
   • "sheet": cửa sổ giữa màn hình / tấm trượt từ đáy (chọn loại tin nhắn, chia sẻ…)
   Tất cả đóng bằng Esc, bấm ra ngoài, hoặc nút ×; trả lại focus cho nút đã mở. */
import { esc } from "./util.js";
import { ICO } from "./icons.js";

const open = new Map();
const mobile = () => matchMedia("(max-width:640px)").matches;
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* o: { id, variant, anchor, title, icon, tone, html, wide, onMount(h), onClose() } → { el, body, close, setBody } */
export function openPopup(o) {
  const id = o.id || "p" + Math.random().toString(36).slice(2, 7);
  if (open.has(id)) { open.get(id).close(true); }
  const variant = o.variant || "sheet", last = document.activeElement, anchor = o.anchor || null;
  const root = document.createElement("div");
  root.className = "pop-root"; root.dataset.variant = variant; root.dataset.pop = id; if (o.tone) root.dataset.tone = o.tone;
  const head = variant === "menu" ? "" : `<header class="pop-head"><span class="pop-ico">${o.icon ? ICO[o.icon] || "" : ""}</span><h2 class="pop-title">${esc(o.title || "")}</h2><span class="pop-tools"></span><button class="pop-x" type="button" aria-label="Đóng">${ICO.x || "×"}</button></header>`;
  root.innerHTML = `<div class="pop-bg"></div><section class="pop pop-${variant}${o.wide ? " wide" : ""}" role="${variant === "menu" ? "menu" : "dialog"}"${variant === "menu" ? "" : ' aria-modal="true"'} aria-label="${esc(o.title || "")}" tabindex="-1">${head}<div class="pop-body">${o.html || ""}</div></section>`;
  document.body.appendChild(root);
  const box = root.querySelector(".pop"), body = root.querySelector(".pop-body");
  const lock = variant !== "menu" || mobile();
  if (lock) document.body.classList.add("pop-lock");
  const place = () => {
    if (variant === "sheet" || (variant !== "menu" && mobile())) { box.style.cssText = ""; return; }
    const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: innerWidth - 16, right: innerWidth - 16, top: 60, bottom: 60 };
    const w = box.offsetWidth, h = box.offsetHeight, pad = 10;
    let left = variant === "panel" ? r.right - w : r.right - w, top = r.bottom + 8;
    left = Math.max(pad, Math.min(left, innerWidth - w - pad));
    if (top + h > innerHeight - pad) top = Math.max(pad, r.top - h - 8);
    box.style.left = left + "px"; box.style.top = top + "px"; box.style.right = "auto";
  };
  let closed = false;
  const handle = {
    el: root, box, body,
    setBody: html => { body.innerHTML = html; if (variant === "menu") place(); },
    close: (silent) => {
      if (closed) return; closed = true; open.delete(id);
      document.removeEventListener("keydown", onKey, true); removeEventListener("resize", place); removeEventListener("scroll", onScroll, true);
      root.classList.remove("on"); const done = () => { root.remove(); if (!document.querySelector(".pop-root[data-variant]:not([data-variant=menu])") && !(matchMedia("(max-width:640px)").matches && document.querySelector(".pop-root"))) document.body.classList.remove("pop-lock"); };
      matchMedia("(prefers-reduced-motion: reduce)").matches ? done() : setTimeout(done, 200);
      if (o.onClose) try { o.onClose(); } catch (_) {}
      if (!silent && last && last.focus && document.contains(last)) try { last.focus({ preventScroll: true }); } catch (_) {}
    }
  };
  const onKey = e => {
    if (e.key === "Escape") { e.stopPropagation(); handle.close(); return; }
    if (e.key === "Tab" && variant !== "menu") {
      const f = [...box.querySelectorAll(FOCUSABLE)].filter(x => x.offsetParent !== null); if (!f.length) { e.preventDefault(); return; }
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === box)) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    if (variant === "menu" && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      const f = [...box.querySelectorAll("[role=menuitem]:not([disabled])")]; if (!f.length) return; e.preventDefault();
      const i = f.indexOf(document.activeElement); f[(i + (e.key === "ArrowDown" ? 1 : -1) + f.length) % f.length].focus();
    }
  };
  const onScroll = e => { if (variant === "menu" && !mobile() && !box.contains(e.target)) handle.close(true); };
  document.addEventListener("keydown", onKey, true); addEventListener("resize", place); addEventListener("scroll", onScroll, true);
  root.querySelector(".pop-bg").addEventListener("pointerdown", () => handle.close());
  const x = root.querySelector(".pop-x"); if (x) x.addEventListener("click", () => handle.close());
  if (variant === "menu") box.addEventListener("click", e => { if (e.target.closest("[data-keep]")) return; if (e.target.closest("[role=menuitem]")) setTimeout(() => handle.close(true), 0); });
  open.set(id, handle);
  place();
  requestAnimationFrame(() => { root.classList.add("on"); place(); });
  if (o.onMount) o.onMount(handle);
  setTimeout(() => { const f = box.querySelector("[autofocus],[role=menuitem],input,textarea,button:not(.pop-x)"); (f || box).focus && (f || box).focus({ preventScroll: true }); }, 30);
  return handle;
}
export const closePopup = id => { const h = open.get(id); if (h) h.close(); };
export const isPopupOpen = id => open.has(id);
export const closeAllPopups = () => [...open.values()].forEach(h => h.close(true));
