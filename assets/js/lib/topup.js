/* Nạp tiền thủ công: bấm "Nạp tiền" → nhập số tiền (tối thiểu 2.000 ₫) → hệ thống tạo hóa đơn rồi đưa bạn tới trang /topup.
   Mỗi người chỉ có một hóa đơn nạp đang mở; nếu đang có thì đưa thẳng tới hóa đơn đó. */
import { esc, toast } from "./util.js";
import { ICO } from "./icons.js";
import { openPopup } from "./popup.js";
import { navigate } from "./router.js";
import { shop, canUseWallet, openInvoice, createInvoice, loadWalletInfo, money, MIN_TOPUP, MAX_TOPUP } from "./shop.js";

const QUICK = [2000, 10000, 20000, 50000, 100000, 200000];
const NF = new Intl.NumberFormat("vi-VN");
export const topupUrl = id => "/topup" + (id ? "?i=" + encodeURIComponent(id) : "");

export async function openTopup(o = {}) {
  if (!canUseWallet()) { toast("Hãy xác minh email để dùng ví.", "warn"); return; }
  let cur = openInvoice();
  if (!cur && shop.invs === null) { try { const i = await loadWalletInfo(true); if (i && i.open) { navigate(topupUrl(i.open)); return; } } catch (_) {} }
  if (cur) { toast("Bạn đang có một hóa đơn nạp tiền chưa xong. Mở lại hóa đơn đó nhé.", "warn"); navigate(topupUrl(cur.id)); return; }
  const h = openPopup({ id: "topup", variant: "sheet", title: "Nạp tiền vào ví", icon: "wallet" });
  let amount = Math.min(MAX_TOPUP, Math.max(MIN_TOPUP, Math.floor(Number(o.amount) || 0))) || 0;
  h.setBody(`<form class="tpf" id="tpF" novalidate>
    <p class="tpf-lead">Nhập số tiền bạn muốn nạp. Số tiền nạp <b>tối thiểu ${money(MIN_TOPUP)}</b>, làm tròn đến nghìn đồng.</p>
    <div class="field"><label for="tpA">Số tiền cần nạp</label><span class="sp-in tpf-in"><input id="tpA" inputmode="numeric" autocomplete="off" placeholder="${NF.format(MIN_TOPUP)}" value="${amount ? NF.format(amount) : ""}" maxlength="12"><i>₫</i></span></div>
    <div class="tpf-q" role="group" aria-label="Chọn nhanh">${QUICK.map(v => `<button type="button" data-v="${v}">${NF.format(v)}</button>`).join("")}</div>
    <p class="form-error" id="tpE" role="alert"></p>
    <div class="form-acts"><button class="btn ghost" type="button" data-no>Để sau</button><button class="btn primary" type="submit" id="tpGo">Tiếp tục</button></div>
  </form>`);
  const $ = s => h.body.querySelector(s), inp = $("#tpA"), err = $("#tpE");
  const val = () => Number(String(inp.value).replace(/\D/g, "")) || 0;
  const fmt = () => { const v = val(); inp.value = v ? NF.format(v) : ""; err.textContent = ""; };
  inp.addEventListener("input", fmt);
  $(".tpf-q").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (!b) return; inp.value = NF.format(Number(b.dataset.v)); err.textContent = ""; inp.focus(); });
  $("[data-no]").addEventListener("click", () => h.close());
  $("#tpF").addEventListener("submit", async e => {
    e.preventDefault(); const v = val();
    if (v < MIN_TOPUP) { err.textContent = "Số tiền nạp tối thiểu là " + money(MIN_TOPUP) + "."; inp.focus(); return; }
    if (v > MAX_TOPUP) { err.textContent = "Mỗi lần nạp tối đa " + money(MAX_TOPUP) + "."; inp.focus(); return; }
    if (v % 1000) { err.textContent = "Số tiền cần làm tròn đến nghìn đồng (ví dụ 2.000, 15.000)."; inp.focus(); return; }
    const go = $("#tpGo"); go.disabled = true; go.textContent = "Đang tạo hóa đơn…";
    try { const r = await createInvoice(v); h.close(true); navigate(topupUrl(r.id)); }
    catch (x) { go.disabled = false; go.textContent = "Tiếp tục"; if (x.res && x.res.code === "open_invoice" && x.res.id) { h.close(true); navigate(topupUrl(x.res.id)); } else err.textContent = x.message; }
  });
  setTimeout(() => inp.focus({ preventScroll: true }), 60);
}
