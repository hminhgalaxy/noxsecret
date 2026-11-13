/* Chi tiết sản phẩm: thư viện ảnh, giá, tồn kho, số lượng, Thêm vào giỏ / Mua ngay. */
import { esc, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { shop, subscribeShop, productById, catName, money, soldOut, stockLabel, addToCart, visibleProducts } from "../../lib/shop.js";
import { openCart } from "../../lib/cart.js";
import { productCardHTML, bindProductGrid } from "./home.js";

export function mount(ctx) {
  const id = ctx.params.id; let qty = 1, shown = 0;
  ctx.setPage({ title: "Sản phẩm", crumbs: [{ label: "Cửa hàng", href: "/" }] });
  const draw = () => {
    if (shop.items === null) { ctx.el.innerHTML = `<div class="statebox"><p>Đang tải…</p></div>`; return; }
    const p = productById(id);
    if (!p || !p.active) { ctx.setPage({ title: "Không tìm thấy sản phẩm", noindex: true, crumbs: [{ label: "Cửa hàng", href: "/" }] }); ctx.el.innerHTML = `<div class="statebox">${ICO.bag}<p>Sản phẩm này không tồn tại hoặc đã ngừng bán.</p><a class="btn primary" href="/">Về cửa hàng</a></div>`; return; }
    ctx.setPage({ title: p.name, desc: (p.desc || p.name).slice(0, 155), crumbs: [{ label: "Cửa hàng", href: "/" }].concat(p.cat && catName(p.cat) ? [] : []) });
    const out = soldOut(p), max = p.stock === null ? 99 : Math.max(1, Math.min(99, p.stock)); qty = Math.max(1, Math.min(qty, max)); if (shown >= p.gallery.length) shown = 0;
    const rel = visibleProducts().filter(x => x.id !== p.id && x.cat === p.cat).slice(0, 4);
    ctx.el.innerHTML = `<article class="pd" aria-labelledby="pdN">
      <div class="pd-gal"><div class="pd-main">${p.gallery.length ? `<img id="pdImg" src="${esc(p.gallery[shown])}" alt="${esc(p.name)}" decoding="async">` : `<span class="pc-ph">${ICO.bag}</span>`}${out ? '<i class="pc-tag out">Hết hàng</i>' : ""}</div>
        ${p.gallery.length > 1 ? `<div class="pd-thumbs" role="tablist" aria-label="Ảnh sản phẩm">${p.gallery.map((g, i) => `<button type="button" role="tab" data-i="${i}" class="${i === shown ? "on" : ""}" aria-label="Ảnh ${i + 1}" aria-selected="${i === shown}"><img src="${esc(g)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}</div>
      <div class="pd-info">${p.cat && catName(p.cat) ? `<span class="pc-cat">${esc(catName(p.cat))}</span>` : ""}
        <h1 id="pdN">${esc(p.name)}</h1>
        <p class="pd-price">${p.price ? money(p.price) : "Miễn phí"}</p>
        <p class="pc-meta"><span class="${out ? "bad" : "ok"}">${esc(stockLabel(p))}</span>${p.sold ? `<span>Đã bán ${p.sold}</span>` : ""}<span>${p.mode === "manual" ? "Giao tay qua Hộp thư" : "Giao hàng tự động"}</span></p>
        ${p.desc ? `<div class="pd-desc" translate="no">${esc(p.desc).replace(/\n/g, "<br>")}</div>` : ""}
        <div class="pd-buy"><span class="qty" role="group" aria-label="Số lượng"><button type="button" data-q="-1" aria-label="Giảm" ${out ? "disabled" : ""}>${ICO.minus}</button><b id="pdQ">${qty}</b><button type="button" data-q="1" aria-label="Tăng" ${out ? "disabled" : ""}>${ICO.plus}</button></span>
          <button class="btn ghost" id="pdAdd" type="button" ${out ? "disabled" : ""}>${ICO.cart}Thêm vào giỏ</button><button class="btn primary" id="pdBuy" type="button" ${out ? "disabled" : ""}>Mua ngay</button></div>
        <p class="pd-sub">${p.price ? "Tổng: <b id=\"pdT\">" + money(p.price * qty) + "</b>" : ""}</p></div></article>
      ${rel.length ? `<section class="pd-rel"><h2>Sản phẩm cùng mục</h2><div class="sh-grid" id="pdRel">${rel.map(productCardHTML).join("")}</div></section>` : ""}`;
    const $ = s => ctx.el.querySelector(s);
    ctx.el.querySelectorAll(".pd-thumbs [data-i]").forEach(b => b.addEventListener("click", () => { shown = +b.dataset.i; draw(); }));
    ctx.el.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => { qty = Math.max(1, Math.min(max, qty + (+b.dataset.q))); $("#pdQ").textContent = qty; const t = $("#pdT"); if (t) t.textContent = money(p.price * qty); }));
    $("#pdAdd").addEventListener("click", () => { addToCart(p.id, qty); toast("Đã thêm vào giỏ hàng."); });
    $("#pdBuy").addEventListener("click", () => { addToCart(p.id, qty); openCart(); });
    const rl = $("#pdRel"); if (rl) bindProductGrid(rl);
  };
  draw();
  const off = subscribeShop(t => { if (t === "items") draw(); });
  return off;
}
