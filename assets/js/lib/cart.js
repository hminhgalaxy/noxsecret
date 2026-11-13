/* Popup "Giỏ hàng": chỉnh số lượng, thanh toán bằng số dư ví, nhận hàng ngay trong popup. */
import { openPopup, closePopup } from "./popup.js";
import { esc, toast, copyText, copyFx } from "./util.js";
import { ICO } from "./icons.js";
import { session } from "./auth.js";
import { shop, subscribeShop, cartLines, cartTotal, cartCount, setQty, checkout, balance, canUseWallet, money, soldOut } from "./shop.js";
import { navigate } from "./router.js";
import { openTopup } from "./topup.js";

const thumb = p => (p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" decoding="async">` : `<span class="ct-ph">${ICO.bag}</span>`);

export function deliveryHTML(d) {
  return (d || []).map(x => {
    const body = x.manual ? `<p class="dv-wait">${ICO.info}<span>Món này được giao tay: dev sẽ gửi hàng qua Hộp thư của bạn.</span></p>`
      : x.lines ? `<ul class="dv-lines">${x.lines.map(l => `<li><code translate="no">${esc(l)}</code><button class="btn soft sm" type="button" data-copy="${esc(l)}">${ICO.copy}<span>Sao chép</span></button></li>`).join("")}</ul>`
      : x.text ? `<div class="dv-text"><pre translate="no">${esc(x.text)}</pre><button class="btn soft sm" type="button" data-copy="${esc(x.text)}">${ICO.copy}<span>Sao chép</span></button></div>`
      : `<p class="dv-wait">${ICO.check}<span>Đã giao.</span></p>`;
    return `<section class="dv"><h4>${esc(x.name)} <small>× ${x.qty}</small></h4>${body}</section>`;
  }).join("");
}
export function wireCopy(root) { root.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", () => copyText(b.dataset.copy).then(() => { copyFx(b); toast("Đã sao chép."); }).catch(() => toast("Không sao chép được.", "err")))); }

export function openCart() {
  let busy = false, off = () => {};
  const h = openPopup({ id: "cart", variant: "panel", anchor: document.getElementById("btnCart"), title: "Giỏ hàng", icon: "cart", onClose: () => off() });
  const render = (err = "") => {
    if (busy) return;
    const L = cartLines(), total = cartTotal(), bal = balance(), real = session.user && !session.isGuest, enough = bal >= total;
    if (!L.length) { h.setBody(`<div class="statebox">${ICO.cart}<p>Giỏ hàng đang trống.</p><a class="btn primary" href="/" data-close>Xem cửa hàng</a></div>`); h.body.querySelector("[data-close]").addEventListener("click", () => h.close(true)); return; }
    h.setBody(`<ul class="ct-list">${L.map(l => `<li class="ct-row" data-id="${esc(l.id)}">
        <span class="ct-th">${thumb(l.p)}</span>
        <span class="ct-main"><a class="ct-name" href="/shop/${esc(l.id)}" data-nav>${esc(l.p.name)}</a><span class="ct-price">${money(l.p.price)}${soldOut(l.p) ? ' <em class="ct-out">Hết hàng</em>' : ""}</span></span>
        <span class="qty" role="group" aria-label="Số lượng"><button type="button" data-q="-1" aria-label="Giảm">${ICO.minus}</button><b>${l.qty}</b><button type="button" data-q="1" aria-label="Tăng">${ICO.plus}</button></span>
        <button class="ct-del" type="button" data-del aria-label="Xóa khỏi giỏ">${ICO.trash}</button></li>`).join("")}</ul>
      <div class="ct-sum"><div><span>Tạm tính</span><b>${money(total)}</b></div>${real ? `<div><span>Số dư ví</span><b class="${enough ? "" : "low"}">${money(bal)}</b></div>` : ""}</div>
      <p class="form-error ct-err" role="alert">${esc(err)}</p>
      <div class="form-acts ct-acts">${!real ? `<a class="btn primary" href="/login?next=${encodeURIComponent(location.pathname)}" data-close>Đăng nhập để thanh toán</a>`
        : !canUseWallet() ? `<span class="ct-note">Hãy xác minh email để mua hàng.</span>`
        : enough ? `<button class="btn primary" id="ctPay" type="button">${ICO.wallet}Thanh toán ${money(total)}</button>`
        : `<button class="btn primary" id="ctTop" type="button">${ICO.plus}Nạp thêm ${money(total - bal)}</button>`}</div>`);
    const box = h.body;
    box.querySelectorAll(".ct-row").forEach(row => {
      const id = row.dataset.id;
      row.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => { const cur = cartLines().find(x => x.id === id); setQty(id, (cur ? cur.qty : 0) + (+b.dataset.q)); }));
      row.querySelector("[data-del]").addEventListener("click", () => setQty(id, 0));
    });
    box.querySelectorAll("[data-nav],[data-close]").forEach(a => a.addEventListener("click", () => h.close(true)));
    const pay = box.querySelector("#ctPay");
    if (pay) pay.addEventListener("click", async () => {
      busy = true; pay.disabled = true; pay.classList.add("busy");
      try { const r = await checkout(cartLines()); busy = false; success(r); }
      catch (e) { busy = false; render(e.message); }
    });
    const top = box.querySelector("#ctTop"); if (top) top.addEventListener("click", () => { h.close(true); openTopup({ amount: Math.ceil((total - bal) / 1000) * 1000 }); });
  };
  const success = r => {
    h.setBody(`<div class="ct-ok"><span class="tp-okico">${ICO.check}</span><h3>Đặt hàng thành công</h3><p>Đã trừ <b>${money(r.total)}</b>. Số dư còn <b>${money(r.balance)}</b>.</p></div>${deliveryHTML(r.delivery)}
      <div class="form-acts"><a class="btn ghost" href="/orders" data-close>Lịch sử mua hàng</a><button class="btn primary" id="ctOk" type="button">Xong</button></div>`);
    wireCopy(h.body); h.body.querySelector("#ctOk").addEventListener("click", () => h.close());
    h.body.querySelectorAll("[data-close]").forEach(a => a.addEventListener("click", () => h.close(true)));
  };
  off = subscribeShop(t => { if (t === "cart" || t === "items" || t === "wallet") render(); });
  render();
  return h;
}
export const closeCart = () => closePopup("cart");
