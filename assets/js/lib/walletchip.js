/* Nút Ví (số dư) + nút Giỏ hàng trên thanh trên cùng. Ví chỉ hiện với tài khoản thật đã đăng nhập. */
import { session, onAuth } from "./auth.js";
import { subscribeShop, startShop, balance, cartCount, moneyShort, money, shop } from "./shop.js";
import { openCart } from "./cart.js";

export function initShopHeader() {
  startShop();
  const tc = document.getElementById("tabCart"), tcb = document.getElementById("tabCartBadge"), tw = document.getElementById("tabWalletL"), w = document.getElementById("btnWallet"), amt = document.getElementById("walletAmt"), c = document.getElementById("btnCart"), cb = document.getElementById("cartBadge");
  const paint = () => {
    const real = !!(session.user && !session.isGuest);
    if (w) { w.hidden = !real; if (real && amt) { const b = balance(); amt.textContent = shop.wallet ? moneyShort(b) : "…"; w.title = "Số dư ví: " + money(b); w.setAttribute("aria-label", "Ví của tôi, số dư " + money(b)); } }
    if (tw) tw.textContent = real && shop.wallet ? moneyShort(balance()) + " ₫" : "Ví";
    if (tcb) { const n = cartCount(); tcb.hidden = !n; tcb.textContent = n > 99 ? "99+" : String(n); }
    if (cb) { const n = cartCount(); cb.hidden = !n; cb.textContent = n > 99 ? "99+" : String(n); if (c) c.classList.toggle("has", n > 0); }
  };
  if (c) c.addEventListener("click", () => openCart());
  if (tc) tc.addEventListener("click", () => openCart());
  subscribeShop(paint); onAuth(paint); paint();
}
