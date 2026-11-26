/* Ví của tôi: số dư, nạp tiền (hóa đơn thủ công), lịch sử giao dịch. */
import { esc, fmtTime } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { shop, subscribeShop, balance, loadWalletInfo, money, signedMoney, canUseWallet, startShop, INV_ST, invState, invOpen } from "../../lib/shop.js";
import { openTopup, topupUrl } from "../../lib/topup.js";

const TYPE = { topup: ["Nạp tiền", "plus"], purchase: ["Mua hàng", "bag"], refund: ["Hoàn tiền", "back"], adjust: ["Điều chỉnh", "pencil"], send: ["Chuyển tiền", "arrow"] };
export function mount(ctx) {
  startShop();
  ctx.setPage({ title: "Ví của tôi", sub: "Số dư, nạp tiền và lịch sử giao dịch.", noindex: true, crumbs: [{ label: "Cửa hàng", href: "/shop" }] });
  ctx.el.innerHTML = `<section class="wl-card" aria-label="Số dư"><div class="wl-bal"><small>Số dư khả dụng</small><b id="wlB">…</b></div>
      <div class="wl-acts"><button class="btn primary" id="wlTop" type="button">${ICO.plus}Nạp tiền</button><a class="btn ghost" href="/orders">${ICO.receipt}Lịch sử mua hàng</a><a class="btn soft" href="/shop">${ICO.bag}Cửa hàng</a></div>
      <p class="wl-min" id="wlM">Nạp tối thiểu ${money(2000)}. Hóa đơn được xử lý thủ công, thường trong ít phút đến ít tiếng.</p></section>
    <section class="wl-hist" aria-labelledby="wlI"><h2 id="wlI">Hóa đơn nạp tiền</h2><div id="wlInv" class="wl-list"><div class="ld-row"><span class="ld-spin" aria-hidden="true"></span><span>Đang tải…</span></div></div></section>
    <section class="wl-hist" aria-labelledby="wlH"><h2 id="wlH">Lịch sử giao dịch</h2><div id="wlL" class="wl-list"><div class="ld-row"><span class="ld-spin" aria-hidden="true"></span><span>Đang tải…</span></div></div></section>`;
  const $ = s => ctx.el.querySelector(s);
  ctx.el.addEventListener("click", e => { const x = e.target.closest("[data-order]"); if (x) ctx.navigate("/orders?o=" + encodeURIComponent(x.dataset.order)); });
  $("#wlTop").addEventListener("click", () => openTopup());
  const drawBal = () => { $("#wlB").textContent = shop.wallet ? money(balance()) : "…"; };
  const drawList = () => {
    const L = shop.txs; if (L === null) return;
    $("#wlL").innerHTML = L.length ? L.map(t => { const [lab, ic] = TYPE[t.type] || ["Giao dịch", "tag"];
      return `<div class="tx ${t.amount >= 0 ? "in" : "out"}"${t.type === "purchase" && t.ref ? ` data-order="${esc(t.ref)}" tabindex="0" role="link"` : ""}><span class="tx-ico">${ICO[ic] || ICO.tag}</span><div class="tx-main"><b>${lab}</b><small translate="no">${esc(t.note || "")}</small></div><div class="tx-amt"><b>${signedMoney(t.amount)}</b><small>${esc(fmtTime(t.ts))}</small></div></div>`; }).join("")
      : `<div class="statebox sm">${ICO.wallet}<p>Chưa có giao dịch nào. Hãy nạp tiền để bắt đầu mua sắm.</p></div>`;
  };
  const drawInv = () => {
    const L = shop.invs; if (L === null) return;
    $("#wlInv").innerHTML = L.length ? L.slice(0, 12).map(t => { const st = invState(t), [lab, tone] = INV_ST[st];
      return `<a class="inv" href="${topupUrl(t.id)}"><span class="tx-ico">${ICO.receipt}</span><span class="tx-main"><b>Hóa đơn #${esc(String(t.id).slice(-6).toUpperCase())}</b><small>${esc(fmtTime(t.ts))}${st === "creating" ? " · đang được tạo, vui lòng quay lại sau ít tiếng" : st === "ready" ? " · mở để lấy mã QR" : ""}</small></span><span class="tx-amt"><b>${money(t.amount)}</b><span class="od-st ${tone}">${lab}</span></span></a>`; }).join("")
      : `<div class="statebox sm">${ICO.receipt}<p>Chưa có hóa đơn nạp tiền nào. Bấm “Nạp tiền” để tạo hóa đơn đầu tiên.</p></div>`;
    const o = L.find(invOpen); $("#wlTop").innerHTML = o ? `${ICO.receipt}Xem hóa đơn đang mở` : `${ICO.plus}Nạp tiền`;
  };
  drawBal(); drawInv(); drawList();
  if (!canUseWallet()) $("#wlM").textContent = "Hãy xác minh email để dùng ví.";
  else loadWalletInfo().catch(e => { const m = $("#wlM"); if (m && e && e.message) m.textContent = e.message; });
  const off = subscribeShop(t => { if (t === "wallet") drawBal(); else if (t === "txs") drawList(); else if (t === "invs") drawInv(); });
  return () => off();
}
