/* Khung giao diện dùng chung: navbar, sidebar, breadcrumb, tiêu đề trang, footer */
import { $, $$, esc, debounce } from "./util.js";
import { ICO, SW } from "./icons.js";
import { store } from "./store.js";
import { session } from "./auth.js";
import { icoOf } from "./ui.js";
import { current } from "./router.js";

const SITE = "SKIBIDI SCRIPT WEB";
let pg = {};
export function setPage(p) {
  pg = p && p.reset ? {} : Object.assign({}, pg, p);
  const head = $("#pagehead"); if (!head) return;
  if (pg.hero || !pg.title) { head.hidden = true; head.innerHTML = ""; if (pg.title) document.title = pg.title + " · " + SITE; else if (pg.hero) document.title = SITE; }
  else {
    head.hidden = false;
    const crumbs = [{ label: "Trang chủ", href: "/" }].concat(pg.crumbs || []);
    if (!pg.crumbs || !pg.crumbs.length || pg.crumbs[pg.crumbs.length - 1].label !== pg.title) crumbs.push({ label: pg.title });
    head.innerHTML = `<nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map((c, i) => i === crumbs.length - 1
      ? `<li aria-current="page"><span>${esc(c.label)}</span></li>` : `<li><a href="${esc(c.href || "#")}">${esc(c.label)}</a></li>`).join("")}</ol></nav>
      <div class="vhead"><div><h1 class="ptitle">${esc(pg.title)}</h1>${pg.sub ? `<p class="vsub">${esc(pg.sub)}</p>` : ""}</div>
      <div class="vtools">${pg.count != null ? `<span class="vcount">${esc(pg.count)}</span>` : ""}${pg.actions || ""}</div></div>`;
    document.title = pg.title + " · " + SITE;
  }
  document.documentElement.style.setProperty("--cat", pg.color || "var(--accent-primary)");
}

const LINKS = {
  top: [{ href: "/", label: "Trang chủ", icon: "home", nc: "var(--accent-secondary)", exact: true },
        { href: "/categories", label: "Danh mục", icon: "grid", nc: "var(--accent-primary)" },
        { href: "/notifications", label: "Thông báo", icon: "bell", nc: "var(--warning)", dot: "notice" }],
  dev: [{ href: "/dev", label: "Dev Panel", icon: "shield", exact: true }, { href: "/dev/data", label: "Quản lý dữ liệu", icon: "box" },
        { href: "/dev/categories", label: "Danh mục DEV", icon: "grid" }, { href: "/dev/users", label: "Người dùng", icon: "users" },
        { href: "/dev/theme", label: "Giao diện", icon: "paint" }, { href: "/dev/system", label: "Hệ thống", icon: "terminal" },
        { href: "/bypass", label: "Bypass", icon: "bolt" }]
};
const item = l => `<a class="navitem" href="${l.href}" data-exact="${l.exact ? 1 : 0}" style="--nc:${l.nc || "var(--accent-primary)"}">${ICO[l.icon] || ICO.box}<span class="nl">${esc(l.label)}</span>${l.dot ? `<span class="cnt" data-dot="${l.dot}" hidden>•</span>` : ""}${l.cnt != null ? `<span class="cnt" data-cnt="${esc(l.cid)}">${l.cnt || ""}</span>` : ""}</a>`;
export function renderNav() {
  const side = $("#sideNav"); if (!side) return;
  const cats = store.cats.map(c => ({ href: "/" + c.path, label: c.label, icon: c.icon || c.id, nc: c.color, cnt: (store.data[c.id] || []).length, cid: c.id }));
  side.innerHTML = `<span class="navsec">Menu</span>${LINKS.top.map(item).join("")}
    <span class="navsec">Danh mục</span><div class="navcats">${cats.map(item).join("")}</div>
    ${session.isDev ? `<span class="navsec">DEV</span>${LINKS.dev.map(l => item({ ...l, nc: "var(--accent-primary)" })).join("")}` : ""}
    <span class="navsec">Hệ thống</span>
    <button id="btnSound" class="navitem" type="button" aria-label="Bật tắt nhạc nền"><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="nl" style="text-align:left">Nhạc nền</span><span class="cnt" id="sndState">—</span></button>
    <a class="navitem" href="/settings" data-exact="0" style="--nc:var(--text-secondary)">${ICO.gear}<span class="nl">Cài đặt</span></a>`;
  $$(".cnt[data-cnt]", side).forEach(el => { el.hidden = !el.textContent; });
  renderNotifDot(); markActive(); renderAccount();
}
export function renderCounts() {
  store.cats.forEach(c => $$(`[data-cnt="${c.id}"]`).forEach(el => { const n = (store.data[c.id] || []).length; el.hidden = !n; el.textContent = n || ""; }));
}
export function renderNotifDot() {
  const n = store.notice, on = !!(n && n.enabled !== false && ((n.body || "").trim() || (n.title || "").trim()));
  $$("[data-dot='notice']").forEach(el => { el.hidden = !on; });
}
export function markActive() {
  const path = (current() && current().path) || location.pathname;
  const side = $("#side"); if (!side) return;
  const links = $$("a.navitem[href]", side);
  let best = null, bestLen = -1;
  links.forEach(a => {
    const h = a.getAttribute("href"), ex = a.dataset.exact === "1";
    const hit = h === "/" ? path === "/" : ex ? path === h : (path === h || path.startsWith(h + "/"));
    if (hit && h.length > bestLen) { best = a; bestLen = h.length; }
  });
  links.forEach(a => { const on = a === best; a.classList.toggle("on", on); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
  requestAnimationFrame(movePill);
}
export function movePill() {
  const pill = $("#navpill"), side = $("#side"); if (!pill || !side) return;
  const active = side.querySelector(".navitem.on"); if (!active) { pill.style.opacity = "0"; return; }
  const sr = side.getBoundingClientRect(), ar = active.getBoundingClientRect();
  pill.style.height = Math.round(ar.height) + "px";
  pill.style.transform = "translateY(" + Math.round(ar.top - sr.top + side.scrollTop) + "px)";
  const nc = active.style.getPropertyValue("--nc"); if (nc) pill.style.setProperty("--nc", nc.trim());
  pill.style.opacity = "1";
}
export function renderAccount() {
  const u = session.user;
  const btn = $("#btnAcc");
  if (btn) {
    btn.setAttribute("href", u ? "/settings" : "/login"); btn.setAttribute("aria-label", u ? "Tài khoản" : "Đăng nhập");
    btn.classList.toggle("dev", session.isDev);
    let img = btn.querySelector("img");
    if (u && u.photoURL) { if (!img) { img = document.createElement("img"); img.alt = ""; img.referrerPolicy = "no-referrer"; btn.appendChild(img); } img.src = u.photoURL; } else if (img) img.remove();
  }
  const z = $("#authZone"); if (!z) return;
  z.innerHTML = u
    ? `<div class="acc-card"><span class="mail">${esc(u.displayName ? u.displayName + " · " : "")}${esc(u.email || "")}</span>${session.isDev ? '<span class="devtag">DEV</span>' : ""}</div>
       ${session.isDev ? '<a class="btn btn-p btn-wide" href="/dev" style="--cat:var(--accent-primary)">Dev Panel</a>' : ""}
       <button class="btn btn-g btn-wide" data-act="signout" type="button">${ICO.out}Đăng xuất</button>`
    : `<a class="btn btn-p btn-wide" href="/login" style="--cat:var(--accent-primary)">${ICO.key}Đăng nhập</a><a class="btn btn-g btn-wide" href="/register">Đăng ký</a>`;
}
export function openDrawer() { $("#side").classList.add("open"); $("#sideOv").classList.add("on"); document.body.classList.add("locked"); requestAnimationFrame(movePill); }
export function closeDrawer() { $("#side").classList.remove("open"); $("#sideOv").classList.remove("on"); if (!$("#maint").classList.contains("on") && !$("#mdNotice").classList.contains("on")) document.body.classList.remove("locked"); }
export function initLayout() {
  $("#btnMenu").addEventListener("click", () => $("#side").classList.contains("open") ? closeDrawer() : openDrawer());
  $("#sideOv").addEventListener("click", closeDrawer);
  addEventListener("resize", debounce(movePill, 150));
  addEventListener("load", () => setTimeout(movePill, 300));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(movePill, 60));
  $("#yr").textContent = "© " + new Date().getFullYear() + " " + SITE;
}
