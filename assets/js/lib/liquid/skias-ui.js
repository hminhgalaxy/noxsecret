/* Skias kiểu Skliquid: thêm nút phóng to/thu gọn khung chat (cấu trúc đã tách thành ba viên kính bằng CSS). */
import { kvGet, kvSet } from "../cookie.js";
const KEY = "ssw_lq_skbig";
let btn = null, mo = null;
const ICO_BIG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
function add() {
  const root = document.getElementById("sk"), hd = root && root.querySelector(".sk-hd"); if (!hd || hd.querySelector(".sk-size")) return;
  btn = document.createElement("button"); btn.type = "button"; btn.className = "sk-ic sk-size"; btn.title = "Phóng to / thu gọn khung chat"; btn.setAttribute("aria-label", btn.title); btn.innerHTML = ICO_BIG;
  const dock = hd.querySelector(".sk-dock"); hd.insertBefore(btn, dock || null);
  const on = kvGet(KEY) === "1"; root.classList.toggle("big", on);
  btn.addEventListener("click", () => { const b = !root.classList.contains("big"); root.classList.toggle("big", b); kvSet(KEY, b ? "1" : null); });
}
export function initSkiasUi() { add(); if (!btn) { mo = new MutationObserver(() => { add(); if (btn && mo) { mo.disconnect(); mo = null; } }); mo.observe(document.body, { childList: true }); } }
export function stopSkiasUi() { if (mo) mo.disconnect(); mo = null; if (btn) btn.remove(); btn = null; const r = document.getElementById("sk"); if (r) r.classList.remove("big"); }
