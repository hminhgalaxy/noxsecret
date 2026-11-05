/* Đầu trang (đường dẫn + tiêu đề), cập nhật SEO theo trang, chân trang. */
import { $, esc } from "./util.js";
import { applySeo, NAME } from "./seo.js";

let pg = {};
export function setPage(p) {
  pg = p && p.reset ? {} : Object.assign({}, pg, p);
  const head = $("#pagehead"); if (!head) return;
  if (pg.hero || !pg.title) { head.hidden = true; head.innerHTML = ""; }
  else {
    head.hidden = false;
    const crumbs = [{ label: "Trang chủ", href: "/" }].concat(pg.crumbs || []);
    if (!pg.crumbs || !pg.crumbs.length || pg.crumbs[pg.crumbs.length - 1].label !== pg.title) crumbs.push({ label: pg.title });
    head.innerHTML = `<nav class="crumbs" aria-label="Đường dẫn"><ol>${crumbs.map((c, i) => i === crumbs.length - 1
      ? `<li aria-current="page"><span>${esc(c.label)}</span></li>` : `<li><a href="${esc(c.href || "#")}">${esc(c.label)}</a></li>`).join("")}</ol></nav>
      <div class="ph-row"><div><h1 class="ptitle">${esc(pg.title)}</h1>${pg.sub ? `<p class="psub">${esc(pg.sub)}</p>` : ""}</div>
      <div class="ph-tools">${pg.count != null ? `<span class="count">${esc(pg.count)}</span>` : ""}${pg.actions || ""}</div></div>`;
  }
  applySeo({ title: pg.title || null, desc: pg.desc, path: location.pathname, noindex: !!pg.noindex });
}
export function initLayout() { const y = $("#yr"); if (y) y.textContent = "© " + new Date().getFullYear() + " " + NAME + ". Bảo lưu mọi quyền."; }
