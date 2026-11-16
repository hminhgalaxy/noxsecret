/* Lịch sử mua hàng: mỗi đơn có mã đơn, thời gian mua, số tiền, trạng thái "Thành công"; mỗi món có Xem trực tiếp · Tải file về · Chia sẻ. */
import { esc, fmtTime, copyText, copyFx, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { shop, subscribeShop, money, startShop } from "../../lib/shop.js";
import { openOrder, openLive, downloadItem, shareReceipt, orderCode, canOpen, ORDER_ST } from "../../lib/orderpop.js";

const FIL = [["all", "Tất cả"], ["paid", "Thành công"], ["pending", "Đang xử lý"], ["refunded", "Đã hoàn tiền"]];
export function mount(ctx) {
  startShop();
  ctx.setPage({ title: "Lịch sử mua hàng", sub: "Các đơn bạn đã mua: xem trực tiếp, tải file về hoặc chia sẻ.", noindex: true, crumbs: [{ label: "Cửa hàng", href: "/" }] });
  ctx.el.innerHTML = `<div class="chips" id="odF" role="tablist">${FIL.map(([v, l], i) => `<button type="button" role="tab" data-f="${v}" class="${i ? "" : "on"}">${l}</button>`).join("")}</div><div id="odL" class="od-list"><div class="statebox sm"><p>Đang tải…</p></div></div>`;
  const list = ctx.el.querySelector("#odL"); let f = "all", shown = false;
  const find = id => (shop.orders || []).find(o => o.id === id);
  const draw = () => {
    const all = shop.orders; if (all === null) return;
    const L = all.filter(o => f === "all" || o.status === f);
    list.innerHTML = L.length ? L.map(o => { const [lab, tone] = ORDER_ST[o.status] || ["", ""];
      return `<article class="od" data-id="${esc(o.id)}"><header class="od-h"><div class="od-id"><b translate="no">${esc(orderCode(o))}</b><button class="od-cp" type="button" data-code aria-label="Sao chép mã đơn hàng">${ICO.copy}</button><small>${esc(fmtTime(o.paidAt || o.ts))}</small></div><span class="od-st ${tone}">${lab}</span><b class="od-total">${money(o.total)}</b></header>
        <ul class="od-items">${(o.items || []).map(i => { const ok = canOpen(o, i), manual = o.status === "paid" && ((o.delivery || []).find(d => d.id === i.id) || {}).manual;
          return `<li data-i="${esc(i.id)}"><div class="od-it"><span translate="no">${esc(i.name)}</span><em>× ${i.qty}</em><span>${money(i.price * i.qty)}</span></div>
            <div class="od-acts">${ok ? `<button class="btn primary sm" type="button" data-live>${ICO.eye}Xem trực tiếp</button><button class="btn soft sm" type="button" data-dl>${ICO.download2}Tải file về</button>` : manual ? `<span class="oi-wait">${ICO.info}Chờ dev giao tay qua Hộp thư</span>` : ""}<button class="btn ghost sm" type="button" data-share>${ICO.share}Chia sẻ</button></div></li>`; }).join("")}</ul>
        <footer class="od-f"><button class="btn ghost sm" type="button" data-detail>${ICO.receipt}Chi tiết đơn</button></footer></article>`; }).join("")
      : `<div class="statebox">${ICO.receipt}<p>${all.length ? "Không có đơn nào ở trạng thái này." : "Bạn chưa mua gì. Hãy xem cửa hàng nhé!"}</p>${all.length ? "" : '<a class="btn primary" href="/">Đến cửa hàng</a>'}</div>`;
    if (!shown) { shown = true; const id = ctx.query.get("o"), o = id && find(id); if (o) openOrder(o); }
  };
  list.addEventListener("click", e => {
    const art = e.target.closest(".od"); if (!art) return; const o = find(art.dataset.id); if (!o) return;
    const li = e.target.closest("li[data-i]"), it = li && (o.items || []).find(x => x.id === li.dataset.i);
    if (e.target.closest("[data-live]") && it) openLive(o, it);
    else if (e.target.closest("[data-dl]") && it) { if (!downloadItem(o, it)) toast("Món này chưa có nội dung để tải.", "err"); }
    else if (e.target.closest("[data-share]") && it) shareReceipt(o, it);
    else if (e.target.closest("[data-detail]")) openOrder(o);
    else { const b = e.target.closest("[data-code]"); if (b) copyText(orderCode(o).slice(1)).then(() => { copyFx(b); toast("Đã sao chép mã đơn hàng."); }).catch(() => toast("Không sao chép được.", "err")); }
  });
  ctx.el.querySelector("#odF").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (!b) return; f = b.dataset.f; ctx.el.querySelectorAll("#odF [data-f]").forEach(x => x.classList.toggle("on", x === b)); draw(); });
  draw();
  return subscribeShop(t => { if (t === "orders") draw(); });
}
