/* Khởi động Skliquid Glass (phần nhẹ, luôn nạp): đọc lựa chọn, nạp lib/liquid/ khi cần, và xử lý mọi nút có thuộc tính data-lq:
   data-lq="toggle" bật/tắt Skliquid · "edit" tùy chỉnh bố cục · "cats" cửa sổ Danh mục nổi · "os" mở Skib OS · "on" chỉ bật. */
import { isLiquid, setLiquid, applyUi } from "./prefs.js";
import { toast } from "./util.js";
import { navigate } from "./router.js";
let mod = null, busy = false;
const load = () => mod || (mod = import("./liquid/index.js"));

async function sync() {
  if (isLiquid()) { const m = await load(); await m.start(); }
  else if (mod) { const m = await mod; m.stop(); } else applyUi();
  paintButtons();
}
export function paintButtons() {
  const on = isLiquid();
  document.querySelectorAll('[data-lq="toggle"]').forEach(b => {
    b.setAttribute("aria-pressed", String(on)); const t = b.querySelector(".lq-t"); if (t) t.textContent = on ? "Về giao diện chuẩn" : "Dùng Skliquid Glass";
    b.dataset.on = on ? "1" : "0";
  });
}
export async function turnOn(quiet) {
  if (isLiquid() && mod) return; setLiquid(true); await sync(); if (!quiet) toast("Đã bật Skliquid Glass ✨ — thử chạm vào nút, công tắc hay kéo thanh trượt.", "ok");
}
export async function turnOff() { setLiquid(false); await sync(); toast("Đã về giao diện chuẩn.", "ok"); }
async function act(a) {
  if (busy) return; busy = true;
  try {
    if (a === "toggle") { isLiquid() ? await turnOff() : await turnOn(); }
    else if (a === "on") await turnOn();
    else {
      if (!isLiquid()) await turnOn(true);
      const m = await load(); await m.start();
      if (a === "edit") m.toggleEdit(); else if (a === "cats") m.toggleCats(); else if (a === "os") navigate("/skibos");
    }
  } finally { busy = false; }
}
export function initLiquid() {
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-lq]"); if (!b) return; e.preventDefault(); const d = document.getElementById("side"); if (d && d.classList.contains("open") && b.dataset.lq !== "toggle") { import("./nav.js").then(n => n.closeDrawer && n.closeDrawer()); } act(b.dataset.lq); });
  document.addEventListener("prefs-change", () => { if (isLiquid() !== (document.documentElement.dataset.ui === "liquid")) sync(); });
  addEventListener("ssw:route", paintButtons);
  if (isLiquid()) sync(); else paintButtons();
}
/* Thẻ giới thiệu + nút bật — dùng trong Cài đặt (và nơi khác) */
export function lqCardHTML(compact) {
  const on = isLiquid();
  return `<div class="lq-promo"><span class="lq-orb" aria-hidden="true"></span><div class="lq-pt"><b>Skliquid Glass</b><span>Giao diện kính lỏng: nút và công tắc dẻo như chất lỏng, viền kính khúc xạ, danh mục dạng cửa sổ nổi, kéo giãn bố cục, Skias kiểu mới và Skib OS.</span></div>
    <button class="btn primary${compact ? "" : " lg"}" type="button" data-lq="toggle" aria-pressed="${on}"><span class="lq-t">${on ? "Về giao diện chuẩn" : "Dùng Skliquid Glass"}</span></button></div>
    <div class="lq-oneline lq-only"><button class="btn ghost sm" type="button" data-lq="edit">Tùy chỉnh bố cục</button><button class="btn ghost sm" type="button" data-lq="cats">Danh mục nổi</button><button class="btn ghost sm" type="button" data-lq="os">Skib OS</button></div>`;
}
