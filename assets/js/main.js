import { applyThemePref } from "./lib/prefs.js";
applyThemePref();
import { $, $$, esc, RM, debounce, toast, copyText, copyFx, safeNext, fmtTime, pad } from "./lib/util.js";
import { dlog } from "./lib/log.js";
import * as router from "./lib/router.js";
import { session, onAuth, signOut } from "./lib/auth.js";
import * as S from "./lib/store.js";
import { initLayout, setPage, renderNav, renderCounts, renderNotifDot, renderAccount, markActive, closeDrawer } from "./lib/layout.js";
import { initMedia, applyMedia, toggleSound, renderSound } from "./lib/media.js";
import { registerRoutes, notFoundDef } from "./routes.js";

const store = S.store, RMq = RM;

/* ── Router ── */
registerRoutes();
let lastBeforeSearch = "/";
router.configure({
  view: $("#view"), setPage, notFound: notFoundDef, safeNext, waitFor: S.waitFor,
  onRoute(cur) {
    document.body.dataset.route = cur.pattern || cur.path; maybeNotice();
    markActive(); applyMaint(); renderAccount();
    if (innerWidth < 960) closeDrawer();
    $("#hdrSearch").classList.remove("open");
    const isSearch = cur.path === "/search";
    if (!isSearch) lastBeforeSearch = location.pathname + location.search;
    const q = isSearch ? new URL(location.href).searchParams.get("q") || "" : "";
    ["#q", "#qM"].forEach(s => { const el = $(s); if (el && document.activeElement !== el) { el.value = q; el.closest(".searchbox").classList.toggle("has-q", !!q); } });
    if (!RMq) { const s = $("#sweepfx"); s.classList.remove("run"); void s.offsetWidth; s.classList.add("run"); }
  }
});

/* ── Splash (mỗi tab chỉ 1 lần) ── */
let seen = false; try { seen = sessionStorage.getItem("ssw_splash") === "1"; } catch (_) {}
const splash = $("#splash");
function finishSplash() {
  if (splash.dataset.done) return; splash.dataset.done = "1";
  try { sessionStorage.setItem("ssw_splash", "1"); } catch (_) {}
  $("#spBar").style.width = "100%";
  const fin = () => { splash.style.display = "none"; maybeNotice(); };
  if (RMq) { document.body.classList.add("welc"); return fin(); }
  setTimeout(() => { splash.classList.add("out"); document.body.classList.add("welc"); setTimeout(fin, 420); }, 180);
}
if (seen) { splash.style.display = "none"; splash.dataset.done = "1"; document.body.classList.add("welc"); }
else {
  const w = $("#spWord");
  "SKIBIDI SCRIPT WEB".split(" ").forEach((word, wi) => {
    const sp = document.createElement("span"); sp.style.cssText = "display:flex" + (wi ? ";margin-left:.35em" : "");
    word.split("").forEach((ch, i) => { const c = document.createElement("span"); c.className = "ch"; c.textContent = ch; c.style.setProperty("--d", (240 + (wi * 7 + i) * 45) + "ms"); sp.appendChild(c); });
    w.appendChild(sp);
  });
  $("#spBar").style.width = "40%";
  S.ready.then(finishSplash); setTimeout(finishSplash, 1200);
}

/* ── Hạt nền ── */
if (!RMq) {
  const bg = $("#bg");
  for (let i = 0; i < 12; i++) {
    const s = document.createElement("span"); s.className = "ptcl"; s.style.left = (Math.random() * 100).toFixed(2) + "%";
    s.style.setProperty("--sz", (1.5 + Math.random() * 2.5).toFixed(1) + "px"); s.style.animationDuration = (14 + Math.random() * 16).toFixed(1) + "s";
    s.style.animationDelay = (-Math.random() * 24).toFixed(1) + "s"; s.style.opacity = (0.12 + Math.random() * 0.3).toFixed(2); bg.appendChild(s);
  }
}

/* ── Bảo trì ── */
let mntTimer = null, maintFirstSeen = 0;
const maintUntil = m => { if (m.until) return Number(m.until); const b = Number(m.ts) || 0; if (b) return b + 60000; if (!maintFirstSeen) maintFirstSeen = Date.now(); return maintFirstSeen + 60000; };
const fmtCount = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ":" : "") + pad(m) + ":" + pad(s % 60); };
function applyMaint() {
  const m = store.maint; let on = !!(m && m.enabled), until = 0;
  if (on) { until = maintUntil(m); if (Date.now() >= until) { S.autoCloseMaintenance(); on = false; } }
  const onLogin = /^\/(login|register|forgot-password)(\/|$)/.test(location.pathname);
  const show = on && !session.isDev && !onLogin;
  $("#maint").classList.toggle("on", show);
  if (mntTimer) { clearInterval(mntTimer); mntTimer = null; }
  if (show) {
    const total = Math.max(1000, until - (Number(m.ts) || maintFirstSeen || (until - 60000)));
    const tick = () => { const left = until - Date.now(); $("#mntClock").textContent = fmtCount(left); $("#mntBar").style.width = (Math.max(0, Math.min(1, left / total)) * 100).toFixed(1) + "%"; if (left <= 0) { clearInterval(mntTimer); mntTimer = null; applyMaint(); } };
    tick(); mntTimer = setInterval(tick, 250); document.body.classList.add("locked");
  } else if (!$("#mdNotice").classList.contains("on") && !$("#side").classList.contains("open")) document.body.classList.remove("locked");
}

/* ── Popup thông báo khi vào web (giữ chức năng cũ) + trang /notifications ── */
let noticeShown = false, lastFocus = null;
function maybeNotice() {
  if (splash.dataset.done !== "1" || noticeShown) return;
  const n = store.notice; if (!n || n.enabled === false) return;
  if (!(n.body || "").trim() && !(n.title || "").trim()) return;
  if ($("#maint").classList.contains("on") || /^\/(notifications|login|register|forgot-password)(\/|$)/.test(location.pathname)) return;
  const ver = String(n.updatedAt || n.ts || ""); let rec = null;
  try { rec = JSON.parse(localStorage.getItem("ssw_notice") || "null"); } catch (_) {}
  if (rec && rec.until > Date.now() && rec.ver === ver) return;
  try { if (sessionStorage.getItem("ssw_notice_seen") === ver) return; sessionStorage.setItem("ssw_notice_seen", ver); } catch (_) {} // mỗi tab chỉ hiện 1 lần cho mỗi phiên bản thông báo
  noticeShown = true; $("#ntTitle").textContent = (n.title || "").trim() || "Thông báo"; $("#ntBody").textContent = (n.body || "").trim();
  openNotice();
}
function openNotice() { lastFocus = document.activeElement; $("#mdNotice").classList.add("on"); $("#ov").classList.add("on"); document.body.classList.add("locked"); setTimeout(() => $("#ntClose").focus(), 120); }
function closeNotice() {
  $("#mdNotice").classList.remove("on"); $("#ov").classList.remove("on");
  if (!$("#maint").classList.contains("on")) document.body.classList.remove("locked");
  if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (_) {} lastFocus = null;
}
$("#ntClose").addEventListener("click", closeNotice); $("#ov").addEventListener("click", closeNotice);
$("#nt2h").addEventListener("click", () => {
  const n = store.notice || {};
  try { localStorage.setItem("ssw_notice", JSON.stringify({ until: Date.now() + 7200000, ver: String(n.updatedAt || n.ts || "") })); } catch (_) {}
  closeNotice(); toast("Đã ẩn thông báo trong 2 giờ.");
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if ($("#mdNotice").classList.contains("on")) closeNotice(); else if ($("#side").classList.contains("open")) closeDrawer(); }
  if (e.key === "Tab" && $("#mdNotice").classList.contains("on")) {
    const fs = $$("button", $("#mdNotice")); if (!fs.length) return; const a = fs[0], z = fs[fs.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
  if (e.key === "Enter" && document.activeElement && document.activeElement.classList.contains("card") && document.activeElement.dataset.href) router.navigate(document.activeElement.dataset.href);
});

/* ── Store / Auth → UI ── */
S.subscribe((type, d) => {
  if (type === "cats") { renderNav(); }
  else if (type === "data") renderCounts();
  else if (type === "maint") { maintFirstSeen = 0; applyMaint(); }
  else if (type === "notice") { renderNotifDot(); maybeNotice(); }
  else if (type === "theme") applyMedia();
  else if (type === "conn") $("#connDot").classList.toggle("on", S.store.connected);
});
onAuth(() => { S.syncDevListeners(); renderNav(); applyMaint(); });

/* ── Tìm kiếm (header) ── */
const goSearch = v => { const t = v.trim(); if (t) router.navigate("/search?q=" + encodeURIComponent(t), { replace: location.pathname === "/search" }); else if (location.pathname === "/search") router.navigate(lastBeforeSearch, { replace: true }); };
const onSearch = debounce(goSearch, 250);
function syncInputs(src) { ["#q", "#qM"].forEach(s => { const el = $(s); if (el !== src) el.value = src.value; }); $$(".searchbox").forEach(b => b.classList.toggle("has-q", !!src.value)); }
["#q", "#qM"].forEach(sel => {
  $(sel).addEventListener("input", e => { syncInputs(e.target); onSearch(e.target.value); });
  $(sel).addEventListener("keydown", e => { if (e.key === "Enter") { onSearch.cancel(); goSearch(e.target.value); } });
});
[["#qClr", "#q"], ["#qClrM", "#qM"]].forEach(([b, i]) => $(b).addEventListener("click", () => { const el = $(i); el.value = ""; syncInputs(el); onSearch.cancel(); goSearch(""); el.focus(); }));
$("#btnSearchM").addEventListener("click", () => { const o = $("#hdrSearch").classList.toggle("open"); if (o) setTimeout(() => $("#qM").focus(), 260); });

/* ── Ủy quyền sự kiện ── */
document.addEventListener("click", e => {
  const b = e.target.closest(".btn,.navitem,.tile,.lrow,.seg button,.vclose");
  if (b && !RMq) {
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height), s = document.createElement("span"); s.className = "rip";
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    if (getComputedStyle(b).position === "static") b.style.position = "relative"; b.appendChild(s); setTimeout(() => s.remove(), 580);
  }
  const snd = e.target.closest("#btnSound"); if (snd) { toggleSound(); return; }
  const t = e.target.closest("[data-act]");
  if (!t) {
    if (e.target.closest("[data-stop]") || e.target.closest("a,button,input,select,textarea")) return;
    const card = e.target.closest(".card[data-href]"); if (card) router.navigate(card.dataset.href); return;
  }
  const act = t.dataset.act;
  if (act === "copycode") {
    const it = S.item(t.dataset.cat, t.dataset.key);
    if (!it || !it.code) return toast("Không có code để sao chép.", "err");
    copyText(it.code).then(() => { toast("Đã sao chép code."); copyFx(t); S.incCopies(t.dataset.cat, it); }).catch(() => toast("Không sao chép được.", "err"));
  } else if (act === "copyurl") copyText(t.dataset.url).then(() => { toast("Đã sao chép link."); copyFx(t); }).catch(() => toast("Không sao chép được.", "err"));
  else if (act === "retry") { S.retryCat(t.dataset.cat); toast("Đang tải lại…"); }
  else if (act === "signout") signOut().then(() => toast("Đã đăng xuất.")).catch(() => toast("Đăng xuất thất bại.", "err"));
});

/* ── Hiệu ứng con trỏ + thanh cuộn ── */
if (!RMq && matchMedia("(hover:hover) and (pointer:fine)").matches) {
  let ticking = false, lastE = null, tilt = null;
  $("#main").addEventListener("pointermove", e => {
    lastE = e; if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false; const card = lastE.target.closest && lastE.target.closest(".card");
      if (card !== tilt) { if (tilt) { tilt.classList.remove("tilt"); tilt.style.transform = ""; } tilt = card; }
      if (tilt) { const r = tilt.getBoundingClientRect(), x = (lastE.clientX - r.left) / r.width - .5, y = (lastE.clientY - r.top) / r.height - .5;
        tilt.classList.add("tilt"); tilt.style.transform = `translateY(-4px) perspective(760px) rotateX(${(-y * 4.5).toFixed(2)}deg) rotateY(${(x * 5.5).toFixed(2)}deg)`;
        tilt.style.setProperty("--gx", (x * 100 + 50).toFixed(1) + "%"); tilt.style.setProperty("--gy", (y * 100 + 50).toFixed(1) + "%"); }
    });
  });
}
let sTick = false;
addEventListener("scroll", () => {
  if (sTick) return; sTick = true;
  requestAnimationFrame(() => { sTick = false; $("#hdr").classList.toggle("scrolled", scrollY > 8);
    /* Thanh tiến trình ngang đã được bỏ để giao diện thoáng và không che nội dung. */ });
}, { passive: true });

/* ── Khởi động ── */
initLayout(); initMedia(); renderNav(); renderSound();
S.start();
router.render({ pop: false });
dlog("ok", "Ứng dụng khởi động.");
