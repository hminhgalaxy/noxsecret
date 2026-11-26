/* Dòng hoạt động của tài khoản: đơn hàng, hóa đơn nạp tiền, hoàn tiền / điều chỉnh. Dùng cho khung Hộp thư (popup) và trang Hộp thư. */
import { shop, money, signedMoney, INV_ST, invState } from "./shop.js";
import { esc, fmtTime } from "./util.js";
import { ICO } from "./icons.js";

const ORDER_ST = { paid: ["Thành công", "ok"], pending: ["Đang xử lý", "warn"], refunded: ["Đã hoàn tiền", "bad"] };
export function buildActivity(at = Date.now()) {
  const out = [];
  (shop.orders || []).forEach(o => { const [label, tone] = ORDER_ST[o.status] || ["", ""]; out.push({ k: "order", id: o.id, ts: o.paidAt || o.ts || 0, ico: "bag", title: (o.items || []).map(i => i.name + (i.qty > 1 ? " ×" + i.qty : "")).join(", ") || "Đơn hàng", sub: "#" + String(o.id).slice(-8).toUpperCase(), amount: -(o.total || 0), label, tone, href: "/orders?o=" + encodeURIComponent(o.id) }); });
  (shop.invs || []).forEach(t => { const st = invState(t), [label, tone] = INV_ST[st]; out.push({ k: "topup", id: t.id, ts: t.doneAt || t.ts || 0, ico: "receipt", title: "Nạp tiền vào ví", sub: "Hóa đơn #" + String(t.id).slice(-6).toUpperCase(), amount: t.amount, label, tone, dim: st !== "done", href: "/topup?i=" + encodeURIComponent(t.id) }); });
  (shop.txs || []).filter(x => x.type === "refund" || x.type === "adjust" || x.type === "send").forEach(x => out.push({ k: "other", id: x.id, ts: x.ts || 0, ico: x.type === "refund" ? "back" : "pencil", title: x.type === "refund" ? "Hoàn tiền đơn hàng" : x.type === "send" ? "Chuyển tiền cho khách" : "Điều chỉnh số dư", sub: x.note || "", amount: x.amount, label: "Thành công", tone: "ok", href: "/wallet" }));
  return out.sort((a, b) => b.ts - a.ts);
}
export const FILTERS = [["all", "Tất cả"], ["order", "Đơn hàng"], ["topup", "Nạp tiền"], ["other", "Khác"]];
export function activityHTML(list, empty = "Chưa có hoạt động nào.") {
  if (!list.length) return `<div class="statebox sm">${ICO.receipt}<p>${esc(empty)}</p></div>`;
  return `<ul class="act-list">${list.map(a => `<li><a class="act-row${a.dim ? " dim" : ""}" href="${esc(a.href)}" data-link><span class="act-ico t-${esc(a.k)}">${ICO[a.ico] || ICO.tag}</span>
    <span class="act-main"><b translate="no">${esc(a.title)}</b><small><span translate="no">${esc(a.sub)}</span> · ${esc(fmtTime(a.ts))}</small></span>
    <span class="act-r"><b class="${a.amount >= 0 ? "in" : "out"}${a.dim ? " dim" : ""}">${signedMoney(a.amount)}</b><span class="od-st ${esc(a.tone)}">${esc(a.label)}</span></span></a></li>`).join("")}</ul>`;
}
