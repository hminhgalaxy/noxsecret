/* Ví của tôi: số dư, nạp tiền, mã chuyển khoản riêng, lịch sử giao dịch. */
import { esc, fmtTime, toast, copyText, copyFx } from "../../lib/util.js";
import { ICO } from "../../lib/icons.js";
import { shop, subscribeShop, balance, loadWalletInfo, money, signedMoney, canUseWallet } from "../../lib/shop.js";
import { openTopup } from "../../lib/topup.js";

const TYPE = { topup: ["Nạp tiền", "plus"], purchase: ["Mua hàng", "bag"], refund: ["Hoàn tiền", "back"], adjust: ["Điều chỉnh", "pencil"] };
export function mount(ctx) {
  ctx.setPage({ title: "Ví của tôi", sub: "Số dư, nạp tiền qua ngân hàng và lịch sử giao dịch.", noindex: true, crumbs: [{ label: "Cửa hàng", href: "/" }] });
  ctx.el.innerHTML = `<section class="wl-card" aria-label="Số dư"><div class="wl-bal"><small>Số dư khả dụng</small><b id="wlB">…</b></div>
      <div class="wl-acts"><button class="btn primary" id="wlTop" type="button">${ICO.plus}Nạp tiền</button><a class="btn ghost" href="/orders">${ICO.receipt}Lịch sử mua hàng</a><a class="btn soft" href="/">${ICO.bag}Mua sắm</a></div>
      <div class="wl-code" id="wlC"></div></section>
    <section class="wl-hist" aria-labelledby="wlH"><h2 id="wlH">Lịch sử giao dịch</h2><div id="wlL" class="wl-list"><div class="statebox sm"><p>Đang tải…</p></div></div></section>`;
  const $ = s => ctx.el.querySelector(s);
  $("#wlTop").addEventListener("click", () => openTopup());
  const drawBal = () => { $("#wlB").textContent = shop.wallet ? money(balance()) : "…"; };
  const drawCode = (info, err) => {
    $("#wlC").innerHTML = info ? `<div><small>Nội dung chuyển khoản của bạn</small><code translate="no">${esc(info.code)}</code></div><button class="btn soft sm" id="wlCp" type="button">${ICO.copy}<span>Sao chép</span></button><p>Mỗi tài khoản có một mã riêng. Khi chuyển khoản, nhập <b>đúng mã này</b> vào phần nội dung để tiền được cộng tự động (thường 30–60 giây). Khi quét QR trong mục “Nạp tiền”, mã được điền sẵn.</p>`
      : `<p class="wl-err">${esc(err || "Đang tải mã nạp…")}</p>`;
    const b = $("#wlCp"); if (b) b.addEventListener("click", () => copyText(info.code).then(() => { copyFx(b); toast("Đã sao chép."); }).catch(() => toast("Không sao chép được.", "err")));
  };
  const drawList = () => {
    const L = shop.txs; if (L === null) return;
    $("#wlL").innerHTML = L.length ? L.map(t => { const [lab, ic] = TYPE[t.type] || ["Giao dịch", "tag"];
      return `<div class="tx ${t.amount >= 0 ? "in" : "out"}"><span class="tx-ico">${ICO[ic] || ICO.tag}</span><div class="tx-main"><b>${lab}</b><small translate="no">${esc(t.note || "")}</small></div><div class="tx-amt"><b>${signedMoney(t.amount)}</b><small>${esc(fmtTime(t.ts))}</small></div></div>`; }).join("")
      : `<div class="statebox sm">${ICO.wallet}<p>Chưa có giao dịch nào. Hãy nạp tiền để bắt đầu mua sắm.</p></div>`;
  };
  drawBal(); drawList(); drawCode(null);
  if (!canUseWallet()) drawCode(null, "Hãy xác minh email để dùng ví.");
  else loadWalletInfo().then(i => drawCode(i), e => drawCode(null, e.message));
  return subscribeShop(t => { if (t === "wallet") drawBal(); else if (t === "txs") drawList(); });
}
