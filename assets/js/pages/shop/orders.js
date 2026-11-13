/* Lịch sử mua hàng: từng đơn, trạng thái, nội dung đã giao (xem lại và sao chép bất cứ lúc nào). */
import { esc, fmtTime } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { shop, subscribeShop, money } from "../../lib/shop.js";
import { deliveryHTML, wireCopy } from "../../lib/cart.js";

const ST = { pending: ["Đang xử lý", "warn"], paid: ["Hoàn tất", "ok"], refunded: ["Đã hoàn tiền", "bad"] };
export function mount(ctx) {
  ctx.setPage({ title: "Lịch sử mua hàng", sub: "Các đơn bạn đã mua và nội dung đã nhận.", noindex: true, crumbs: [{ label: "Cửa hàng", href: "/" }] });
  ctx.el.innerHTML = `<div id="odL" class="od-list"><div class="statebox sm"><p>Đang tải…</p></div></div>`;
  const list = ctx.el.querySelector("#odL"), open = new Set();
  const draw = () => {
    const L = shop.orders; if (L === null) return;
    list.innerHTML = L.length ? L.map(o => { const [lab, tone] = ST[o.status] || ["", ""], isOpen = open.has(o.id);
      return `<article class="od" data-id="${esc(o.id)}"><header class="od-h"><div><b translate="no">#${esc(o.id.slice(-8).toUpperCase())}</b><small>${esc(fmtTime(o.ts))}</small></div><span class="od-st ${tone}">${lab}</span><b class="od-total">${money(o.total)}</b></header>
        <ul class="od-items">${(o.items || []).map(i => `<li><span translate="no">${esc(i.name)}</span><em>× ${i.qty}</em><span>${money(i.price * i.qty)}</span></li>`).join("")}</ul>
        ${o.status === "paid" ? `<button class="btn soft sm od-tg" type="button" aria-expanded="${isOpen}">${ICO.eye}<span>${isOpen ? "Ẩn nội dung đã nhận" : "Xem nội dung đã nhận"}</span></button>${isOpen ? `<div class="od-dv">${deliveryHTML(o.delivery)}</div>` : ""}` : ""}</article>`; }).join("")
      : `<div class="statebox">${ICO.receipt}<p>Bạn chưa mua gì. Hãy xem cửa hàng nhé!</p><a class="btn primary" href="/">Đến cửa hàng</a></div>`;
    wireCopy(list);
  };
  list.addEventListener("click", e => { const b = e.target.closest(".od-tg"); if (!b) return; const id = b.closest(".od").dataset.id; open.has(id) ? open.delete(id) : open.add(id); draw(); });
  draw();
  return subscribeShop(t => { if (t === "orders") draw(); });
}
