/* Mảnh giao diện dùng chung giữa các trang */
import { ICO, SW } from "./icons.js";
import { esc, fmtTime, validUrl } from "./util.js";
import { catById, itemHref, store } from "./store.js";
import { session } from "./auth.js";

export const icoOf = c => ICO[c.icon] || ICO[c.id] || ICO.box;
export const skeletonHTML = (n = 3) => Array.from({ length: n }, () => `<div class="sk" aria-hidden="true"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><i class="e"></i></div>`).join("");
export const emptyHTML = msg => `<div class="statebox">${ICO.box}<p>${esc(msg)}</p></div>`;
export const errorHTML = cat => `<div class="statebox err">${ICO.warn}<p>Không tải được dữ liệu.</p><button class="btn btn-g" data-act="retry" data-cat="${esc(cat)}"><svg viewBox="0 0 24 24" ${SW}><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></svg>Thử lại</button></div>`;
export const lockedHTML = (msg, href = "/", label = "Về trang chủ") => `<div class="statebox">${ICO.shield}<p>${esc(msg)}</p><a class="btn btn-g" href="${href}">${esc(label)}</a></div>`;

export function cardHTML(it, catId, i, showChip) {
  const c = catById(catId); if (!c) return "";
  const href = itemHref(catId, it.key), acts = [];
  if (it.code) acts.push(`<button class="btn btn-p" data-act="copycode" data-cat="${esc(catId)}" data-key="${esc(it.key)}" data-stop>${ICO.copy}<span>Sao chép code</span></button>`);
  if (validUrl(it.url)) acts.push(`<a class="btn btn-p" href="${esc(it.url.trim())}" target="_blank" rel="noopener noreferrer" data-stop>${ICO.ext}<span>Mở link</span></a>`);
  acts.push(`<a class="btn btn-g" href="${href}" data-stop>${ICO.eye}<span>Chi tiết</span></a>`);
  if (session.isDev) acts.push(`<a class="btn btn-g" href="${href}/edit" data-stop>${ICO.pencil}<span>Sửa</span></a>`);
  return `<article class="card" style="--cat:${c.color};--d:${Math.min(i, 10) * 45}ms" data-href="${href}">
    <span class="sh" aria-hidden="true"></span>
    <div class="ctop"><span class="ico-tile">${icoOf(c)}</span>${showChip ? `<span class="chip">${esc(c.label)}</span>` : ""}${it.vault ? `<span class="chip" style="--cat:var(--warning)">VAULT</span>` : ""}<span class="ctime">${it.ts ? esc(fmtTime(it.ts)) : ""}</span></div>
    ${it.img ? `<img class="thumb" src="${esc(it.img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
    <h3><a class="card-link" href="${href}" data-stop>${esc(it.name)}</a></h3>
    ${it.desc ? `<p class="desc">${esc(it.desc)}</p>` : ""}
    ${it.code ? `<pre class="codeprev">${esc(String(it.code).slice(0, 160))}</pre>` : ""}
    <div class="cfoot">${acts.join("")}</div></article>`;
}
const io = ("IntersectionObserver" in window) ? new IntersectionObserver(es => es.forEach(en => {
  if (!en.isIntersecting) return; const el = en.target; el.classList.add("in", "rvin"); io.unobserve(el);
}), { threshold: .06, rootMargin: "40px" }) : null;
export function observeAnim(scope) {
  const els = scope.querySelectorAll(".card,[data-reveal]");
  if (io && !matchMedia("(prefers-reduced-motion: reduce)").matches) els.forEach(c => io.observe(c)); else els.forEach(c => c.classList.add("in", "rvin"));
}
export function countUp(el, to) {
  const from = parseInt(el.dataset.v || "0", 10); el.dataset.v = to;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || from === to) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 550;
  (function step(t) { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); })(t0);
}
export const countOf = id => { const a = store.data[id]; return a ? a.length : 0; };
/* Nút xóa 2 bước (không dùng popup) */
export function armDelete(btn, run) {
  if (!btn.classList.contains("arm")) { const old = btn.innerHTML; btn.classList.add("arm"); btn.textContent = "Chắc?"; setTimeout(() => { btn.classList.remove("arm"); btn.innerHTML = old; }, 2400); return false; }
  run(); return true;
}
export function fieldErrors(form, errs) {
  form.querySelectorAll(".ferr").forEach(e => { e.textContent = ""; });
  form.querySelectorAll("[aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
  let first = null;
  Object.keys(errs).forEach(k => {
    const inp = form.querySelector(`[name="${k}"]`), er = form.querySelector(`[data-err="${k}"]`);
    if (er) er.textContent = errs[k]; if (inp) { inp.setAttribute("aria-invalid", "true"); first = first || inp; }
  });
  if (first) first.focus();
}
