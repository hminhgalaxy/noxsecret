/* Trang chủ: chỉ có bốn chữ World · Chat · Group · Share. Share (kho nội dung) đã mở; ba mục còn lại đang "Coming Soon".
   Cửa hàng nằm ở /shop (mục "Cửa hàng" trong menu). */
import { ICO } from "../lib/icons.js";
import { isLiquid } from "../lib/prefs.js";

const TILES = [
  { k: "world", t: "World", i: "globe", soon: true },
  { k: "chat", t: "Chat", i: "chat", soon: true },
  { k: "group", t: "Group", i: "users", soon: true },
  { k: "share", t: "Share", i: "layers", href: "/library" }
];
export function mount(ctx) {
  ctx.setPage({ hero: true, title: null, desc: "Skibidi Web — World, Chat, Group và Share." });
  ctx.el.innerHTML = `<section class="lp" aria-labelledby="lpH"><h1 id="lpH" class="lp-h">Skibidi <span>Web</span></h1>
    <ul class="lp-grid">${TILES.map((x, i) => {
      const inner = `<span class="lp-ico" aria-hidden="true">${ICO[x.i] || ""}</span><b class="lp-w">${x.t}</b>${x.soon ? '<span class="lp-soon">Coming Soon</span>' : '<span class="lp-go">Mở ngay ' + ICO.arrow + "</span>"}`;
      return `<li style="--i:${i}">${x.soon ? `<div class="lp-tile soon" role="group" aria-label="${x.t} — Coming Soon" data-k="${x.k}">${inner}</div>` : `<a class="lp-tile live" href="${x.href}" data-k="${x.k}">${inner}</a>`}</li>`;
    }).join("")}</ul>
    <div class="lq-try-wrap"><button class="lq-try" type="button" data-lq="toggle" aria-pressed="${isLiquid()}"><i aria-hidden="true"></i><span class="lq-t">${isLiquid() ? "Về giao diện chuẩn" : "Dùng Skliquid Glass"}</span></button></div></section>`;
}
