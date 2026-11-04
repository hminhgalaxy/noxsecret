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
  document.documentElement.style.setProperty("--cat", "var(--accent-primary)");
}

const LINKS = {
  top: [{ href: "/", label: "Trang chủ", icon: "home", nc: "var(--accent-secondary)", exact: true },
        { href: "/notifications", label: "Thông báo", icon: "bell", nc: "var(--warning)", dot: "notice" }],
  cats: { href: "/categories", label: "Tất cả danh mục", icon: "grid", nc: "var(--accent-primary)", exact: true },
  dev: [{ href: "/dev", label: "Bảng quản trị", icon: "shield", exact: true }, { href: "/dev/data", label: "Quản lý dữ liệu", icon: "box" },
        { href: "/dev/categories", label: "Danh mục DEV", icon: "grid" }, { href: "/dev/users", label: "Người dùng", icon: "users" },
        { href: "/dev/theme", label: "Giao diện", icon: "paint" }, { href: "/dev/system", label: "Hệ thống", icon: "terminal" }]
};
const item = l => `<a class="navitem" href="${l.href}" data-exact="${l.exact ? 1 : 0}" style="--nc:${l.nc || "var(--accent-primary)"}">${ICO[l.icon] || ICO.box}<span class="nl">${esc(l.label)}</span>${l.dot ? `<span class="cnt" data-dot="${l.dot}" hidden>•</span>` : ""}${l.cnt != null ? `<span class="cnt" data-cnt="${esc(l.cid)}">${l.cnt || ""}</span>` : ""}</a>`;
/* Nhóm menu thu/gọn (accordion): trạng thái nhớ trong localStorage, nhóm chứa trang đang xem tự mở */
const GKEY = "ssw_navgroups";
const readG = () => { try { const v = JSON.parse(localStorage.getItem(GKEY)); if (v && typeof v === "object") return v; } catch (_) {} return {}; };
const gState = readG(); // { cats: bool, dev: bool }
const saveG = () => { try { localStorage.setItem(GKEY, JSON.stringify(gState)); } catch (_) {} };
const gOpen = (id, dflt) => (id in gState ? !!gState[id] : dflt);
const CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const group = (id, title, icon, color, body, count, dflt) => {
  const open = gOpen(id, dflt);
  return `<section class="ngroup${open ? " open" : ""}" data-g="${id}" style="--gc:${color}">
    <button class="ng-h" type="button" aria-expanded="${open}" aria-controls="ng-${id}">${ICO[icon] || ICO.box}<span class="nl">${esc(title)}</span>${count != null ? `<span class="gcnt" data-gcount="${id}">${count}</span>` : ""}${CHEV}</button>
    <div class="ng-b" id="ng-${id}"${open ? "" : " inert"}><div class="ng-in">${body}</div></div></section>`;
};
export function setGroup(id, open, persist = true) {
  const g = $(`.ngroup[data-g="${id}"]`); if (!g) return;
  if (persist) { gState[id] = open; saveG(); }
  g.classList.toggle("open", open);
  g.querySelector(".ng-h").setAttribute("aria-expanded", String(open));
  const b = g.querySelector(".ng-b"); open ? b.removeAttribute("inert") : b.setAttribute("inert", "");
  trackPill();
}
let trackRaf = 0;
function trackPill() { // pill bám theo mục đang chọn suốt lúc nhóm đang trượt
  cancelAnimationFrame(trackRaf); const t0 = performance.now();
  const step = () => { movePill(); if (performance.now() - t0 < 480) trackRaf = requestAnimationFrame(step); };
  trackRaf = requestAnimationFrame(step);
}
export function renderNav() {
  const side = $("#sideNav"); if (!side) return;
  const cats = store.cats.map(c => ({ href: "/" + c.path, label: c.label, icon: c.icon || c.id, nc: c.color, cnt: (store.data[c.id] || []).length, cid: c.id }));
  side.innerHTML = `<span class="navsec">Menu</span>${LINKS.top.map(item).join("")}
    ${session.user ? item({ href:"/profile", label:"Hồ sơ", icon:"user", nc:"var(--accent-secondary)" }) : ""}
    ${group("cats", "Danh mục", "grid", "var(--accent-primary)", `<div class="navcats">${item(LINKS.cats)}${cats.map(item).join("")}</div>`, cats.length, false)}
    ${session.isDev ? item({ ...LINKS.dev[0], nc:"var(--accent-primary)" }) : ""}
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
  $$(".ngroup", side).forEach(g => g.classList.toggle("has-on", !!(best && g.contains(best))));
  const bg = best && best.closest(".ngroup"); if (bg && !bg.classList.contains("open")) setGroup(bg.dataset.g, true, false);
  requestAnimationFrame(movePill);
}
export function movePill() {
  const pill = $("#navpill"), side = $("#side"); if (!pill || !side) return;
  const active = side.querySelector(".navitem.on"); if (!active || active.closest(".ngroup:not(.open)")) { pill.style.opacity = "0"; return; }
  const sr = side.getBoundingClientRect(), ar = active.getBoundingClientRect();
  pill.style.left = Math.round(ar.left - sr.left) + "px"; pill.style.right = "auto"; pill.style.width = Math.round(ar.width) + "px";
  pill.style.height = Math.round(ar.height) + "px";
  pill.style.transform = "translateY(" + Math.round(ar.top - sr.top + side.scrollTop) + "px)";
  const nc = active.style.getPropertyValue("--nc"); if (nc) pill.style.setProperty("--nc", nc.trim());
  pill.style.opacity = "1";
}
export function renderAccount() {
  const u = session.user;
  const btn = $("#btnAcc");
  if (btn) {
    btn.setAttribute("href", u ? "/profile" : "/login"); btn.setAttribute("aria-label", u ? "Tài khoản" : "Đăng nhập");
    btn.classList.toggle("dev", session.isDev);
    let img = btn.querySelector("img");
    if (u && u.photoURL) { if (!img) { img = document.createElement("img"); img.alt = ""; img.referrerPolicy = "no-referrer"; btn.appendChild(img); } img.src = u.photoURL; } else if (img) img.remove();
  }
  const z = $("#authZone"); if (!z) return;
  z.innerHTML = u
    ? `<div class="acc-card"><span class="mail">${esc(u.displayName ? u.displayName + " · " : "")}${esc(u.email || "")}</span>${session.isDev ? '<span class="devtag">QUẢN TRỊ</span>' : ""}</div>
       ${session.isDev ? '<a class="btn btn-p btn-wide" href="/dev" style="--cat:var(--accent-primary)">Bảng quản trị</a>' : ""}
       <button class="btn btn-g btn-wide" data-act="signout" type="button">${ICO.out}Đăng xuất</button>`
    : `<a class="btn btn-p btn-wide" href="/login" style="--cat:var(--accent-primary)">${ICO.key}Đăng nhập</a><a class="btn btn-g btn-wide" href="/register">Đăng ký</a>`;
}
const menuBtn = open => { const b = $("#btnMenu"); if (!b) return; b.setAttribute("aria-expanded", String(open)); b.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu"); };
export function openDrawer() { $("#side").classList.add("open"); $("#sideOv").classList.add("on"); menuBtn(true); document.body.classList.add("locked"); requestAnimationFrame(movePill); }
export function closeDrawer() { $("#side").classList.remove("open"); $("#sideOv").classList.remove("on"); menuBtn(false); if (!$("#maint").classList.contains("on") && !$("#mdNotice").classList.contains("on")) document.body.classList.remove("locked"); }
export function initLayout() {
  $("#btnMenu").addEventListener("click", () => $("#side").classList.contains("open") ? closeDrawer() : openDrawer());
  $("#sideOv").addEventListener("click", closeDrawer);
  $("#sideNav").addEventListener("click", e => {
    const h = e.target.closest(".ng-h"); if (!h) return;
    const g = h.closest(".ngroup"); setGroup(g.dataset.g, !g.classList.contains("open"));
  });
  addEventListener("resize", debounce(movePill, 150));
  addEventListener("load", () => setTimeout(movePill, 300));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(movePill, 60));
  $("#yr").textContent = "© " + new Date().getFullYear() + " " + SITE;
}
