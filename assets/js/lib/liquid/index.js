/* Cổng vào của Skliquid Glass: nạp CSS → bật giao diện → khởi động từng phần. Tắt thì dọn sạch về giao diện chuẩn. */
import { ensureCss } from "./css.js";
import { applyUi } from "../prefs.js";
import { initFilters, stopFilters, refract, unrefract, prune } from "./filters.js";
import { initPress, stopPress } from "./press.js";
import { initIndicator, stopIndicator } from "./indicator.js";
import { initBg, stopBg } from "./bg.js";
import { initFluid, stopFluid } from "./fluid.js";
import { initLogo, stopLogo } from "./logo.js";
import { initEdit, stopEdit2 } from "./edit.js";
import { initCats, stopCats } from "./cats.js";
import { initMusic, stopMusic } from "./music.js";
import { initSkiasUi, stopSkiasUi } from "./skias-ui.js";
let running = false, starting = null, mo = null;
const REF = "#hdr,#tabbar,#lqCats,#lqMusic,section.pop,.sk-hd,.sk-form";
function scanRefract() { prune(); document.querySelectorAll(REF).forEach(el => { if (!el.dataset.lqR) { el.dataset.lqR = "1"; refract(el); } }); }
export function start() {
  if (running) return Promise.resolve(); if (starting) return starting;
  starting = ensureCss().then(() => {
    applyUi(); document.dispatchEvent(new CustomEvent("lq-start")); running = true;
    initFilters(); initBg(); initLogo(); initPress(); initFluid(); initCats(); initMusic(); initEdit(); initSkiasUi();
    requestAnimationFrame(() => { initIndicator(); scanRefract(); });
    mo = new MutationObserver(() => requestAnimationFrame(scanRefract)); mo.observe(document.body, { childList: true });
    document.dispatchEvent(new CustomEvent("lq-ready"));
  }).finally(() => { starting = null; });
  return starting;
}
export function stop() {
  if (!running) { applyUi(); return; } running = false; if (mo) mo.disconnect(); mo = null;
  document.querySelectorAll("[data-lq-r]").forEach(el => { unrefract(el); delete el.dataset.lqR; });
  stopSkiasUi(); stopMusic(); stopCats(); stopEdit2(); stopIndicator(); stopPress(); stopFluid(); stopLogo(); stopBg(); stopFilters(); applyUi();
  document.dispatchEvent(new CustomEvent("lq-stop"));
}
export const isRunning = () => running;
export { toggleEdit, isEditing, startEdit, stopEdit } from "./edit.js";
export { toggleCats, setMode as setCatsMode, catsMode } from "./cats.js";
