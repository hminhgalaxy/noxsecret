import { confirmDialog } from "./confirm.js";
/* Mảnh giao diện dùng chung giữa các trang: thẻ, ô danh mục, dòng, ảnh đại diện, trạng thái... */
import { ICO, SW } from "./icons.js";
import { esc, fmtTime, validUrl } from "./util.js";
import { catById, catHref, itemHref, store } from "./store.js";
import { session } from "./auth.js";

export const icoOf = c => ICO[c.icon] || ICO[c.id] || ICO.box;
export const skeletonHTML = (n = 3) => Array.from({ length: n }, () => `<div class="sk" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>`).join("");
export const emptyHTML = (msg, icon = "box") => `<div class="statebox">${ICO[icon] || ICO.box}<p>${esc(msg)}</p></div>`;
export const errorHTML = cat => `<div class="statebox err">${ICO.warn}<p>Không tải được dữ liệu. Vui lòng kiểm tra mạng và thử lại.</p><button class="btn ghost" data-act="retry" data-cat="${esc(cat)}"><svg viewBox="0 0 24 24" ${SW}><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/></svg>Thử lại</button></div>`;
export const lockedHTML = (msg, href = "/", label = "Về trang chủ") => `<div class="statebox">${ICO.shield}<p>${esc(msg)}</p><a class="btn ghost" href="${href}">${esc(label)}</a></div>`;

/* Ảnh đại diện: ảnh thật hoặc chữ cái đầu */
export function avatarHTML(u) {
  const mine = u && session.user && u.uid === session.user.uid && session.profile && session.profile.avatar;
  if (mine) return `<img src="${esc(session.profile.avatar)}" alt="" onerror="this.replaceWith(document.createTextNode(this.dataset.i||'?'))" data-i="${esc(initial(u))}">`;
  if (u && u.isAnonymous) return ICO.user;
  if (u && u.photoURL) return `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode(this.dataset.i||'?'))" data-i="${esc(initial(u))}">`;
  return esc(initial(u));
}
export const initial = u => String((u && (u.displayName || u.name || u.email)) || "?").trim().charAt(0).toUpperCase() || "?";

export function cardHTML(it, catId, i, showChip) {
  const c = catById(catId); if (!c) return "";
  const href = itemHref(catId, it.key), acts = [];
  if (it.code) acts.push(`<button class="btn primary sm" type="button" data-act="copycode" data-cat="${esc(catId)}" data-key="${esc(it.key)}" data-stop>${ICO.copy}Sao chép code</button>`);
  if (validUrl(it.url)) acts.push(`<a class="btn ghost sm" href="${esc(it.url.trim())}" target="_blank" rel="noopener noreferrer" data-stop>${ICO.ext}Mở link</a>`);
  acts.push(`<a class="btn soft sm" href="${href}" data-stop>Chi tiết</a>`);
  if (session.isDev || session.isEditor) acts.push(`<a class="btn soft sm icon" href="${href}/edit" data-stop aria-label="Sửa ${esc(it.name)}">${ICO.pencil}</a>`);
  return `<article class="card" style="--d:${Math.min(i, 10) * 45}ms" data-href="${href}" tabindex="0">
    <div class="card-top"><span class="ico">${icoOf(c)}</span>${showChip ? `<span class="badge">${esc(c.label)}</span>` : ""}${it.vault ? `<span class="badge strong">Vault</span>` : ""}<time>${it.ts ? esc(fmtTime(it.ts)) : ""}</time></div>
    ${it.img ? `<img class="card-thumb" src="${esc(it.img)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}
    <h3 class="card-title"><a href="${href}" data-stop>${esc(it.name)}</a></h3>
    ${it.desc ? `<p class="card-desc">${esc(it.desc)}</p>` : ""}
    ${it.code ? `<pre class="card-code">${esc(String(it.code).slice(0, 160))}</pre>` : ""}
    <div class="card-actions">${acts.join("")}</div></article>`;
}
export const tileHTML = (c, i = 0, href = catHref(c), n = countOf(c.id)) => `<a class="tile" href="${href}" style="--d:${i * 50}ms"><span class="tile-count" data-tilenum="${esc(c.id)}">${n}</span><span class="tile-ico">${icoOf(c)}</span><b>${esc(c.label)}</b><small>${esc(c.sub || "")}</small><span class="tile-go">${ICO.arrow}</span></a>`;
export const rowHTML = (it, i = 0) => { const c = catById(it.cat);
  return `<a class="row" href="${itemHref(it.cat, it.key)}" style="--d:${i * 55}ms"><span class="row-ico">${icoOf(c)}</span><span class="row-main"><b>${esc(it.name)}</b><small>${esc(fmtTime(it.ts))}</small></span><span class="badge">${esc(c.label)}</span></a>`; };

/* Hiệu ứng xuất hiện chỉ chạy một lần khi vừa dựng danh sách (không chớp khi dữ liệu cập nhật) */
export function fresh(el) { el.classList.add("fresh"); clearTimeout(el._fr); el._fr = setTimeout(() => el.classList.remove("fresh"), 1400); }
export function countUp(el, to) {
  const from = parseInt(el.dataset.v || "0", 10); el.dataset.v = to;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || from === to) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 600;
  (function step(t) { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); })(t0);
}
export const countOf = id => { const a = store.data[id]; return a ? a.length : 0; };
/* Xóa: hỏi bằng hộp thoại Có / Không của web rồi mới chạy */
export async function armDelete(btn, run, o = {}) {
  const ok = await confirmDialog({ title: o.title || "Xóa mục này?", message: o.message || "Hành động này không thể hoàn tác.", ok: o.ok || "Xóa", danger: true });
  if (ok) run(); return ok;
}
export function fieldErrors(form, errs) {
  form.querySelectorAll(".field-error").forEach(e => { e.textContent = ""; });
  form.querySelectorAll("[aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
  let first = null;
  Object.keys(errs).forEach(k => {
    const inp = form.querySelector(`[name="${k}"]`), er = form.querySelector(`[data-err="${k}"]`);
    if (er) er.textContent = errs[k]; if (inp) { inp.setAttribute("aria-invalid", "true"); first = first || inp; }
  });
  if (first) first.focus();
}
