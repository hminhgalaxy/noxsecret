/* Trang chính = CỬA HÀNG: mục lục (danh mục), tìm kiếm, sắp xếp, lưới sản phẩm; kèm lối vào Kho nội dung miễn phí. */
import { esc, vi, toast } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { session } from "../../lib/auth.js";
import { shop, subscribeShop, visibleProducts, catList, catName, money, soldOut, stockLabel, addToCart, balance, canUseWallet } from "../../lib/shop.js";
import { navigate } from "../../lib/router.js";
import { openTopup } from "../../lib/topup.js";
import { openCart } from "../../lib/cart.js";

const SORTS = [["new", "Mới nhất"], ["hot", "Bán chạy"], ["asc", "Giá thấp → cao"], ["desc", "Giá cao → thấp"]];
export const productCardHTML = (p, i = 0) => `<article class="pcard${soldOut(p) ? " out" : ""}" style="--d:${Math.min(i, 12) * 40}ms" data-href="/shop/${esc(p.id)}" tabindex="0">
  <a class="pc-img" href="/shop/${esc(p.id)}" data-stop tabindex="-1" aria-hidden="true">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" decoding="async">` : `<span class="pc-ph">${ICO.bag}</span>`}
    ${soldOut(p) ? '<i class="pc-tag out">Hết hàng</i>' : p.sold >= 10 ? '<i class="pc-tag hot">Bán chạy</i>' : Date.now() - p.createdAt < 7 * 864e5 && p.createdAt ? '<i class="pc-tag new">Mới</i>' : ""}</a>
  <div class="pc-body">${p.cat && catName(p.cat) ? `<span class="pc-cat">${esc(catName(p.cat))}</span>` : ""}
    <h3 class="pc-name"><a href="/shop/${esc(p.id)}" data-stop>${esc(p.name)}</a></h3>
    <p class="pc-meta"><span>${esc(stockLabel(p))}</span>${p.sold ? `<span>Đã bán ${p.sold}</span>` : ""}</p>
    <div class="pc-foot"><b class="pc-price">${p.price ? money(p.price) : "Miễn phí"}</b><button class="btn primary sm" type="button" data-add="${esc(p.id)}" data-stop ${soldOut(p) ? "disabled" : ""}>${ICO.cart}<span>Thêm</span></button></div></div></article>`;

export function bindProductGrid(root) {
  root.addEventListener("click", e => {
    const add = e.target.closest("[data-add]");
    if (add) { e.preventDefault(); e.stopPropagation(); addToCart(add.dataset.add, 1); toast("Đã thêm vào giỏ hàng."); const b = document.getElementById("btnCart"); if (b) { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); } return; }
    if (e.target.closest("[data-stop]")) return;
    const card = e.target.closest(".pcard[data-href]"); if (card) navigate(card.dataset.href);
  });
  root.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.classList && e.target.classList.contains("pcard")) navigate(e.target.dataset.href); });
}

export function mount(ctx) {
  ctx.setPage({ hero: true, title: null });
  let cat = "", q = "", sort = "new";
  ctx.el.innerHTML = `<section class="sh-hero" aria-labelledby="shH">
      <div class="sh-hero-txt"><span class="eyebrow"><i></i>Cửa hàng chính thức</span><h1 id="shH">Mua nhanh. <span>Nhận hàng ngay.</span></h1>
        <p>Thanh toán bằng số dư ví, nạp tiền qua ngân hàng chỉ với một mã QR. Hàng tự động giao ngay sau khi mua.</p>
        <form class="sh-search" id="shSearch" role="search">${ICO.search}<input id="shQ" type="search" placeholder="Tìm sản phẩm…" aria-label="Tìm sản phẩm" autocomplete="off" enterkeyhint="search"></form></div>
      <aside class="sh-wallet" id="shWallet" aria-label="Ví của bạn"></aside></section>
    <nav class="sh-cats" id="shCats" aria-label="Mục lục sản phẩm"></nav>
    <div class="sh-bar"><span class="sh-count" id="shCount" aria-live="polite"></span><label class="sh-sort"><span>Sắp xếp</span><select id="shSort" aria-label="Sắp xếp">${SORTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label></div>
    <div class="sh-grid" id="shGrid" aria-live="polite"></div>
    <section class="sh-lib" aria-labelledby="libH"><div><h2 id="libH">Kho nội dung miễn phí</h2><p>Script, APK, iOS và liên kết đã được kiểm duyệt — xem và sao chép không cần trả phí.</p></div><a class="btn ghost" href="/library">${ICO.layers}Mở kho nội dung</a></section>`;
  const $ = s => ctx.el.querySelector(s), grid = $("#shGrid");

  const drawWallet = () => {
    const real = session.user && !session.isGuest;
    $("#shWallet").innerHTML = real
      ? `<span class="sw-ico">${ICO.wallet}</span><div class="sw-txt"><small>Số dư của bạn</small><b>${shop.wallet ? money(balance()) : "…"}</b></div><div class="sw-acts"><button class="btn primary sm" id="shTop" type="button">${ICO.plus}Nạp tiền</button><a class="btn soft sm" href="/orders">Lịch sử mua</a></div>`
      : `<span class="sw-ico">${ICO.wallet}</span><div class="sw-txt"><small>Ví của bạn</small><b>Đăng nhập để mua hàng</b></div><div class="sw-acts"><a class="btn primary sm" href="/login?next=%2F">Đăng nhập</a><a class="btn soft sm" href="/register">Đăng ký</a></div>`;
    const t = $("#shTop"); if (t) t.addEventListener("click", () => openTopup());
  };
  const drawCats = () => {
    const cs = catList(), used = new Set(visibleProducts().map(p => p.cat));
    const list = cs.filter(c => used.has(c.id));
    if (cat && !list.some(c => c.id === cat)) cat = "";
    $("#shCats").hidden = !list.length;
    $("#shCats").innerHTML = `<button type="button" data-c="" class="${cat ? "" : "on"}" aria-pressed="${!cat}">Tất cả</button>` + list.map(c => `<button type="button" data-c="${esc(c.id)}" class="${cat === c.id ? "on" : ""}" aria-pressed="${cat === c.id}">${esc(c.name)}</button>`).join("");
  };
  const drawGrid = () => {
    if (shop.items === null) { grid.innerHTML = Array.from({ length: 8 }, () => `<div class="pcard sk-card" aria-hidden="true"><i class="sk-img"></i><i></i><i></i></div>`).join(""); $("#shCount").textContent = ""; return; }
    let l = visibleProducts(); if (cat) l = l.filter(p => p.cat === cat);
    const n = vi(q.trim()); if (n) l = l.filter(p => vi(p.name + " " + p.desc + " " + catName(p.cat)).includes(n));
    l = l.slice().sort(sort === "asc" ? (a, b) => a.price - b.price : sort === "desc" ? (a, b) => b.price - a.price : sort === "hot" ? (a, b) => b.sold - a.sold : (a, b) => (b.sort - a.sort) || (b.createdAt - a.createdAt));
    $("#shCount").textContent = l.length ? l.length + " sản phẩm" : "";
    grid.innerHTML = l.length ? l.map(productCardHTML).join("") : `<div class="statebox sh-empty">${ICO.bag}<p>${visibleProducts().length ? "Không tìm thấy sản phẩm phù hợp." : "Cửa hàng chưa có sản phẩm nào. Hãy quay lại sau nhé!"}</p>${(q || cat) ? '<button class="btn ghost" id="shReset" type="button">Xóa bộ lọc</button>' : ""}</div>`;
    const r = $("#shReset"); if (r) r.addEventListener("click", () => { q = ""; cat = ""; $("#shQ").value = ""; drawCats(); drawGrid(); });
  };
  bindProductGrid(grid);
  $("#shCats").addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (!b) return; cat = b.dataset.c; drawCats(); drawGrid(); });
  $("#shSort").addEventListener("change", e => { sort = e.target.value; drawGrid(); });
  $("#shQ").addEventListener("input", e => { q = e.target.value; drawGrid(); });
  $("#shSearch").addEventListener("submit", e => e.preventDefault());
  drawWallet(); drawCats(); drawGrid();
  const off = subscribeShop(t => { if (t === "items" || t === "cats") { drawCats(); drawGrid(); } else if (t === "wallet") drawWallet(); });
  const offAuth = () => {};
  return () => { off(); offAuth(); };
}
