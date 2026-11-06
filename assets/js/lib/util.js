export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const RM = (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) || (() => { try { return localStorage.getItem("ssw_rm") === "1"; } catch (_) { return false; } })();
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const pick = (o, ks) => { for (const k of ks) if (o && o[k] != null && o[k] !== "") return o[k]; return ""; };
export const vi = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
export const validUrl = u => /^https?:\/\/[^\s]+$/i.test(String(u || "").trim());
export const pad = n => String(n).padStart(2, "0");
export function fmtTime(ts) {
  if (!ts) return ""; const d = new Date(Number(ts)); if (isNaN(d)) return "";
  return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
export function fmtDate(ts) {
  if (!ts) return ""; const d = new Date(Number(ts)); if (isNaN(d)) return "";
  return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
}
export function debounce(fn, ms) { let t; const w = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; w.cancel = () => clearTimeout(t); return w; }
export function toast(msg, kind) {
  const w = $("#toasts"); if (!w) return;
  const el = document.createElement("div"); el.className = "toast" + (kind === "err" ? " err" : ""); el.setAttribute("role", kind === "err" ? "alert" : "status");
  const ic = kind === "err"
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5 5L20 6.5"/></svg>';
  el.innerHTML = ic + "<span>" + esc(msg) + "</span>";
  w.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 380); }, kind === "err" ? 3600 : 2400);
}
export function copyText(v) {
  return (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject())
    .catch(() => new Promise((res, rej) => {
      const ta = document.createElement("textarea"); ta.value = v; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? res() : rej(new Error("copy")); } catch (e) { rej(e); }
      ta.remove();
    }));
}
export function copyFx(btn) {
  if (!btn || RM) return;
  btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop");
  const r = btn.getBoundingClientRect(), s = document.createElement("span");
  s.className = "flychk"; s.textContent = "✓"; s.style.left = (r.left + r.width / 2) + "px"; s.style.top = (r.top - 4) + "px";
  document.body.appendChild(s); setTimeout(() => s.remove(), 850);
}
export function readAsDataURL(file) {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(new Error("đọc tệp thất bại")); fr.readAsDataURL(file); });
}
export function compressImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1920; let w = img.width, h = img.height;
      if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      cv.getContext("2d").drawImage(img, 0, 0, w, h); res(cv.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("tệp ảnh không hợp lệ")); };
    img.src = url;
  });
}
/* Chỉ chấp nhận đường dẫn nội bộ, chống open-redirect (//evil.com, /\evil.com, http://…) */
export function safeNext(next, origin = location.origin) {
  if (!next || typeof next !== "string" || next[0] !== "/" || next[1] === "/" || next[1] === "\\" || /[\u0000-\u001f]/.test(next)) return null;
  try {
    const u = new URL(next, origin);
    if (u.origin !== origin) return null;
    if (/^\/(login|register|forgot-password)(\/|$)/.test(u.pathname)) return null;
    return u.pathname + u.search + u.hash;
  } catch (_) { return null; }
}
export function scoreMatch(name, q) { return vi(name).includes(q); }
