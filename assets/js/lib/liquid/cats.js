/* Cửa sổ Danh mục nổi: thay cho nhóm "Danh mục" trong menu bên khi dùng Skliquid.
   Kéo thanh tiêu đề để dời chỗ · nút "–" gập lại chỉ còn thanh tiêu đề · nút thu nhỏ thành chấm tròn · nút × ẩn đi (mở lại bằng tab Danh mục hoặc menu). Trạng thái được nhớ. */
import { store, subscribe } from "../store.js";
import { ICO } from "../icons.js";
import { esc } from "../util.js";
import { kvGet, kvSet } from "../cookie.js";
import { jelly } from "./fluid.js";
const KEY = "ssw_lq_cats";
let jl = null, el = null, un = null, st = { m: "hidden", x: null, y: null }, drag = null, wired = false;
const desk = () => matchMedia("(min-width:1024px)").matches;
const load = () => { try { const o = JSON.parse(kvGet(KEY)); if (o && typeof o === "object") st = Object.assign(st, o); else defaults(); } catch (_) { defaults(); } };
const defaults = () => { st = { m: desk() ? "mini" : "hidden", x: null, y: null }; };
const save = () => kvSet(KEY, JSON.stringify(st));
const path = () => location.pathname.replace(/\/+$/, "") || "/";
function body() {
  const cats = store.cats || [], p = path();
  return `<a class="lqc-it all${p === "/categories" ? " on" : ""}" href="/categories">${ICO.grid}<span>Tất cả danh mục</span></a>` + cats.map(c => { const n = (store.data[c.id] || []).length, on = p === "/" + c.path;
    return `<a class="lqc-it${on ? " on" : ""}" href="/${esc(c.path)}" title="${esc(c.label)}">${ICO[c.icon || c.id] || ICO.box}<span>${esc(c.label)}</span><small>${n}</small></a>`; }).join("");
}
function heightNow() {
  /* chiều cao ĐÍCH theo chế độ (đo lúc đang chuyển động sẽ sai) */
  if (st.m === "mini") return 60; if (st.m === "fold") return 56;
  const hd = el.querySelector(".lqc-hd"), bd = el.querySelector(".lqc-bd"), cap = Math.min(innerHeight * (innerWidth <= 700 ? .6 : .7), innerWidth <= 700 ? 520 : 560);
  return Math.min(cap, hd.offsetHeight + bd.scrollHeight + 14);
}
function clamp() {
  if (!el) return; const w = st.m === "mini" ? 60 : Math.min(340, innerWidth - 20), h = heightNow(), top = 76, bot = (desk() ? 12 : 92);
  let x = st.x, y = st.y;
  if (x == null || y == null) { x = desk() ? innerWidth - w - 20 : Math.round((innerWidth - w) / 2); y = desk() ? 92 : Math.max(top, innerHeight - h - bot - 8); }
  x = Math.max(8, Math.min(innerWidth - w - 8, x)); y = Math.max(top, Math.min(innerHeight - h - 8, y));
  el.style.left = x + "px"; el.style.top = y + "px";
}
function paint() {
  if (!el) return; el.dataset.m = st.m; el.dataset.n = (store.cats || []).length; el.setAttribute("aria-hidden", st.m === "hidden" ? "true" : "false");
  el.toggleAttribute("inert", st.m === "hidden"); el.querySelector(".lqc-bd").innerHTML = body(); clamp();
  const f = el.querySelector('[data-a="fold"]'); if (f) { f.setAttribute("aria-label", st.m === "fold" ? "Mở rộng" : "Gập lại"); f.title = st.m === "fold" ? "Mở rộng" : "Gập lại"; }
}
export const setMode = (m, keep) => { st.m = m; if (!keep) save(); if (el) { el.dataset.m = m; requestAnimationFrame(paint); } document.dispatchEvent(new CustomEvent("lq-cats", { detail: m })); };
export const toggleCats = () => setMode(st.m === "open" || st.m === "fold" ? "hidden" : "open");
export const catsMode = () => st.m;
function onDown(e) {
  if (e.target.closest(".lqc-b")) return; const hd = e.target.closest(".lqc-hd"); if (!hd && st.m !== "mini") return; if (e.button > 0) return;
  const r = el.getBoundingClientRect(); drag = { sx: e.clientX, sy: e.clientY, x: r.left, y: r.top, moved: false, id: e.pointerId };
  el.setPointerCapture && el.setPointerCapture(e.pointerId);
}
function onMove(e) {
  if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!drag.moved && Math.hypot(dx, dy) < 5) return; drag.moved = true; el.classList.add("drag"); const px = st.x == null ? drag.x : st.x; st.x = drag.x + dx; st.y = drag.y + dy; clamp();
  const t = performance.now(), dt = Math.max(8, t - (drag.t || t - 16)); drag.t = t; if (jl) jl.push((st.x - px) / dt * 1000);
}
function onUp() {
  if (!drag) return; const d = drag; drag = null; el.classList.remove("drag"); if (jl) jl.release();
  if (d.moved) save(); else if (st.m === "mini") setMode("open");
}
export function initCats() {
  if (el) return; load();
  el = document.createElement("aside"); el.id = "lqCats"; el.setAttribute("aria-label", "Danh mục");
  el.innerHTML = `<div class="lqc-hd"><b>${ICO.grid}<span>Danh mục</span></b>
    <button class="lqc-b" type="button" data-a="fold" aria-label="Gập lại" title="Gập lại"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 12h12"/></svg></button>
    <button class="lqc-b" type="button" data-a="mini" aria-label="Thu nhỏ thành chấm" title="Thu nhỏ thành chấm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 21h3a2 2 0 0 0 2-2v-3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3"/></svg></button>
    <button class="lqc-b" type="button" data-a="hide" aria-label="Ẩn" title="Ẩn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="lqc-bd"></div>`;
  document.body.appendChild(el); jl = jelly(el);
  el.addEventListener("click", e => { const b = e.target.closest(".lqc-b"); if (!b) return; const a = b.dataset.a; setMode(a === "fold" ? (st.m === "fold" ? "open" : "fold") : a === "mini" ? "mini" : "hidden"); });
  el.addEventListener("pointerdown", onDown); el.addEventListener("pointermove", onMove); el.addEventListener("pointerup", onUp); el.addEventListener("pointercancel", onUp);
  un = subscribe(t => { if (t === "cats" || t === "data") paint(); });
  if (!wired) { wired = true; addEventListener("resize", clamp); addEventListener("ssw:route", paint); }
  /* tab "Danh mục" (điện thoại) bật/tắt cửa sổ này thay vì mở menu */
  const tab = document.getElementById("tabCats"); if (tab) tab.addEventListener("click", tabClick, true);
  paint();
}
function tabClick(e) { if (document.documentElement.dataset.ui !== "liquid") return; e.preventDefault(); e.stopImmediatePropagation(); toggleCats(); }
export function stopCats() {
  const tab = document.getElementById("tabCats"); if (tab) tab.removeEventListener("click", tabClick, true);
  if (un) un(); un = null; if (jl) jl.stop(); jl = null; if (el) el.remove(); el = null;
}
