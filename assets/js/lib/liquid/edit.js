/* Tùy chỉnh bố cục: bật chế độ này thì mỗi phần của trang có các thanh TRẮNG (cạnh phải, cạnh dưới, góc) — bấm giữ và kéo để kéo dài hoặc thu ngắn phần đó.
   Kích thước lưu theo từng trang trong cookie (ssw_lq_layout), mở lại vẫn giữ. "Đặt lại" đưa trang về như cũ. */
import { kvGet, kvSet } from "../cookie.js";
import { toast } from "../util.js";
const KEY = "ssw_lq_layout", GRID = ".lp-grid,.set-grid,.dv-grid,.cat-grid,.stats,.row-grid,.tiles", SKIP = "script,style,.lq-grip,[hidden],.sr-only,#pagehead", MIN_W = 30, MAX_H = 1600;
let editing = false, mo = null, tid = 0, bar = null, active = null;
const view = () => document.getElementById("view");
const path = () => location.pathname.replace(/\/+$/, "") || "/";
const read = () => { try { const o = JSON.parse(kvGet(KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (_) { return {}; } };
function write(o) { let s = JSON.stringify(o); const ks = Object.keys(o); while (s.length > 3300 && ks.length) { delete o[ks.shift()]; s = JSON.stringify(o); } kvSet(KEY, ks.length ? s : null); }
const visible = e => e.offsetParent !== null || getComputedStyle(e).position === "fixed";
const LEAF = ".statebox,.card,.formcard,.auth-card,.set-card,.lq-card,.tile,.pcard,.od,.inv,.panel,.row";
function collect(root, depth, out) {
  const kids = [...root.children].filter(c => !c.matches(SKIP) && visible(c));
  kids.forEach(c => {
    if (c.matches(GRID)) { collect(c, depth + 1, out); return; }
    if (kids.length === 1 && depth < 3 && c.children.length >= 1 && !c.matches(LEAF)) { const n = out.length; collect(c, depth + 1, out); if (out.length > n) return; }
    if (c.getBoundingClientRect().height < 24) return; out.push(c);
  }); return out;
}
export const sections = () => view() ? collect(view(), 0, []) : [];
function style(el, s) {
  el.style.width = s && s[0] && s[0] < 100 ? s[0] + "%" : ""; el.style.justifySelf = s && s[0] && s[0] < 100 ? "center" : "";
  el.style.height = s && s[1] ? s[1] + "px" : ""; el.style.overflow = s && s[1] ? "hidden auto" : "";
  el.style.gridColumn = s && s[2] ? "1 / -1" : ""; el.style.minWidth = s && s[0] ? "0" : "";
}
function apply() {
  const L = read()[path()] || {}; sections().forEach((el, i) => { el.dataset.lqI = i; const s = L[i]; if (s) { el.classList.add("lq-sized"); style(el, s); } else if (el.classList.contains("lq-sized")) { el.classList.remove("lq-sized"); style(el, null); } });
}
function mark() {
  sections().forEach(el => {
    el.classList.add("lq-sec"); if (el.querySelector(":scope>.lq-grip")) return;
    ["r", "b", "c"].forEach(d => { const g = document.createElement("i"); g.className = "lq-grip lq-gr-" + d; g.dataset.d = d; g.setAttribute("aria-hidden", "true"); el.appendChild(g); });
  });
}
function unmark() { document.querySelectorAll(".lq-grip").forEach(g => g.remove()); document.querySelectorAll(".lq-sec").forEach(e => { e.classList.remove("lq-sec", "lq-act", "lq-tip"); e.removeAttribute("data-lq-tip"); }); }
function save(el, patch) {
  const all = read(), p = path(), L = all[p] || {}, i = el.dataset.lqI, cur = L[i] || [0, 0, 0], n = [patch.w != null ? patch.w : cur[0], patch.h != null ? patch.h : cur[1], patch.f != null ? patch.f : cur[2]];
  if (!n[0] && !n[1] && !n[2]) delete L[i]; else L[i] = n; if (Object.keys(L).length) all[p] = L; else delete all[p]; write(all);
}
/* ── kéo thanh trắng ── */
function onDown(e) {
  const g = e.target.closest && e.target.closest(".lq-grip"); if (!g || !editing) return;
  const el = g.parentElement; e.preventDefault(); e.stopPropagation(); g.setPointerCapture && g.setPointerCapture(e.pointerId);
  const r = el.getBoundingClientRect(), s0 = (read()[path()] || {})[el.dataset.lqI] || [0, 0, 0], cell = r.width / ((s0[0] && s0[0] < 100 ? s0[0] : 100) / 100) / (s0[2] ? 1 : 1);
  const parentW = el.parentElement ? el.parentElement.clientWidth : cell, d = g.dataset.d, sx = e.clientX, sy = e.clientY;
  const grid = el.parentElement && getComputedStyle(el.parentElement).display.includes("grid");
  let cur = { w: s0[0] || 0, h: s0[1] || 0, f: s0[2] || 0 };
  active && active.classList.remove("lq-act"); active = el; el.classList.add("lq-act", "lq-resizing", "lq-tip"); g.classList.add("dragging"); document.body.classList.add("lq-resizing");
  const tip = () => el.setAttribute("data-lq-tip", (cur.f ? "Cả hàng" : (cur.w || 100) + "%") + " × " + (cur.h ? cur.h + "px" : "tự động"));
  tip();
  const move = ev => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (d === "r" || d === "c") {
      const px = r.width + dx, full = grid && px > cell * 1.28 && (!s0[0] || s0[0] >= 100 || true);
      if (full) { cur.f = 1; cur.w = 0; el.style.gridColumn = "1 / -1"; el.style.width = ""; el.style.justifySelf = ""; }
      else { cur.f = 0; el.style.gridColumn = ""; const base = Math.min(cell, parentW), pct = Math.round(Math.max(MIN_W, Math.min(100, px / base * 100))); cur.w = pct >= 99 ? 0 : pct; el.style.width = cur.w ? cur.w + "%" : ""; el.style.justifySelf = cur.w ? "center" : ""; el.style.minWidth = "0"; }
    }
    if (d === "b" || d === "c") { cur.h = Math.round(Math.max(60, Math.min(MAX_H, r.height + dy))); el.style.height = cur.h + "px"; el.style.overflow = "hidden auto"; }
    tip();
  };
  const end = () => { g.classList.remove("dragging"); el.classList.remove("lq-resizing", "lq-tip"); el.removeAttribute("data-lq-tip"); document.body.classList.remove("lq-resizing"); g.removeEventListener("pointermove", move); g.removeEventListener("pointerup", end); g.removeEventListener("pointercancel", end);
    el.classList.add("lq-sized"); save(el, cur); if (!cur.w && !cur.h && !cur.f) { el.classList.remove("lq-sized"); style(el, null); } };
  g.addEventListener("pointermove", move); g.addEventListener("pointerup", end); g.addEventListener("pointercancel", end);
}
function resetPage() { const all = read(); delete all[path()]; write(all); sections().forEach(el => { el.classList.remove("lq-sized"); style(el, null); }); toast("Đã đưa trang này về bố cục ban đầu.", "ok"); }
function makeBar() {
  bar = document.createElement("div"); bar.id = "lqEditBar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Tùy chỉnh bố cục");
  bar.innerHTML = `<span>Kéo thanh trắng ở mép mỗi phần để kéo dài hoặc thu ngắn.</span><button class="btn ghost sm" type="button" data-e="reset">Đặt lại trang</button><button class="btn primary sm" type="button" data-e="done">Xong</button>`;
  bar.addEventListener("click", e => { const b = e.target.closest("[data-e]"); if (!b) return; if (b.dataset.e === "done") stopEdit(); else resetPage(); }); document.body.appendChild(bar);
}
const later = () => { clearTimeout(tid); tid = setTimeout(() => { apply(); if (editing) mark(); }, 120); };
export const isEditing = () => editing;
export function startEdit() {
  if (editing) return; editing = true; if (!bar) makeBar(); document.body.classList.add("lq-editing"); apply(); mark(); document.addEventListener("pointerdown", onDown, true);
  document.dispatchEvent(new CustomEvent("lq-edit", { detail: true }));
}
export function stopEdit() { if (!editing) return; editing = false; document.body.classList.remove("lq-editing"); unmark(); document.removeEventListener("pointerdown", onDown, true); document.dispatchEvent(new CustomEvent("lq-edit", { detail: false })); }
export const toggleEdit = () => editing ? stopEdit() : startEdit();
export function initEdit() {
  const v = view(); if (!v || mo) return; apply();
  mo = new MutationObserver(ms => { if (ms.every(m => [...m.addedNodes, ...m.removedNodes].every(n => n.classList && (n.classList.contains("lq-grip") || n.classList.contains("lq-ind"))))) return; later(); });
  mo.observe(v, { childList: true, subtree: true }); addEventListener("ssw:route", later); addEventListener("resize", later);
}
export function stopEdit2() { stopEdit(); mo && mo.disconnect(); mo = null; removeEventListener("ssw:route", later); removeEventListener("resize", later); clearTimeout(tid); document.querySelectorAll(".lq-sized").forEach(e => { e.classList.remove("lq-sized"); style(e, null); }); if (bar) bar.remove(); bar = null; }
