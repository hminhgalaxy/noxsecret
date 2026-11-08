/* Router History API: URL thật, deep link, Back/Forward, guard đăng nhập/DEV, lazy load, 404. */
import { session, ready as authReady, onAuth, adminReady, secReady } from "./auth.js";
import { toast, RM } from "./util.js";

const routes = [];
const seen = new Set();
export function compile(path) {
  const keys = [];
  const src = path.replace(/[.*+?^${}()|[\]\\]/g, m => (m === "/" ? m : "\\" + m)).replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; });
  return { re: new RegExp("^" + src.replace(/\/$/, "") + "/?$"), keys };
}
export function define(path, def) {
  if (seen.has(path)) throw new Error("Route trùng lặp: " + path);
  seen.add(path); routes.push({ path, ...compile(path), def });
}
export const routeTable = () => routes.map(r => ({ path: r.path, guard: r.def.guard || "public" }));
export function match(pathname) {
  for (const r of routes) {
    const m = r.re.exec(pathname); if (!m) continue;
    const params = {}; let ok = true;
    r.keys.forEach((k, i) => { try { params[k] = decodeURIComponent(m[i + 1]); } catch (_) { ok = false; } });
    if (ok) return { def: r.def, params, path: r.path };
  }
  return null;
}
/* Quyết định guard — hàm thuần để kiểm thử */
export function decide(guard, s, here) {
  if (guard === "open") return null; /* công khai và không bị chặn bởi bước nhập mã 2 bước (vd. /auth/action) */
  const real = s.user && !s.isGuest;
  /* Đã nhập mật khẩu nhưng chưa nhập mã 2 bước → mọi trang (trừ trang nhập mã) chuyển về /two-step */
  if (real && s.twofaPending && guard !== "twofa") {
    let nx = here; try { const u = new URL(here, "http://x"); if (/^\/(login|register|forgot-password|two-step)$/.test(u.pathname)) nx = u.searchParams.get("next") || "/"; } catch (_) {}
    return { to: "/two-step" + (nx && nx !== "/" ? "?next=" + encodeURIComponent(nx) : ""), replace: true };
  }
  if (!guard || guard === "public") return null;
  if (guard === "twofa") return !real ? { to: "/login", replace: true } : (!s.twofaPending ? { to: "__next__", replace: true } : null);
  if (guard === "guest") return real ? { to: "__next__", replace: true } : null;
  if (!s.user) return { to: "/login?next=" + encodeURIComponent(here), replace: true };
  if (guard === "staff" && !(s.isDev || s.isEditor)) return { to: "/", replace: true, toast: "Bạn không có quyền thực hiện thao tác này." };
  if (guard === "dev" && !s.isDev) return { to: "/", replace: true, toast: s.devBlocked || "Bạn không có quyền truy cập khu vực DEV." };
  return null;
}

let hooks = { setPage: () => {}, onRoute: () => {}, view: null, notFound: null, safeNext: x => x, waitFor: () => Promise.resolve() };
export function configure(h) { hooks = Object.assign(hooks, h); }

let navId = 0, cur = null, cleanups = [], histKey = 0;
const scrollPos = new Map();
export const current = () => cur;
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

export function navigate(to, opts = {}) {
  let url; try { url = new URL(to, location.origin); } catch (_) { return Promise.resolve(); }
  if (url.origin !== location.origin) { location.assign(url.href); return Promise.resolve(); }
  const full = url.pathname + url.search + url.hash;
  if (!opts.replace && full === location.pathname + location.search + location.hash && cur) { window.scrollTo(0, 0); return Promise.resolve(); }
  scrollPos.set(history.state && history.state.k, window.scrollY);
  const st = { k: ++histKey };
  history[opts.replace ? "replaceState" : "pushState"](st, "", full);
  return render({ pop: false });
}
window.addEventListener("popstate", e => { histKey = Math.max(histKey, (e.state && e.state.k) || 0); render({ pop: true }); });

document.addEventListener("click", e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
  if (a.target && a.target !== "_self") return;
  if (a.hasAttribute("download") || a.dataset.external != null) return;
  const href = a.getAttribute("href"); if (!href || href[0] === "#" || /^(mailto:|tel:|javascript:)/i.test(href)) return;
  let url; try { url = new URL(href, location.href); } catch (_) { return; }
  if (url.origin !== location.origin) return;
  e.preventDefault(); navigate(url.pathname + url.search + url.hash);
});

function runCleanups() { const c = cleanups; cleanups = []; c.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }
function barStart() { const b = document.getElementById("loadbar"); if (!b) return; b.classList.remove("run", "busy", "done"); b.style.width = ""; void b.offsetWidth; b.classList.add("busy"); }
function barEnd() {
  const b = document.getElementById("loadbar"); if (!b || !b.classList.contains("busy")) return;
  const w = getComputedStyle(b).width; b.classList.remove("busy"); b.style.width = w; void b.offsetWidth; b.classList.add("done"); b.style.width = "100%";
}
const setBusy = on => { document.body.classList.toggle("page-loading", on); if (hooks.view) hooks.view.classList.toggle("loading", on && !!cur); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function render({ pop = false } = {}) {
  const id = ++navId, url = new URL(location.href), here = url.pathname + url.search;
  barStart();
  let m = match(url.pathname) || { def: hooks.notFound, params: {}, path: "*" };
  let def = m.def;
  await authReady; if (def.guard !== "open") await secReady(); if (def.guard === "staff") await adminReady();
  if (id !== navId) return;
  const d = decide(def.guard, session, here);
  if (d) {
    if (d.toast) toast(d.toast, "err");
    const to = d.to === "__next__" ? (hooks.safeNext(url.searchParams.get("next")) || "/") : d.to;
    history.replaceState({ k: (history.state && history.state.k) || ++histKey }, "", to);
    return render({ pop: false });
  }
  const view = hooks.view;
  const prev = cur;
  const needs = typeof def.needs === "function" ? def.needs(m.params) : (def.needs || []);
  const spin = setTimeout(() => { if (id === navId) setBusy(true); }, 140);
  let mod, loadErr = null;
  try { [mod] = await Promise.all([def.load(), hooks.waitFor(needs)]); } catch (e) { loadErr = e; }
  clearTimeout(spin);
  if (id !== navId) return;
  setBusy(false);
  if (!loadErr && prev && !RM()) { view.classList.add("leaving"); await sleep(110); if (id !== navId) return; }
  if (loadErr) {
    const e = loadErr;
    console.error(e); runCleanups(); view.classList.remove("leaving"); barEnd();
    hooks.setPage({ title: "Lỗi tải trang", crumbs: [] });
    view.innerHTML = `<div class="statebox err"><p>Không tải được trang này. Vui lòng kiểm tra mạng và thử lại.</p><button class="btn ghost" id="retryRoute">Thử lại</button></div>`;
    view.querySelector("#retryRoute").onclick = () => render({ pop: false }); cur = { def, params: m.params, path: url.pathname }; hooks.onRoute(cur); return;
  }
  runCleanups();
  view.classList.remove("leaving"); view.innerHTML = ""; hooks.setPage({ reset: true });
  const el = document.createElement("div"); el.className = "page"; view.appendChild(el);
  cur = { def, params: m.params, path: url.pathname, pattern: m.path };
  const ctx = {
    el, params: m.params, query: url.searchParams, path: url.pathname, def, navigate, setPage: hooks.setPage,
    cleanup: f => cleanups.push(f), isCurrent: () => id === navId
  };
  hooks.onRoute(cur);
  hooks.setPage({ title: def.title || null, desc: def.desc, noindex: !!def.noindex || !!(def.guard && def.guard !== "public") });
  try {
    const out = await mod[def.fn || "mount"](ctx);
    if (id !== navId) { if (typeof out === "function") try { out(); } catch (_) {} return; }
    if (typeof out === "function") cleanups.push(out);
  } catch (e) {
    console.error(e);
    if (id === navId) el.innerHTML = `<div class="statebox err"><p>Trang này đang gặp sự cố. Vui lòng tải lại trang.</p></div>`;
  }
  if (id !== navId) return;
  barEnd();
  if (pop) { const y = scrollPos.get(history.state && history.state.k); window.scrollTo(0, y || 0); } else window.scrollTo(0, 0);
  view.focus && view.focus({ preventScroll: true });
}

/* Đăng nhập/đăng xuất khi đang ở trang có guard → đánh giá lại ngay */
onAuth(() => {
  if (!cur) return;
  const here = location.pathname + location.search;
  const m = match(location.pathname), guard = (m ? m.def : cur.def).guard; /* guard của địa chỉ hiện tại (cur có thể còn là trang trước khi đang chờ hồ sơ quyền) */
  const d = decide(guard, session, here);
  if (d) { if (d.toast) toast(d.toast, "err"); const to = d.to === "__next__" ? (hooks.safeNext(new URL(location.href).searchParams.get("next")) || "/") : d.to; navigate(to, { replace: true }); }
});
