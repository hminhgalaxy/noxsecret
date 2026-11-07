/* Menu: thanh bên (máy tính), ngăn kéo + thanh dưới (điện thoại). Có hai nút mở rộng riêng: Danh mục và Dev Panel. */
import { $, $$, esc } from "./util.js";
import { ICO } from "./icons.js";
import { store } from "./store.js";
import { session, isEditor } from "./auth.js";
import { current } from "./router.js";
import { icoOf, avatarHTML } from "./ui.js";
import { unreadCount } from "./updates.js";

const LINKS = {
  home: { href: "/", label: "Trang chủ", icon: "home", exact: true },
  search: { href: "/search", label: "Tìm kiếm", icon: "search" },
  notice: { href: "/notifications", label: "Thông báo", icon: "bell", dot: "notice" },
  profile: { href: "/profile", label: "Hồ sơ", icon: "user" },
  settings: { href: "/settings", label: "Cài đặt", icon: "gear" },
  allCats: { href: "/categories", label: "Tất cả danh mục", icon: "grid", exact: true },
  dev: [{ href: "/dev", label: "Tổng quan", icon: "dash", exact: true }, { href: "/dev/data", label: "Dữ liệu", icon: "box" },
        { href: "/dev/categories", label: "Danh mục", icon: "grid" }, { href: "/dev/users", label: "Người dùng", icon: "users" },
        { href: "/dev/theme", label: "Giao diện", icon: "paint" }, { href: "/dev/updates", label: "Cập nhật", icon: "bell" }, { href: "/dev/mail", label: "Gửi thư", icon: "mail" },
        { href: "/dev/system", label: "Bảo trì & thông báo", icon: "wrench" }, { href: "/dev/test", label: "Kiểm tra hệ thống", icon: "check" }]
};
const link = (l, cls = "", i = null) => `<a class="nav-link ${cls}" href="${l.href}" data-exact="${l.exact ? 1 : 0}"${i != null ? ` style="--i:${i}"` : ""}>${ICO[l.icon] || ICO.box}<span class="nl">${esc(l.label)}</span>${l.dot ? `<span class="dot" data-dot="${l.dot}" hidden></span>` : ""}${l.cnt != null ? `<span class="cnt" data-cnt="${esc(l.cid)}"${l.cnt ? "" : " hidden"}>${l.cnt || ""}</span>` : ""}</a>`;

/* Trạng thái mở/đóng của hai nút: nhớ lại trên trình duyệt này */
const GKEY = "ssw_navgroups";
const saved = (() => { try { const v = JSON.parse(localStorage.getItem(GKEY)); if (v && typeof v === "object") return v; } catch (_) {} return {}; })();
const openNow = new Set(Object.keys(saved).filter(k => saved[k]));
const persist = () => { try { const o = {}; ["cats", "dev"].forEach(k => { o[k] = openNow.has(k); }); localStorage.setItem(GKEY, JSON.stringify(o)); } catch (_) {} };

const group = (id, { title, icon, count, cls = "" }, items) => {
  const open = openNow.has(id);
  return `<div class="disc${open ? " open" : ""}" data-g="${id}">
    <button class="nav-btn ${cls}" type="button" aria-expanded="${open}" aria-controls="disc-${id}"><span class="ni">${ICO[icon] || ICO.box}</span><span class="nb-label">${esc(title)}</span>${count != null ? `<span class="nb-count" data-gcount="${id}">${count}</span>` : ""}${ICO.chevD}</button>
    <div class="disc-panel" id="disc-${id}"${open ? "" : " inert"}><div class="disc-clip"><div class="disc-in">${items}</div></div></div></div>`;
};
export function setGroup(id, open, save = true) {
  const g = $(`.disc[data-g="${id}"]`);
  open ? openNow.add(id) : openNow.delete(id);
  if (save) persist();
  if (!g) return;
  g.classList.toggle("open", open);
  g.querySelector(".nav-btn").setAttribute("aria-expanded", String(open));
  const p = g.querySelector(".disc-panel"); open ? p.removeAttribute("inert") : p.setAttribute("inert", "");
}

let navKey = "";
export function renderNav(force) {
  const side = $("#sideNav"); if (!side) return;
  const key = store.cats.map(c => c.id + c.label).join("|") + "#" + (session.user ? "u" : "g") + (session.isDev ? "d" : "");
  if (!force && key === navKey) { renderCounts(); return; }
  navKey = key;
  const cats = store.cats.map(c => ({ href: "/" + c.path, label: c.label, icon: c.icon || c.id, cnt: (store.data[c.id] || []).length, cid: c.id }));
  const catItems = [link(LINKS.allCats, "disc-item", 0)].concat(cats.map((c, i) => link(c, "disc-item", i + 1))).join("");
  const devItems = LINKS.dev.map((l, i) => link(l, "disc-item", i)).join("");
  side.innerHTML = `<span class="nav-sec">Khám phá</span>
    ${link(LINKS.home)}
    ${link(LINKS.search)}
    ${group("cats", { title: "Danh mục", icon: "grid", count: cats.length }, catItems)}
    ${link(LINKS.notice)}
    <span class="nav-sec">Của bạn</span>
    ${session.user ? link(LINKS.profile) : ""}${link(LINKS.settings)}
    ${session.isDev ? `<span class="nav-sec">Quản trị</span>${group("dev", { title: "Dev Panel", icon: "shield", cls: "dev" }, devItems)}` : ""}`;
  renderNotifDot(); markActive(false); renderAccount();
}
export function renderCounts() {
  store.cats.forEach(c => $$(`[data-cnt="${c.id}"]`).forEach(el => { const n = (store.data[c.id] || []).length; el.hidden = !n; el.textContent = n || ""; }));
}
/* Chuông ở đầu trang + chấm ở mục Thông báo: số cập nhật chưa xem. Trả về số hiện tại. */
let lastUnread = -1;
export function renderNotifDot() {
  const n = unreadCount();
  $$("[data-dot='notice']").forEach(el => { el.hidden = !n; });
  const bell = $("#btnBell"), badge = $("#bellBadge");
  if (bell && badge) {
    badge.hidden = !n; badge.textContent = n > 9 ? "9+" : String(n || "");
    bell.classList.toggle("has", !!n);
    bell.setAttribute("aria-label", n ? "Thông báo (" + n + " mới)" : "Thông báo");
    if (lastUnread >= 0 && n > lastUnread) { bell.classList.remove("ring"); void bell.offsetWidth; bell.classList.add("ring"); }
  }
  const grew = lastUnread >= 0 && n > lastUnread; lastUnread = n; return grew;
}
/* auto = true khi vừa chuyển trang: tự mở nút chứa mục đang xem */
export function markActive(auto = true) {
  const path = (current() && current().path) || location.pathname;
  const side = $("#side"); if (!side) return;
  const links = $$("a.nav-link[href]", side);
  let best = null, bestLen = -1;
  links.forEach(a => {
    const h = a.getAttribute("href"), ex = a.dataset.exact === "1";
    const hit = h === "/" ? path === "/" : ex ? path === h : (path === h || path.startsWith(h + "/"));
    if (hit && h.length > bestLen) { best = a; bestLen = h.length; }
  });
  links.forEach(a => { const on = a === best; a.classList.toggle("on", on); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
  $$(".disc", side).forEach(g => g.classList.toggle("has-on", !!(best && g.contains(best))));
  const bg = best && best.closest(".disc"); if (auto && bg && !bg.classList.contains("open")) setGroup(bg.dataset.g, true, false);
  markTabs(path);
}
const CAT_PATHS = () => ["/categories"].concat(store.cats.map(c => "/" + c.path));
function markTabs(path) {
  const t = p => path === p || path.startsWith(p + "/");
  let which = null;
  if (path === "/") which = "home"; else if (t("/search")) which = "search";
  else if (["/profile", "/login", "/register", "/forgot-password", "/settings"].some(t)) which = "me";
  else if (CAT_PATHS().some(t)) which = "cats";
  $$("#tabbar .tab").forEach(a => { const on = a.dataset.tab === which; a.classList.toggle("on", on); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
}

/* Tài khoản: góc trên bên phải + cuối menu + thẻ "Hồ sơ" ở thanh dưới */
export function renderAccount() {
  const u = session.user, name = u ? (session.isGuest ? "Khách" : (u.displayName || (u.email || "").split("@")[0] || "Bạn")) : "", role = session.isGuest ? "Khách (hạn chế)" : session.isDev ? "Quản trị viên" : isEditor() ? "Biên tập viên" : "Thành viên";
  const h = $("#hdrAcc");
  if (h) {
    h.dataset.state = u ? "in" : "out";
    h.innerHTML = u ? `<a class="avatar" href="/profile" aria-label="Hồ sơ của ${esc(name)}">${avatarHTML(u)}</a>`
      : `<a class="btn ghost sm hdr-login-full" href="/register">Đăng ký</a><a class="btn primary sm hdr-login-txt" href="/login">Đăng nhập</a><a class="avatar hdr-login-ico" href="/login" aria-label="Đăng nhập">${ICO.user}</a>`;
  }
  const z = $("#authZone");
  if (z) z.innerHTML = u
    ? `<a class="me" href="/profile"><span class="avatar">${avatarHTML(u)}</span><span class="who"><b>${esc(name)}</b><small>${role}</small></span></a>
       <button class="btn ghost sm block" data-act="signout" type="button">${ICO.out}Đăng xuất</button>`
    : `<a class="btn primary block" href="/login">Đăng nhập</a><a class="btn ghost block" href="/register">Tạo tài khoản</a>`;
  const tm = $("#tabMe"), tl = $("#tabMeL"); if (tm) { tm.setAttribute("href", u ? "/profile" : "/login"); if (tl) tl.textContent = u ? "Hồ sơ" : "Đăng nhập"; }
}

/* Ngăn kéo (điện thoại) · trên máy tính nút menu thu gọn / mở rộng thanh bên */
let lastFocus = null;
const side = () => $("#side");
const desktop = () => matchMedia("(min-width:1024px)").matches;
const sideOff = () => document.documentElement.classList.contains("side-off");
export function isDrawerOpen() { return side().classList.contains("open"); }
function syncMenuBtn() {
  const b = $("#btnMenu"); if (!b) return;
  const open = desktop() ? !sideOff() : isDrawerOpen();
  b.setAttribute("aria-expanded", String(open)); b.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
}
export function openDrawer(opts = {}) {
  if (desktop()) { setSideOff(false); if (opts.expand) setGroup(opts.expand, true, false); return; }
  lastFocus = document.activeElement;
  side().classList.add("open"); $("#sideOv").classList.add("on"); document.body.classList.add("locked");
  syncMenuBtn();
  if (opts.expand) setTimeout(() => setGroup(opts.expand, true, false), 280);
}
export function closeDrawer() {
  if (!isDrawerOpen()) return;
  side().classList.remove("open"); $("#sideOv").classList.remove("on");
  syncMenuBtn();
  if (!$("#maint").classList.contains("on") && !$("#mdNotice").classList.contains("on")) document.body.classList.remove("locked");
  if (lastFocus && lastFocus.focus && !desktop()) try { lastFocus.focus({ preventScroll: true }); } catch (_) {} lastFocus = null;
}
function setSideOff(off) {
  document.documentElement.classList.toggle("side-off", off);
  try { localStorage.setItem("ssw_side", off ? "0" : "1"); } catch (_) {}
  side().toggleAttribute("inert", off && desktop()); syncMenuBtn();
}
export function initNav() {
  $("#btnMenu").addEventListener("click", () => { if (desktop()) setSideOff(!sideOff()); else isDrawerOpen() ? closeDrawer() : openDrawer(); });
  $("#sideClose").addEventListener("click", closeDrawer);
  $("#sideOv").addEventListener("click", closeDrawer);
  $("#tabCats").addEventListener("click", () => isDrawerOpen() ? closeDrawer() : openDrawer({ expand: "cats" }));
  $("#sideNav").addEventListener("click", e => {
    const h = e.target.closest(".nav-btn"); if (!h) return;
    const g = h.closest(".disc"); setGroup(g.dataset.g, !g.classList.contains("open"));
  });
  matchMedia("(min-width:1024px)").addEventListener("change", () => { closeDrawer(); document.body.classList.remove("locked"); side().toggleAttribute("inert", desktop() && sideOff()); syncMenuBtn(); });
  side().toggleAttribute("inert", desktop() && sideOff()); syncMenuBtn();
}
