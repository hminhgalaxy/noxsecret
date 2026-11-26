/* Các "hàng ngang" của một danh mục: Mới nhất · Phổ biến · Có video · Có ảnh · Có code · Có link.
   Mỗi hàng cuộn ngang gọn gàng (scroll-snap), có nút ← → và chỉ hiện khi có đủ mục để khác "Tất cả". */
import { ICO } from "./icons.js";
import { cardHTML } from "./ui.js";
import { validUrl } from "./util.js";

const LEAST = 4;
const SECTIONS = [
  { k: "new", t: "Mới nhất", i: "clock", pick: a => a.slice().sort((x, y) => (y.ts || 0) - (x.ts || 0)), min: 1 },
  { k: "pop", t: "Phổ biến", i: "flame", pick: a => a.filter(x => (x.copies || 0) > 0).sort((x, y) => (y.copies || 0) - (x.copies || 0)), min: 2 },
  { k: "vid", t: "Có video", i: "video", pick: a => a.filter(x => x.video), min: 1 },
  { k: "img", t: "Có ảnh minh họa", i: "eye", pick: a => a.filter(x => x.img), min: 1 },
  { k: "code", t: "Có code", i: "code", pick: a => a.filter(x => x.code), min: 2 },
  { k: "link", t: "Có link", i: "link", pick: a => a.filter(x => validUrl(x.url)), min: 2 }
];
export function rowsHTML(arr, catId) {
  if (!arr || arr.length < LEAST) return "";
  return SECTIONS.map(sec => { const L = sec.pick(arr); if (L.length < sec.min) return ""; const shown = L.slice(0, 14);
    return `<section class="hrow" data-k="${sec.k}" aria-label="${sec.t}"><header class="hrow-h"><h2>${ICO[sec.i] || ""}${sec.t}<small>${L.length}</small></h2><span class="hrow-nav"><button type="button" class="hrow-b" data-d="-1" aria-label="Trước">${ICO.back}</button><button type="button" class="hrow-b" data-d="1" aria-label="Sau">${ICO.arrow}</button></span></header>
      <div class="hrow-track" tabindex="0">${shown.map((it, i) => cardHTML(it, catId, i, false)).join("")}</div></section>`; }).join("");
}
export function bindRows(root) {
  root.querySelectorAll(".hrow").forEach(r => {
    const tr = r.querySelector(".hrow-track"), prev = r.querySelector('[data-d="-1"]'), next = r.querySelector('[data-d="1"]');
    const upd = () => { prev.disabled = tr.scrollLeft < 8; next.disabled = tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 8; r.classList.toggle("fits", tr.scrollWidth <= tr.clientWidth + 8); };
    r.querySelector(".hrow-nav").addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (b) tr.scrollBy({ left: Number(b.dataset.d) * Math.max(240, tr.clientWidth * 0.8), behavior: "smooth" }); });
    tr.addEventListener("scroll", upd, { passive: true }); requestAnimationFrame(upd); setTimeout(upd, 400);
  });
}
